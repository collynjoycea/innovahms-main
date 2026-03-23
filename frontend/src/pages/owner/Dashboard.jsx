import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const OWNER_SESSION_KEY = "ownerSession";

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const Sparkline = ({ labels, series }) => {
  const points = useMemo(() => {
    const values = (series || []).map((n) => Number(n || 0));
    if (values.length < 2) return "";

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);

    return values
      .map((v, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 100 - ((v - min) / range) * 100;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [series]);

  return (
    <div className="relative h-[180px] w-full rounded-2xl border border-slate-100 bg-white p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-slate-400">
            AI-Assisted Forecasting
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Revenue & occupancy projections (trend-based)
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#bf9b30] bg-[#bf9b30]/10 border border-[#bf9b30]/20 px-3 py-1 rounded-full">
          Prophet Model v2
        </span>
      </div>

      <div className="relative h-[120px] rounded-xl bg-[linear-gradient(180deg,rgba(191,155,48,0.10)_0%,rgba(191,155,48,0.00)_80%)] border border-[#bf9b30]/15 overflow-hidden">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(191,155,48,0.25)" />
              <stop offset="100%" stopColor="rgba(191,155,48,0.02)" />
            </linearGradient>
          </defs>
          {points ? (
            <>
              <polyline points={points} fill="none" stroke="#bf9b30" strokeWidth="2" />
              <polyline
                points={`${points} 100,100 0,100`}
                fill="url(#fill)"
                stroke="none"
              />
            </>
          ) : (
            <text x="50" y="55" textAnchor="middle" fill="#94a3b8" fontSize="6">
              No data yet
            </text>
          )}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <span>{labels?.[0] || "--"}</span>
        <span>{labels?.[labels?.length - 1] || "--"}</span>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
    <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-slate-400">{title}</p>
    <div className="mt-2 flex items-end justify-between">
      <p className="text-2xl font-black text-slate-900">{value}</p>
      {subtitle ? (
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{subtitle}</span>
      ) : null}
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("monthly"); // monthly | daily
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(OWNER_SESSION_KEY);
    if (!raw) {
      navigate("/owner/login", { replace: true });
      return;
    }

    let ownerId = null;
    try {
      ownerId = JSON.parse(raw)?.id ?? null;
    } catch {
      ownerId = null;
    }

    if (!ownerId) {
      localStorage.removeItem(OWNER_SESSION_KEY);
      navigate("/owner/login", { replace: true });
      return;
    }

    const controller = new AbortController();

    const loadDashboard = async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError("");
      try {
        const [res, forecastRes] = await Promise.all([
          fetch(`/api/owner/dashboard/${ownerId}?period=${period}`, {
            signal: controller.signal,
          }),
          fetch(`/api/owner/forecast/${ownerId}?period=${period}`, {
            signal: controller.signal,
          }),
        ]);

        let payload = {};
        let forecastPayload = {};
        try {
          payload = await res.json();
        } catch {
          payload = {};
        }
        try {
          forecastPayload = await forecastRes.json();
        } catch {
          forecastPayload = {};
        }

        if (!res.ok) {
          setError(payload?.error || `Failed to load dashboard (HTTP ${res.status}).`);
          setData(null);
          setForecastData(null);
          return;
        }

        setData(payload);
        setForecastData(forecastRes.ok ? forecastPayload : (payload?.forecast || null));
        setLastSynced(new Date());
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError("Unable to reach the server. Please try again.");
        setData(null);
        setForecastData(null);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    const interval = window.setInterval(() => loadDashboard(true), 15000);
    const onFocus = () => loadDashboard(true);
    window.addEventListener("focus", onFocus);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [navigate, period]);

  const kpis = data?.kpis || {};
  const forecast = forecastData || data?.forecast || {};

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-6 py-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Overview for <span className="font-semibold">{data?.hotelName || "your property"}</span>
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
              {lastSynced ? `Live sync ${lastSynced.toLocaleTimeString()}` : "Live sync ready"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPeriod("daily")}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.25em] border transition-all ${
                period === "daily"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.25em] border transition-all ${
                period === "monthly"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 font-semibold">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Reservations" value={(kpis.totalReservations ?? 0).toLocaleString()} subtitle="Real-time count" />
          <StatCard title="Occupancy Rate" value={`${Math.round(kpis.occupancyRate ?? 0)}%`} subtitle="Live room status" />
          <StatCard title="Total Revenue" value={formatPhp(kpis.totalRevenuePhp)} subtitle="Trend-based sync" />
          <StatCard title="Available Rooms" value={(kpis.availableRooms ?? 0).toLocaleString()} subtitle={kpis.inventoryNote || ""} />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Sparkline labels={forecast.labels} series={forecast.revenueSeries?.length ? forecast.revenueSeries : forecast.occupancySeries} />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-slate-400">Staff On Duty</p>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {data?.staffOnDuty?.length || 0}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {(data?.staffOnDuty || []).slice(0, 4).map((s) => (
                <div key={`${s.name}-${s.role}`} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-500">
                    {(s.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.role}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              ))}

              {(!data?.staffOnDuty || data.staffOnDuty.length === 0) && !loading ? (
                <p className="text-sm text-slate-500">No staff data yet.</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => navigate("/owner/staff")}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-3 text-[11px] font-black uppercase tracking-[0.25em] text-slate-700 hover:border-slate-300"
            >
              View All Roster
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-slate-400">Room Status</p>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Total {data?.roomStatus?.totalRooms ?? 0} Rooms
              </span>
            </div>

            <div className="mt-4 grid grid-cols-6 gap-2">
              {(data?.roomStatus?.rooms || []).slice(0, 30).map((room) => {
                const status = (room.status || "vacant").toLowerCase();
                const color =
                  status === "occupied"
                    ? "bg-[#bf9b30]"
                    : status === "dirty"
                    ? "bg-rose-500"
                    : status === "maintenance"
                    ? "bg-slate-700"
                    : "bg-slate-200";

                return (
                  <div
                    key={room.id}
                    title={`${room.roomNumber || "Room"} - ${status}`}
                    className={`h-6 w-6 rounded-md ${color} border border-black/5`}
                  />
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-[#bf9b30]" />
                Occupied ({data?.roomStatus?.counts?.occupied ?? 0})
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-slate-200" />
                Vacant ({data?.roomStatus?.counts?.vacant ?? 0})
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-rose-500" />
                Dirty ({data?.roomStatus?.counts?.dirty ?? 0})
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-slate-700" />
                Maintenance ({data?.roomStatus?.counts?.maintenance ?? 0})
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-slate-400">Recent Bookings</p>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</span>
            </div>

            <div className="mt-4 space-y-3">
              {(data?.recentBookings || []).slice(0, 4).map((b) => (
                <div key={b.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{b.customerName || "Customer"}</p>
                    <p className="text-xs text-slate-500">
                      Room {b.roomNumber || "--"} • {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "--"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{formatPhp(b.totalAmountPhp)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{b.status || "--"}</p>
                  </div>
                </div>
              ))}
              {(!data?.recentBookings || data.recentBookings.length === 0) && !loading ? (
                <p className="text-sm text-slate-500">No bookings yet.</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => navigate("/owner/reservations")}
              className="mt-5 w-full rounded-xl border border-slate-200 bg-white py-3 text-[11px] font-black uppercase tracking-[0.25em] text-slate-700 hover:border-slate-300"
            >
              View All Transactions
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.30)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-slate-400">Customer Origins</p>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OSM</span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 h-[120px] relative overflow-hidden">
              <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_30%_40%,rgba(191,155,48,0.25)_0%,transparent_55%),radial-gradient(circle_at_70%_60%,rgba(15,23,42,0.18)_0%,transparent_55%)]" />
              {(data?.customerOrigins?.points || []).slice(0, 10).map((p) => (
                <span
                  key={`${p.label}-${p.lat}-${p.lng}`}
                  className="absolute h-2 w-2 rounded-full bg-[#bf9b30] shadow"
                  style={{
                    left: `${Math.min(88, Math.max(8, ((Number(p.lng) + 180) / 360) * 100))}%`,
                    top: `${Math.min(82, Math.max(8, ((90 - Number(p.lat)) / 180) * 100))}%`,
                  }}
                  title={p.label}
                />
              ))}
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {(data?.customerOrigins?.top || []).slice(0, 3).map((o) => (
                <div key={o.label} className="flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">{o.label}</span>
                  <span className="text-slate-500 font-bold">{o.count}</span>
                </div>
              ))}
              {(!data?.customerOrigins?.top || data.customerOrigins.top.length === 0) && !loading ? (
                <p className="text-sm text-slate-500">No origin data yet.</p>
              ) : null}
            </div>

            <p className="mt-4 text-[10px] text-slate-400 font-semibold">
              Customer origin geopoints rendered from recorded customer origin data.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-slate-500 font-semibold">Loading dashboard...</div>
        ) : null}
      </div>
    </div>
  );
}
