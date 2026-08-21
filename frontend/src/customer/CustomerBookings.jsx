import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  CreditCard,
  MapPin,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import resolveImg from "../utils/resolveImg";
import {
  extractCustomerSession,
  formatBookingDate,
  formatCurrency,
  getBookingPolicy,
  normalizeRoomType,
  resolveCustomerId,
  serializeBookingStatus,
} from "./customerHelpers";

const BOOKING_TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const getBookingBucket = (booking) => {
  const status = String(booking.status || "").toLowerCase();
  if (status === "cancelled") return "cancelled";
  if (status === "checked_in") return "active";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn = booking.checkInDate ? new Date(`${booking.checkInDate}T00:00:00`) : null;
  const checkOut = booking.checkOutDate ? new Date(`${booking.checkOutDate}T00:00:00`) : null;

  if (checkIn && checkOut && checkIn <= today && checkOut >= today) {
    return "active";
  }

  if (checkOut && checkOut < today) {
    return "past";
  }

  return "upcoming";
};

const hasReview = (booking, reviews) => {
  return reviews.some(review => 
    review.bookingContext && 
    review.bookingContext.includes(`Booking #${booking.bookingId}`)
  );
};

export default function CustomerBookings() {
  const PAGE_SIZE = 5;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [roomLookup, setRoomLookup] = useState({});
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [bookingMessage, setBookingMessage] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [reviews, setReviews] = useState([]);

  const fetchBookings = async (silent = false) => {
    try {
      setLoadError("");
      if (silent) setIsRefreshing(true);
      else setLoading(true);

      const savedUser = extractCustomerSession();
      if (!savedUser) {
        throw new Error("No saved customer session found.");
      }

      const cleanId = await resolveCustomerId(savedUser);
      const [dashboardRes, roomsRes, reviewsRes] = await Promise.all([
        fetch(`/api/customer/dashboard/${cleanId}`),
        fetch("/api/rooms"),
        fetch("/api/reviews"),
      ]);

      const dashboardPayload = await dashboardRes.json().catch(() => ({}));
      const roomsPayload = await roomsRes.json().catch(() => ({}));
      const reviewsPayload = await reviewsRes.json().catch(() => ({}));

      if (!dashboardRes.ok) {
        throw new Error(dashboardPayload?.error || "Failed to load bookings.");
      }

      const normalizedUser = dashboardPayload?.user || {};
      const normalizedBookings = (normalizedUser.bookings || []).map((booking) => ({
        ...booking,
        status: serializeBookingStatus(booking.status),
        roomType: normalizeRoomType(booking.roomType),
        totalPrice: Number(booking.totalPrice || 0),
        ...getBookingPolicy(booking),
      }));

      const rooms = Array.isArray(roomsPayload?.rooms) ? roomsPayload.rooms : [];
      const lookup = rooms.reduce((acc, room) => {
        acc[String(room.id)] = room;
        return acc;
      }, {});

      setUser(normalizedUser);
      setBookings(normalizedBookings);
      setRoomLookup(lookup);
      setReviews(reviewsPayload.reviews || []);
    } catch (error) {
      setLoadError(error.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const bookingsByTab = useMemo(() => {
    const buckets = {
      upcoming: [],
      active: [],
      past: [],
      cancelled: [],
    };

    bookings.forEach((booking) => {
      buckets[getBookingBucket(booking)].push(booking);
    });

    return buckets;
  }, [bookings]);

  const visibleBookings = bookingsByTab[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(visibleBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleBookings.slice(start, start + PAGE_SIZE);
  }, [visibleBookings, currentPage]);

  const tabCounts = useMemo(
    () =>
      BOOKING_TABS.reduce((acc, tab) => {
        acc[tab.id] = bookingsByTab[tab.id]?.length || 0;
        return acc;
      }, {}),
    [bookingsByTab]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, bookings.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePayNow = async (booking) => {
    setPayingBookingId(booking.bookingId);
    try {
      const response = await fetch("/api/payment/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: booking.bookingId,
          paymentMethod: booking.paymentMethod,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create payment link.");
      }
      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setBookingMessage((prev) => ({ ...prev, [booking.bookingId]: `Payment error: ${error.message}` }));
    } finally {
      setPayingBookingId(null);
    }
  };

  const handleCancel = async (booking) => {
    if (!booking.canCancel || !user?.id) return;

    try {
      setBookingMessage((prev) => ({ ...prev, [booking.bookingId]: "Cancelling booking..." }));
      const response = await fetch(`/api/bookings/${booking.bookingId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: user.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to cancel booking.");
      }
      setBookingMessage((prev) => ({ ...prev, [booking.bookingId]: payload.message || "Booking cancelled." }));
      fetchBookings(true);
    } catch (error) {
      setBookingMessage((prev) => ({ ...prev, [booking.bookingId]: error.message }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-950/5 px-6 py-20 font-sans">
        <div className="mx-auto max-w-6xl rounded-2xl border border-emerald-900/10 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="mt-4 text-xs font-medium tracking-wide text-zinc-500">Retrieving your reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950/5 text-zinc-800 font-sans">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">My Stays</h1>
          <p className="mt-2 text-sm text-zinc-500">Manage your active reservations, past visits, and billing details</p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-emerald-900/10 bg-white/80 p-1.5 backdrop-blur">
            {BOOKING_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-5 py-2 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-zinc-600 hover:text-emerald-800"
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-[11px] ${activeTab === tab.id ? "text-emerald-200" : "text-zinc-400"}`}>
                  {tabCounts[tab.id] || 0}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchBookings(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 transition-colors hover:text-emerald-950"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            Refresh data
          </button>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          {paginatedBookings.length ? (
            paginatedBookings.map((booking) => {
              const room = roomLookup[String(booking.roomId)] || {};
              const image = resolveImg(room.images?.[0] || room.image || "/images/room1.jpg");
              const nights = Math.max(
                1,
                Math.ceil(
                  (new Date(`${booking.checkOutDate || booking.checkInDate}T00:00:00`) -
                    new Date(`${booking.checkInDate}T00:00:00`)) /
                    86400000
                ) || 1
              );
              const isPendingOnlinePayment =
                booking.status === "PENDING" &&
                ["card", "gcash", "maya", "online", "qrph"].includes(String(booking.paymentMethod || "").toLowerCase());

              return (
                <article
                  key={booking.bookingId}
                  className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm transition-all hover:border-emerald-900/20"
                >
                  <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="border-b border-zinc-100 p-6 lg:border-b-0 lg:border-r">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <img
                          src={image}
                          alt={booking.roomType}
                          onError={(e) => {
                            e.currentTarget.src = "/images/room1.jpg";
                          }}
                          className="h-32 w-full rounded-xl object-cover sm:w-36"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">
                            {booking.hotelName || "Innova HMS"}
                          </p>
                          <h2 className="mt-1 text-lg font-bold text-zinc-900">
                            {booking.roomType}
                          </h2>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                            <MapPin size={14} className="text-emerald-600" />
                            <span>{room.location_description || "Hotel destination available on confirmation"}</span>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">Check In</p>
                              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
                                <CalendarDays size={14} className="text-emerald-600" />
                                {formatBookingDate(booking.checkInDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">Check Out</p>
                              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
                                <CalendarDays size={14} className="text-emerald-600" />
                                {formatBookingDate(booking.checkOutDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">Reference</p>
                              <p className="mt-1 text-xs font-medium text-zinc-700">{booking.bookingNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">Duration</p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                                <Clock3 size={14} className="text-emerald-600" />
                                {nights} Night{nights > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between p-6 bg-zinc-50/50">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-zinc-500">
                            <Wallet size={14} />
                            Payment Method
                          </span>
                          <span className="font-semibold text-zinc-800 capitalize">{booking.paymentMethod || "Cash"}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-zinc-500">
                            <CreditCard size={14} />
                            Booking Status
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${
                              booking.status === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : booking.status === "CANCELLED"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">Rate per night</span>
                          <span className="font-medium text-zinc-700">{formatCurrency(booking.totalPrice / nights)}</span>
                        </div>
                        <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-sm">
                          <span className="font-medium text-zinc-600">Total Charged</span>
                          <span className="font-bold text-emerald-900">{formatCurrency(booking.totalPrice)}</span>
                        </div>
                      </div>

                      <div className="mt-6 space-y-2">
                        {isPendingOnlinePayment ? (
                          <button
                            type="button"
                            onClick={() => handlePayNow(booking)}
                            disabled={payingBookingId === booking.bookingId}
                            className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                          >
                            {payingBookingId === booking.bookingId ? "Processing..." : "Complete Payment"}
                          </button>
                        ) : null}

                        {booking.canCancel && booking.status !== "CANCELLED" ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(booking)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            <XCircle size={14} />
                            Cancel Reservation
                          </button>
                        ) : null}

                        {activeTab === "past" ? (
                          hasReview(booking, reviews) ? (
                            <div className="w-full rounded-xl bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 text-center border border-emerald-100">
                              ✓ Feedback Submitted
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(
                                `/customer/reviews?bookingId=${booking.bookingId}&roomName=${encodeURIComponent(
                                  booking.roomType || ""
                                )}&hotelName=${encodeURIComponent(booking.hotelName || "")}&roomId=${booking.roomId}&hotelId=${booking.hotelId || ""}`
                              )}
                              className="w-full rounded-xl border border-emerald-900/20 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50"
                            >
                              Write a Review
                            </button>
                          )
                        ) : null}

                        <button
                          type="button"
                          onClick={() => navigate(`/booking?roomId=${booking.roomId}`)}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          Book Again
                        </button>
                      </div>

                      {bookingMessage[booking.bookingId] ? (
                        <p className="mt-3 text-[11px] font-medium text-zinc-500">{bookingMessage[booking.bookingId]}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
              <h3 className="text-base font-semibold text-zinc-800">No reservations found</h3>
              <p className="mt-1 text-xs text-zinc-500">There are currently no stays in this category.</p>
              <button
                type="button"
                onClick={() => navigate("/vision-suites")}
                className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
              >
                Browse Available Rooms
              </button>
            </div>
          )}
        </div>

        {visibleBookings.length ? (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm md:flex-row">
            <p className="text-xs text-zinc-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all disabled:opacity-40 hover:bg-zinc-50"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                    currentPage === page
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all disabled:opacity-40 hover:bg-zinc-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}