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
      <div className="min-h-screen bg-emerald-950/5 flex items-center justify-center font-sans">
        <div className="rounded-2xl border border-emerald-900/10 bg-white px-10 py-12 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="mt-4 text-xs font-medium text-zinc-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-950/5 flex flex-col items-center justify-center p-6 text-center font-sans">
        <ShieldCheck size={48} className="text-emerald-700/60" />
        <h2 className="mt-5 text-2xl font-bold text-zinc-900">Access Denied</h2>
        <p className="mt-2 text-xs text-zinc-500">{loadError || "Invalid customer session."}</p>
        <button
          onClick={handleSessionReset}
          className="mt-6 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950/5 text-zinc-800 font-sans">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 border-b border-zinc-200/80 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <Sparkles size={14} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Customer Portal</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Welcome back, <span className="text-emerald-800">{user.firstName || "Guest"}</span>
            </h1>
            <p className="mt-2 text-xs text-zinc-500">Overview of your stay status, points, and account actions</p>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 transition-colors hover:text-emerald-950"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            Refresh data
          </button>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-700">
            {loadError}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Upcoming Stays</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{bookingSummary.upcomingCount}</p>
            <p className="mt-1 text-xs text-zinc-500">Scheduled for future dates</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Active Stays</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{bookingSummary.activeCount}</p>
            <p className="mt-1 text-xs text-zinc-500">Currently in-house</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Total Spend</p>
            <p className="mt-2 text-3xl font-bold text-emerald-800">{formatCurrency(bookingSummary.totalSpend)}</p>
            <p className="mt-1 text-xs text-zinc-500">Lifetime reservation value</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Next Stay</p>
            {bookingSummary.nextStay ? (
              <>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
                  {bookingSummary.nextStay.roomType}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">{bookingSummary.nextStay.hotelName || "Innova HMS"}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-950/5 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Check In</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
                      <CalendarDays size={14} className="text-emerald-700" />
                      {formatBookingDate(bookingSummary.nextStay.checkInDate)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-950/5 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Total Charged</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
                      <Wallet size={14} className="text-emerald-700" />
                      {formatCurrency(bookingSummary.nextStay.totalPrice)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/customer/bookings")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  Manage Stays
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center">
                <h3 className="text-sm font-semibold text-zinc-800">No upcoming stay scheduled</h3>
                <p className="mt-1 text-xs text-zinc-500">Explore available suites and reserve your next visit.</p>
                <button
                  type="button"
                  onClick={() => navigate("/vision-suites")}
                  className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  Explore Suites
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <Crown size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Membership Tier</p>
                  <h3 className="mt-0.5 text-xl font-bold text-zinc-900">{user.membershipLevel || "STANDARD"}</h3>
                </div>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                Reward points balance: <span className="font-bold text-emerald-800">{Number(user.loyaltyPoints || 0).toLocaleString()}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Quick Actions</p>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/customer/bookings")}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-left transition-colors hover:bg-emerald-50 hover:border-emerald-100"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-zinc-800">
                    <BedDouble size={15} className="text-emerald-700" />
                    Manage Stays
                  </span>
                  <ArrowRight size={13} className="text-zinc-400" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/vision-suites")}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-left transition-colors hover:bg-emerald-50 hover:border-emerald-100"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-zinc-800">
                    <BedDouble size={15} className="text-emerald-700" />
                    Browse Available Rooms
                  </span>
                  <ArrowRight size={13} className="text-zinc-400" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/rewards")}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-left transition-colors hover:bg-emerald-50 hover:border-emerald-100"
                >
                  <span className="flex items-center gap-2.5 text-xs font-medium text-zinc-800">
                    <Crown size={15} className="text-emerald-700" />
                    Rewards Program
                  </span>
                  <ArrowRight size={13} className="text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}