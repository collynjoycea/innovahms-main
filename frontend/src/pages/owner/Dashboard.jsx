import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const OWNER_SESSION_KEY = "ownerSession";

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const compact = (value) => {
  try {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
  } catch {
    return String(value || 0);
  }
};

const shortLabel = (label) => {
  const raw = String(label || "");
  if (/^\d{4}-\d{2}$/.test(raw)) return new Date(`${raw}-01`).toLocaleDateString("en-US", { month: "short" });
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return raw || "--";
};

const StatCard = ({ title, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{title}</p>
    <div className="mt-2 flex items-end justify-between gap-3">
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {subtitle ? <span className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">{subtitle}</span> : null}
    </div>
  </div>
);

const MiniStat = ({ label, value, tone = "slate" }) => {
  const classes =
    tone === "gold"
      ? "border-[#bf9b30]/15 bg-[#bf9b30]/10 text-[#8f7423]"
      : tone === "rose"
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em]">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
};

const BarTrend = ({ labels = [], series = [], tone = "gold", formatter = (value) => value }) => {
  const values = (series || []).map((value) => Number(value || 0));
  const max = Math.max(...values, 1);
  const gradient = tone === "emerald" ? "from-emerald-500 to-emerald-300" : tone === "slate" ? "from-slate-700 to-slate-500" : "from-[#bf9b30] to-[#e7c661]";
  return (
    <div>
      <div className="flex h-32 items-end gap-2">
        {values.length ? values.map((value, index) => (
          <div key={`${labels[index]}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end rounded-2xl bg-slate-100 p-1">
              <div className={`w-full rounded-xl bg-gradient-to-t ${gradient}`} style={{ height: `${Math.max(12, (value / max) * 88)}px` }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{shortLabel(labels[index])}</span>
          </div>
        )) : <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">No trend data yet.</div>}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{formatter(values[0] || 0)}</span>
        <span>{formatter(values[values.length - 1] || 0)}</span>
      </div>
    </div>
  );
};

const RecCard = ({ item }) => (
  <div className="group relative min-h-[230px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-900 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.65)]">
    <img src={item?.imageUrl || "/images/deluxe-room.jpg"} alt={item?.title || "AI recommendation"} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.10)_0%,rgba(15,23,42,0.82)_68%,rgba(15,23,42,0.95)_100%)]" />
    <div className="relative flex h-full flex-col justify-between p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">{item?.priority || "AI"}</span>
        <span className="rounded-full bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8d47e]">{item?.metricLabel || "Signal"}: {item?.metricValue || "--"}</span>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f5d17a]">AI Image Recommendation</p>
        <h3 className="mt-2 text-xl font-black leading-tight">{item?.title || "Recommendation"}</h3>
        <p className="mt-3 text-sm leading-relaxed text-white/85">{item?.summary || "No recommendation insight yet."}</p>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{item?.action || "Waiting for more data"}</p>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(OWNER_SESSION_KEY);
    if (!raw) return navigate("/owner/login", { replace: true });

    let ownerId = null;
    try {
      ownerId = JSON.parse(raw)?.id ?? null;
    } catch {
      ownerId = null;
    }
    if (!ownerId) {
      localStorage.removeItem(OWNER_SESSION_KEY);
      return navigate("/owner/login", { replace: true });
    }

    const controller = new AbortController();
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const [dashRes, forecastRes, analyticsRes] = await Promise.all([
          fetch(`/api/owner/dashboard/${ownerId}?period=${period}`, { signal: controller.signal }),
          fetch(`/api/owner/forecast/${ownerId}?period=${period}`, { signal: controller.signal }),
          fetch(`/api/owner/analytics/${ownerId}?period=${period}`, { signal: controller.signal }),
        ]);
        const dash = await dashRes.json().catch(() => ({}));
        const forecast = await forecastRes.json().catch(() => ({}));
        const analytics = await analyticsRes.json().catch(() => ({}));
        if (!dashRes.ok) {
          setError(dash?.error || `Failed to load dashboard (HTTP ${dashRes.status}).`);
          setData(null);
          setForecastData(null);
          setAnalyticsData(null);
          return;
        }
        setData(dash);
        setForecastData(forecastRes.ok ? forecast : dash?.forecast || null);
        setAnalyticsData(analyticsRes.ok ? analytics : null);
        setLastSynced(new Date());
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError("Unable to reach the server. Please try again.");
        setData(null);
        setForecastData(null);
        setAnalyticsData(null);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(() => load(true), 15000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [navigate, period]);

  const kpis = data?.kpis || {};
  const analytics = analyticsData || {};
  const summary = analytics?.summary || {};
  const trends = analytics?.trends || {};
  const behavior = analytics?.behavioralAnalytics || {};
  const roomMix = analytics?.roomMix || [];
  const recommendations = analytics?.aiRecommendations || [];

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-6 py-6">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Overview for <span className="font-semibold">{data?.hotelName || "your property"}</span></p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{lastSynced ? `Live sync ${lastSynced.toLocaleTimeString()}` : "Live sync ready"}</p>
          </div>
          <div className="flex items-center gap-2">
            {["daily", "monthly"].map((value) => (
              <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-xl border px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] transition-all ${period === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>{value}</button>
            ))}
          </div>
        </div>

        {error ? <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Reservations" value={(kpis.totalReservations ?? 0).toLocaleString()} subtitle="Real-time count" />
          <StatCard title="Occupancy Rate" value={`${Math.round(kpis.occupancyRate ?? 0)}%`} subtitle="Live room status" />
          <StatCard title="Total Revenue" value={formatPhp(kpis.totalRevenuePhp)} subtitle="Trend-based sync" />
          <StatCard title="Available Rooms" value={(kpis.availableRooms ?? 0).toLocaleString()} subtitle={kpis.inventoryNote || ""} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Analytics, Forecasting and Behavioral Analytics</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Owner Intelligence Center</h2>
              </div>
              <div className="rounded-2xl border border-[#bf9b30]/15 bg-[#bf9b30]/10 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8f7423]">Forecasted Revenue</p>
                <p className="mt-1 text-xl font-black text-slate-900">{formatPhp(summary.forecastedRevenuePhp)}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Occupancy Trend</p><p className="mt-1 text-sm text-slate-500">Room utilization trend</p></div><span className="text-sm font-black text-slate-900">{Math.round(summary.currentOccupancyRate || 0)}%</span></div>
                <BarTrend labels={trends.labels} series={trends.occupancyRate} tone="gold" formatter={(value) => `${Math.round(value)}%`} />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Revenue Trend</p><p className="mt-1 text-sm text-slate-500">Historical booking income</p></div><span className="text-sm font-black text-slate-900">{formatPhp(summary.currentRevenuePhp)}</span></div>
                <BarTrend labels={trends.labels} series={trends.revenuePhp} tone="emerald" formatter={(value) => formatPhp(value)} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              <MiniStat label="Repeat Guests" value={`${Math.round(summary.repeatGuestRate || 0)}%`} tone="gold" />
              <MiniStat label="Avg Guest Spend" value={formatPhp(summary.averageGuestSpendPhp)} />
              <MiniStat label="Cancellation Rate" value={`${Math.round(summary.cancellationRate || 0)}%`} tone="rose" />
              <MiniStat label="High Risk Guests" value={summary.highRiskGuests || 0} />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Forecast Snapshot</p><h3 className="mt-2 text-xl font-black text-slate-900">Planning Signals</h3></div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{period}</span>
            </div>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Projected Occupancy</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{Math.round(summary.forecastedOccupancyRate || 0)}%</p>
                <p className="mt-2 text-sm text-slate-500">Based on {summary.forecastHorizon || 0} future {period === "daily" ? "days" : "months"} from reservation history.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Demand Volume</p><p className="mt-2 text-xl font-black text-slate-900">{compact((trends.bookings || []).reduce((sum, value) => sum + Number(value || 0), 0))}</p></div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Forecast Engine</p><p className="mt-2 text-xl font-black capitalize text-slate-900">{analytics?.forecast?.engine?.mode?.replace("-", " ") || "trend model"}</p></div>
              </div>
              <div className="rounded-2xl border border-[#bf9b30]/15 bg-[linear-gradient(135deg,rgba(191,155,48,0.12),rgba(191,155,48,0.03))] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f7423]">AI Planning Note</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">Use the projected revenue of {formatPhp(summary.forecastedRevenuePhp)} and occupancy outlook of {Math.round(summary.forecastedOccupancyRate || 0)}% to plan pricing, staffing, and promotions.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Guest Behavioral Analytics</p><h3 className="mt-2 text-xl font-black text-slate-900">Spending, frequency and cancellation behavior</h3></div>
              <button type="button" onClick={() => navigate("/owner/customers")} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 hover:border-slate-300">Open CRM</button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Top Guests</p><span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{behavior?.topGuests?.length || 0}</span></div>
                <div className="mt-4 space-y-3">
                  {(behavior?.topGuests || []).slice(0, 4).map((guest) => (
                    <div key={`${guest.name}-${guest.customerId || guest.lastBookingDate}`} className="flex items-center gap-3">
                      <img src={guest.imageUrl || "/images/deluxe-room.jpg"} alt={guest.name} className="h-12 w-12 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{guest.name}</p><p className="text-xs text-slate-500">{guest.preferredRoom || "Room"} | {guest.bookingFrequency || "Occasional"}</p></div>
                      <div className="text-right"><p className="text-sm font-black text-slate-900">{formatPhp(guest.totalSpend)}</p><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{guest.segment}</p></div>
                    </div>
                  ))}
                  {(!behavior?.topGuests || behavior.topGuests.length === 0) && !loading ? <p className="text-sm text-slate-500">No guest analytics yet.</p> : null}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Risk Watch</p><span className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">{behavior?.atRiskGuests?.length || 0} flagged</span></div>
                <div className="mt-4 space-y-3">
                  {(behavior?.atRiskGuests || []).slice(0, 4).map((guest) => (
                    <div key={`${guest.name}-${guest.riskScore}`} className="rounded-2xl border border-rose-100 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="text-sm font-black text-slate-900">{guest.name}</p><p className="mt-1 text-xs text-slate-500">Cancel rate {Math.round(guest.cancellationRate || 0)}% | {guest.bookingCount || 0} bookings</p></div>
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Risk {guest.riskScore || 0}</span>
                      </div>
                    </div>
                  ))}
                  {(!behavior?.atRiskGuests || behavior.atRiskGuests.length === 0) && !loading ? <p className="text-sm text-slate-500">No high-risk guests flagged.</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_35px_-24px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Room Mix</p><h3 className="mt-2 text-xl font-black text-slate-900">Booking and revenue distribution</h3></div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">DB Sync</span>
            </div>
            <div className="mt-5 space-y-3">
              {roomMix.slice(0, 5).map((room) => (
                <div key={`${room.label}-${room.revenue}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <img src={room.imageUrl || "/images/deluxe-room.jpg"} alt={room.label} className="h-14 w-14 rounded-2xl object-cover" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{room.label}</p><p className="mt-1 text-xs text-slate-500">{room.bookingCount || 0} bookings | {Math.round(room.share || 0)}% demand share</p></div>
                    <p className="text-sm font-black text-slate-900">{formatPhp(room.revenue)}</p>
                  </div>
                </div>
              ))}
              {!roomMix.length && !loading ? <p className="text-sm text-slate-500">No room mix analytics yet.</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {recommendations.map((item) => <RecCard key={item.id} item={item} />)}
          {!recommendations.length && !loading ? <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 lg:col-span-3">AI recommendation cards will appear here once booking data is available.</div> : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
            <div className="flex items-center justify-between"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Room Status</p><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total {data?.roomStatus?.totalRooms ?? 0} Rooms</span></div>
            <div className="mt-4 grid grid-cols-6 gap-2">{(data?.roomStatus?.rooms || []).slice(0, 30).map((room) => { const status = (room.status || "vacant").toLowerCase(); const color = status === "occupied" ? "bg-[#bf9b30]" : status === "dirty" ? "bg-rose-500" : status === "maintenance" ? "bg-slate-700" : "bg-slate-200"; return <div key={room.id} title={`${room.roomNumber || "Room"} - ${status}`} className={`h-6 w-6 rounded-md border border-black/5 ${color}`} />; })}</div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-[#bf9b30]" />Occupied ({data?.roomStatus?.counts?.occupied ?? 0})</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-slate-200" />Vacant ({data?.roomStatus?.counts?.vacant ?? 0})</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-rose-500" />Dirty ({data?.roomStatus?.counts?.dirty ?? 0})</div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-slate-700" />Maintenance ({data?.roomStatus?.counts?.maintenance ?? 0})</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
            <div className="flex items-center justify-between"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Recent Bookings</p><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</span></div>
            <div className="mt-4 space-y-3">
              {(data?.recentBookings || []).slice(0, 4).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-bold text-slate-900">{booking.customerName || "Customer"}</p><p className="text-xs text-slate-500">Room {booking.roomNumber || "--"} | {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : "--"}</p></div>
                  <div className="text-right"><p className="text-sm font-black text-slate-900">{formatPhp(booking.totalAmountPhp)}</p><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{booking.status || "--"}</p></div>
                </div>
              ))}
              {(!data?.recentBookings || data.recentBookings.length === 0) && !loading ? <p className="text-sm text-slate-500">No bookings yet.</p> : null}
            </div>
            <button type="button" onClick={() => navigate("/owner/reservations")} className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-3 text-[11px] font-black uppercase tracking-[0.25em] text-slate-700 hover:border-slate-300">View All Transactions</button>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
            <div className="flex items-center justify-between"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Customer Origins</p><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OSM</span></div>
            <div className="relative mt-4 h-[120px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"><div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(191,155,48,0.25)_0%,transparent_55%),radial-gradient(circle_at_70%_60%,rgba(15,23,42,0.18)_0%,transparent_55%)] opacity-60" />{(data?.customerOrigins?.points || []).slice(0, 10).map((point) => <span key={`${point.label}-${point.lat}-${point.lng}`} className="absolute h-2 w-2 rounded-full bg-[#bf9b30] shadow" style={{ left: `${Math.min(88, Math.max(8, ((Number(point.lng) + 180) / 360) * 100))}%`, top: `${Math.min(82, Math.max(8, ((90 - Number(point.lat)) / 180) * 100))}%` }} title={point.label} />)}</div>
            <div className="mt-4 space-y-2 text-sm">{(data?.customerOrigins?.top || []).slice(0, 3).map((origin) => <div key={origin.label} className="flex items-center justify-between"><span className="font-semibold text-slate-700">{origin.label}</span><span className="font-bold text-slate-500">{origin.count}</span></div>)}{(!data?.customerOrigins?.top || data.customerOrigins.top.length === 0) && !loading ? <p className="text-sm text-slate-500">No origin data yet.</p> : null}</div>
            <p className="mt-4 text-[10px] font-semibold text-slate-400">Customer origin geopoints rendered from recorded customer origin data.</p>
          </div>
        </div>

        {loading ? <div className="mt-6 text-sm font-semibold text-slate-500">Loading dashboard...</div> : null}
      </div>
    </div>
  );
}
