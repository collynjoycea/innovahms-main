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
      <div className="min-h-screen bg-[#faf6ee] px-6 py-20">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#ece2d1] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#bf9b30] border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#1a160d]">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">My Bookings</h1>
          <p className="mt-4 text-lg text-slate-500">View your stay details and billing information</p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#e8decc] bg-[#f1eee7] p-1.5">
            {BOOKING_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                  activeTab === tab.id
                    ? "bg-[#c8a33a] text-white shadow-[0_8px_20px_rgba(199,159,60,0.18)]"
                    : "text-slate-500 hover:text-[#9e7b23]"
                }`}
              >
                {tab.label}
                <span className="ml-2 opacity-70">{tabCounts[tab.id] || 0}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchBookings(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#e3d7bf] bg-white px-4 py-2 text-sm font-semibold text-[#8a6d27] transition-all hover:bg-[#fbf6ec]"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loadError ? (
          <div className="mt-8 rounded-[1.6rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
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
                  className="overflow-hidden rounded-[1.7rem] border border-[#e7dcc8] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.05)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="border-b border-[#efe7d9] p-5 lg:border-b-0 lg:border-r">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <img
                          src={image}
                          alt={booking.roomType}
                          onError={(e) => {
                            e.currentTarget.src = "/images/room1.jpg";
                          }}
                          className="h-28 w-full rounded-[1.3rem] object-cover sm:w-36"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#bf9b30]">
                            {booking.hotelName || "Innova HMS"}
                          </p>
                          <h2 className="mt-1.5 text-xl font-black tracking-tight text-[#1f1d22]">
                            {booking.roomType}
                          </h2>
                          <div className="mt-2 flex items-center gap-2 text-[13px] text-slate-500">
                            <MapPin size={15} className="text-[#bf9b30]" />
                            <span>{room.location_description || "Hotel destination available on confirmation"}</span>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Check In</p>
                              <p className="mt-1.5 flex items-center gap-2 text-base font-bold text-[#1f1d22]">
                                <CalendarDays size={16} className="text-[#bf9b30]" />
                                {formatBookingDate(booking.checkInDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Check Out</p>
                              <p className="mt-1.5 flex items-center gap-2 text-base font-bold text-[#1f1d22]">
                                <CalendarDays size={16} className="text-[#bf9b30]" />
                                {formatBookingDate(booking.checkOutDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Booking No.</p>
                              <p className="mt-1.5 text-sm font-bold text-[#1f1d22]">{booking.bookingNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duration</p>
                              <p className="mt-1.5 flex items-center gap-2 text-sm font-bold text-[#1f1d22]">
                                <Clock3 size={16} className="text-[#bf9b30]" />
                                {nights} Night{nights > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-500">
                            <Wallet size={16} />
                            Payment
                          </span>
                          <span className="font-bold text-[#1f1d22] capitalize">{booking.paymentMethod || "Cash"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-500">
                            <CreditCard size={16} />
                            Status
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
                              booking.status === "PENDING"
                                ? "bg-[#fff2d4] text-[#c28d15]"
                                : booking.status === "CANCELLED"
                                  ? "bg-red-50 text-red-500"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Price/night</span>
                          <span className="font-bold text-[#1f1d22]">{formatCurrency(booking.totalPrice / nights)}</span>
                        </div>
                        <div className="flex items-center justify-between text-base">
                          <span className="text-slate-500">Total Price</span>
                          <span className="font-black text-[#c39b2f]">{formatCurrency(booking.totalPrice)}</span>
                        </div>
                      </div>

                      <div className="mt-6 space-y-2.5">
                        {isPendingOnlinePayment ? (
                          <button
                            type="button"
                            onClick={() => handlePayNow(booking)}
                            disabled={payingBookingId === booking.bookingId}
                            className="flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-[#c8a33a] px-4 py-3 text-sm font-black text-white transition-all hover:bg-[#b78f22] disabled:opacity-60"
                          >
                            {payingBookingId === booking.bookingId ? "Processing..." : "Pay Now"}
                          </button>
                        ) : null}

                        {booking.canCancel && booking.status !== "CANCELLED" ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(booking)}
                            className="flex w-full items-center justify-center gap-2 rounded-[1.1rem] border border-red-200 px-4 py-3 text-sm font-black text-red-500 transition-all hover:bg-red-50"
                          >
                            <XCircle size={16} />
                            Cancel Booking
                          </button>
                        ) : null}

                        {activeTab === "past" ? (
                          hasReview(booking, reviews) ? (
                            <div className="w-full rounded-[1.1rem] border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700 text-center">
                              ✓ Review Submitted
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(
                                `/customer/reviews?bookingId=${booking.bookingId}&roomName=${encodeURIComponent(
                                  booking.roomType || ""
                                )}&hotelName=${encodeURIComponent(booking.hotelName || "")}`
                              )}
                              className="w-full rounded-[1.1rem] border border-[#cdb88a] bg-[#f7f2de] px-4 py-3 text-sm font-black text-[#8a6d27] transition-all hover:bg-[#f2e8cf]"
                            >
                              Leave a Review
                            </button>
                          )
                        ) : null}

                        <button
                          type="button"
                          onClick={() => navigate(`/booking?roomId=${booking.roomId}`)}
                          className="w-full rounded-[1.1rem] border border-[#eadfc7] px-4 py-3 text-sm font-black text-[#8a6d27] transition-all hover:bg-[#fbf5e9]"
                        >
                          Book Similar Stay
                        </button>
                      </div>

                      {bookingMessage[booking.bookingId] ? (
                        <p className="mt-4 text-xs font-semibold text-slate-500">{bookingMessage[booking.bookingId]}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[#d9cdb8] bg-white px-6 py-16 text-center">
              <h3 className="text-2xl font-black text-[#1f1d22]">No bookings found</h3>
              <p className="mt-3 text-slate-500">This tab does not have any reservations yet.</p>
              <button
                type="button"
                onClick={() => navigate("/vision-suites")}
                className="mt-6 rounded-full bg-[#c8a33a] px-6 py-3 text-sm font-black text-white transition-all hover:bg-[#b78f22]"
              >
                Find a Room
              </button>
            </div>
          )}
        </div>

        {visibleBookings.length ? (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] border border-[#eadfc8] bg-white px-5 py-4 shadow-sm md:flex-row">
            <p className="text-sm font-medium text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-full border border-[#dccba3] px-4 py-2 text-sm font-semibold text-[#8f732d] transition-all disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#f6efdf]"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-10 min-w-10 rounded-full px-3 text-sm font-bold transition-all ${
                    currentPage === page
                      ? "bg-[#bf9b30] text-white shadow-md"
                      : "border border-[#e0d3b6] text-[#7b683e] hover:bg-[#faf4e8]"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-full border border-[#dccba3] px-4 py-2 text-sm font-semibold text-[#8f732d] transition-all disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#f6efdf]"
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
