import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Crown,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  extractCustomerSession,
  formatBookingDate,
  formatCurrency,
  normalizeRoomType,
  resolveCustomerId,
  serializeBookingStatus,
} from "./customerHelpers";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const handleSessionReset = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("customerSession");
    navigate("/login", { replace: true });
  };

  const fetchDashboard = async (silent = false) => {
    try {
      setLoadError("");
      if (silent) setIsRefreshing(true);
      else setLoading(true);

      const savedUser = extractCustomerSession();
      if (!savedUser) {
        throw new Error("No saved customer session found.");
      }

      const cleanId = await resolveCustomerId(savedUser);
      const response = await fetch(`/api/customer/dashboard/${cleanId}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Dashboard data is temporarily unavailable.");
      }

      const normalizedUser = payload?.user || {};
      setUser({
        ...normalizedUser,
        bookings: (normalizedUser.bookings || []).map((booking) => ({
          ...booking,
          status: serializeBookingStatus(booking.status),
          roomType: normalizeRoomType(booking.roomType),
          totalPrice: Number(booking.totalPrice || 0),
        })),
      });
    } catch (error) {
      setLoadError(error.message || "Failed to load customer dashboard.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const bookingSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookings = user?.bookings || [];
    const nextStay =
      bookings
        .filter((booking) => {
          const checkIn = booking.checkInDate ? new Date(`${booking.checkInDate}T00:00:00`) : null;
          return checkIn && checkIn >= today && booking.status !== "CANCELLED";
        })
        .sort((a, b) => String(a.checkInDate || "").localeCompare(String(b.checkInDate || "")))[0] || null;

    const upcomingCount = bookings.filter((booking) => {
      const checkIn = booking.checkInDate ? new Date(`${booking.checkInDate}T00:00:00`) : null;
      return checkIn && checkIn >= today && booking.status !== "CANCELLED";
    }).length;

    const activeCount = bookings.filter((booking) => {
      const checkIn = booking.checkInDate ? new Date(`${booking.checkInDate}T00:00:00`) : null;
      const checkOut = booking.checkOutDate ? new Date(`${booking.checkOutDate}T00:00:00`) : null;
      return checkIn && checkOut && checkIn <= today && checkOut >= today && booking.status !== "CANCELLED";
    }).length;

    const totalSpend = bookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);

    return {
      nextStay,
      upcomingCount,
      activeCount,
      totalSpend,
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center">
        <div className="rounded-[2rem] border border-[#eadfc8] bg-white px-10 py-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#bf9b30] border-t-transparent" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#faf6ee] flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck size={56} className="text-[#bf9b30] opacity-50" />
        <h2 className="mt-6 text-2xl font-black text-[#1a160d]">Access Denied</h2>
        <p className="mt-3 text-sm text-slate-500">{loadError || "Invalid customer session."}</p>
        <button
          onClick={handleSessionReset}
          className="mt-6 rounded-full bg-[#bf9b30] px-6 py-3 text-sm font-black text-white transition-all hover:bg-[#aa882a]"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#1a160d]">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-5 border-b border-[#ece2d1] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#bf9b30]">
              <Sparkles size={15} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Customer Dashboard</span>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Welcome back, <span className="text-[#bf9b30]">{user.firstName || "Guest"}</span>
            </h1>
            <p className="mt-3 text-slate-500">A cleaner overview of your bookings, rewards, and next stay.</p>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#e3d7bf] bg-white px-4 py-2 text-sm font-semibold text-[#8a6d27] transition-all hover:bg-[#fbf6ec]"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loadError ? (
          <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {loadError}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-[2rem] border border-[#eadfc8] bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Upcoming stays</p>
            <p className="mt-3 text-4xl font-black text-[#1f1d22]">{bookingSummary.upcomingCount}</p>
            <p className="mt-2 text-sm text-slate-500">Reservations scheduled for future check-in.</p>
          </div>
          <div className="rounded-[2rem] border border-[#eadfc8] bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Active stays</p>
            <p className="mt-3 text-4xl font-black text-[#1f1d22]">{bookingSummary.activeCount}</p>
            <p className="mt-2 text-sm text-slate-500">Current in-house reservations that are still active.</p>
          </div>
          <div className="rounded-[2rem] border border-[#eadfc8] bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Total spend</p>
            <p className="mt-3 text-4xl font-black text-[#bf9b30]">{formatCurrency(bookingSummary.totalSpend)}</p>
            <p className="mt-2 text-sm text-slate-500">Lifetime reservation value based on your bookings.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-[#eadfc8] bg-white p-7 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#bf9b30]">Next Stay</p>
            {bookingSummary.nextStay ? (
              <>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-[#1f1d22]">
                  {bookingSummary.nextStay.roomType}
                </h2>
                <p className="mt-2 text-slate-500">{bookingSummary.nextStay.hotelName || "Innova HMS"}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-[#faf6ee] px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Check In</p>
                    <p className="mt-2 flex items-center gap-2 text-lg font-bold text-[#1f1d22]">
                      <CalendarDays size={16} className="text-[#bf9b30]" />
                      {formatBookingDate(bookingSummary.nextStay.checkInDate)}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-[#faf6ee] px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Total Price</p>
                    <p className="mt-2 flex items-center gap-2 text-lg font-bold text-[#1f1d22]">
                      <Wallet size={16} className="text-[#bf9b30]" />
                      {formatCurrency(bookingSummary.nextStay.totalPrice)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/customer/bookings")}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#c8a33a] px-6 py-3 text-sm font-black text-white transition-all hover:bg-[#b78f22]"
                >
                  Open My Bookings
                  <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <div className="mt-4 rounded-[1.6rem] border border-dashed border-[#d8ccb7] bg-[#faf6ee] px-6 py-10 text-center">
                <h3 className="text-2xl font-black text-[#1f1d22]">No upcoming stay yet</h3>
                <p className="mt-3 text-slate-500">Browse available rooms and create your next reservation.</p>
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

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#eadfc8] bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7edd1] text-[#bf9b30]">
                  <Crown size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Membership</p>
                  <h3 className="mt-1 text-2xl font-black text-[#1f1d22]">{user.membershipLevel || "STANDARD"}</h3>
                </div>
              </div>
              <p className="mt-5 text-sm text-slate-500">
                Loyalty points available: <span className="font-black text-[#bf9b30]">{Number(user.loyaltyPoints || 0).toLocaleString()}</span>
              </p>
            </div>

            <div className="rounded-[2rem] border border-[#eadfc8] bg-white p-7 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Quick Actions</p>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/customer/bookings")}
                  className="flex items-center justify-between rounded-[1.4rem] bg-[#faf6ee] px-5 py-4 text-left transition-all hover:bg-[#f6efdf]"
                >
                  <span className="flex items-center gap-3 text-sm font-bold text-[#1f1d22]">
                    <BedDouble size={17} className="text-[#bf9b30]" />
                    Manage bookings
                  </span>
                  <ArrowRight size={15} className="text-[#8a6d27]" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/vision-suites")}
                  className="flex items-center justify-between rounded-[1.4rem] bg-[#faf6ee] px-5 py-4 text-left transition-all hover:bg-[#f6efdf]"
                >
                  <span className="flex items-center gap-3 text-sm font-bold text-[#1f1d22]">
                    <BedDouble size={17} className="text-[#bf9b30]" />
                    Browse rooms
                  </span>
                  <ArrowRight size={15} className="text-[#8a6d27]" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/rewards")}
                  className="flex items-center justify-between rounded-[1.4rem] bg-[#faf6ee] px-5 py-4 text-left transition-all hover:bg-[#f6efdf]"
                >
                  <span className="flex items-center gap-3 text-sm font-bold text-[#1f1d22]">
                    <Crown size={17} className="text-[#bf9b30]" />
                    View rewards
                  </span>
                  <ArrowRight size={15} className="text-[#8a6d27]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
