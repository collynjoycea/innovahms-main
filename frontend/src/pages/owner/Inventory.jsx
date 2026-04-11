import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, Boxes, BrainCircuit, ClipboardList, RefreshCcw, TrendingUp, Truck } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "No schedule";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

const getOwnerSession = () => {
  try {
    return JSON.parse(localStorage.getItem("ownerSession") || "{}");
  } catch {
    return {};
  }
};

const Inventory = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: false };
  const ownerSession = useMemo(() => getOwnerSession(), []);
  const ownerId = ownerSession?.id || 0;
  const hotelId = ownerSession?.hotelId || ownerSession?.hotel_id || 0;

  const [loading, setLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState([]);
  const [overview, setOverview] = useState({ totalSkus: 0, lowStock: 0, consumRate: 0, pending: 0 });
  const [dashboard, setDashboard] = useState({ stats: {}, recentMovements: [] });
  const [lowStockItems, setLowStockItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [forecastInput, setForecastInput] = useState({ event: "Weekend peak", occupancy: "92" });
  const [forecastResult, setForecastResult] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const refreshInventory = async () => {
    if (!hotelId && !ownerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [overviewRes, dashboardRes, lowStockRes, poRes] = await Promise.all([
        fetch(`/api/inventory?owner_id=${ownerId}`),
        fetch(`/api/inventory/dashboard?hotel_id=${hotelId}`),
        fetch(`/api/inventory/low-stock?hotel_id=${hotelId}`),
        fetch(`/api/inventory/purchase-orders?hotel_id=${hotelId}`),
      ]);

      const overviewData = await overviewRes.json().catch(() => ({}));
      const dashboardData = await dashboardRes.json().catch(() => ({}));
      const lowStockData = await lowStockRes.json().catch(() => ({}));
      const poData = await poRes.json().catch(() => ({}));

      setInventoryData(Array.isArray(overviewData.items) ? overviewData.items : []);
      setOverview(overviewData.summary || { totalSkus: 0, lowStock: 0, consumRate: 0, pending: 0 });
      setDashboard(dashboardData || { stats: {}, recentMovements: [] });
      setLowStockItems(Array.isArray(lowStockData.items) ? lowStockData.items : []);
      setPurchaseOrders(Array.isArray(poData.orders) ? poData.orders : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshInventory();
    const timer = window.setInterval(refreshInventory, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const runForecast = async () => {
    setForecastLoading(true);
    setForecastResult(null);
    try {
      const response = await fetch("/api/inventory/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: ownerId,
          event: forecastInput.event,
          occupancy: Number(forecastInput.occupancy || 0),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to run forecast.");
      }
      setForecastResult(data);
    } catch (error) {
      setForecastResult({ success: false, message: error.message || "Unable to run forecast." });
    } finally {
      setForecastLoading(false);
    }
  };

  const metricCards = [
    { label: "Tracked SKUs", value: overview.totalSkus, icon: Boxes },
    { label: "Low Stock", value: overview.lowStock, icon: AlertTriangle },
    { label: "Items Out Today", value: dashboard?.stats?.itemsOutToday || 0, icon: TrendingUp },
    { label: "Pending POs", value: dashboard?.stats?.pendingPos || 0, icon: Truck },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className={`overflow-hidden rounded-[32px] border p-8 ${isDarkMode ? "border-white/10 bg-[radial-gradient(circle_at_top_left,#1d1528_0%,#11151d_55%,#0c1018_100%)]" : "border-[#eadfc8] bg-[radial-gradient(circle_at_top_left,#fffaf0_0%,#ffffff_60%,#f8f1e1_100%)]"}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#bf9b30]">Inventory Control</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Live Stock Intelligence</h1>
              <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Tinanggal ko na yung filler simulation rows at placeholder hotel copy. This page now uses live inventory, dashboard, low-stock, purchase-order, and forecast endpoints.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshInventory}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-900 text-white hover:bg-slate-800"}`}
            >
              <RefreshCcw size={15} /> Refresh
            </button>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map(({ label, value, icon: Icon }) => (
            <article key={label} className={`rounded-[28px] border p-6 ${isDarkMode ? "border-white/10 bg-[#11151d]" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#bf9b30]">
                  <Icon size={20} />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{label}</p>
              </div>
              <p className="mt-5 text-3xl font-black tracking-tight">{value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
          <div className={`rounded-[32px] border p-6 ${isDarkMode ? "border-white/10 bg-[#11151d]" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bf9b30]">Inventory Ledger</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Current item status</h2>
              </div>
              <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Consumption rate: {overview.consumRate}%</p>
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-black/5">
              {loading ? (
                <div className={`px-6 py-14 text-center text-sm ${isDarkMode ? "bg-[#0d1118] text-slate-400" : "bg-slate-50 text-slate-500"}`}>Loading inventory records...</div>
              ) : inventoryData.length === 0 ? (
                <div className={`px-6 py-14 text-center text-sm ${isDarkMode ? "bg-[#0d1118] text-slate-400" : "bg-slate-50 text-slate-500"}`}>No inventory items found for this hotel.</div>
              ) : (
                <div className={isDarkMode ? "bg-[#0d1118]" : "bg-white"}>
                  {inventoryData.slice(0, 8).map((item) => {
                    const ratio = Math.max(0, Math.min(100, Math.round((Number(item.stock_level || 0) / Math.max(Number(item.max_stock || 1), 1)) * 100)));
                    return (
                      <div key={item.id} className={`grid gap-4 border-b px-6 py-5 lg:grid-cols-[1.1fr,0.65fr,1fr,0.7fr] ${isDarkMode ? "border-white/5" : "border-slate-100"}`}>
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.14em]">{item.item_name}</p>
                          <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{item.category} • {item.supplier || "No supplier"}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>SKU</p>
                          <p className="mt-2 text-sm font-semibold">{item.sku_id}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Stock Level</p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className={`h-2 w-full rounded-full ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}>
                              <div className={`h-full rounded-full ${ratio <= 30 ? "bg-rose-500" : ratio <= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${ratio}%` }} />
                            </div>
                            <span className="text-xs font-black">{item.stock_level}/{item.max_stock}</span>
                          </div>
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Status</p>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                            item.status === "LOW"
                              ? isDarkMode ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-700"
                              : isDarkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <section className={`rounded-[32px] border p-6 ${isDarkMode ? "border-white/10 bg-[#11151d]" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#bf9b30]">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bf9b30]">AI Forecast</p>
                  <h2 className="text-xl font-black tracking-tight">Scenario planner</h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <input
                  type="text"
                  value={forecastInput.event}
                  onChange={(event) => setForecastInput((current) => ({ ...current, event: event.target.value }))}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}
                  placeholder="Event or demand scenario"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={forecastInput.occupancy}
                  onChange={(event) => setForecastInput((current) => ({ ...current, occupancy: event.target.value }))}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none ${isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}
                  placeholder="Projected occupancy %"
                />
                <button
                  type="button"
                  onClick={runForecast}
                  disabled={forecastLoading}
                  className="w-full rounded-2xl bg-[#bf9b30] px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-[#0f1117] transition hover:brightness-110 disabled:opacity-60"
                >
                  {forecastLoading ? "Running Forecast..." : "Run Forecast"}
                </button>
              </div>

              {forecastResult ? (
                <div className={`mt-5 rounded-[24px] border p-5 ${isDarkMode ? "border-white/10 bg-[#0d1118]" : "border-slate-200 bg-slate-50"}`}>
                  <p className="text-sm font-bold">{forecastResult.title || "Forecast result"}</p>
                  <p className={`mt-2 text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{forecastResult.message}</p>
                  {Array.isArray(forecastResult.recommendations) ? (
                    <div className="mt-4 space-y-3">
                      {forecastResult.recommendations.map((item) => (
                        <div key={item.item} className={`rounded-2xl px-4 py-3 ${isDarkMode ? "bg-white/5" : "bg-white"}`}>
                          <p className="text-sm font-black">{item.item}</p>
                          <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Increase by {item.recommendedIncreasePercent}% • {item.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className={`rounded-[32px] border p-6 ${isDarkMode ? "border-white/10 bg-[#11151d]" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#bf9b30]">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bf9b30]">Low Stock</p>
                  <h2 className="text-xl font-black tracking-tight">Reorder priorities</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className={`rounded-2xl border px-4 py-3 ${isDarkMode ? "border-white/10 bg-[#0d1118]" : "border-slate-100 bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{item.name}</p>
                        <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{item.category} • {item.supplier || "No supplier"}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${item.severity === "CRITICAL" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className={`mt-3 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Stock: {item.stockLevel} / {item.maxStock} • Reorder point: {item.reorderPoint}</p>
                  </div>
                ))}
                {!lowStockItems.length ? (
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No low-stock alerts right now.</p>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <div className={`rounded-[32px] border p-6 ${isDarkMode ? "border-white/10 bg-[#11151d]" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#bf9b30]">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bf9b30]">Purchase Orders</p>
                <h2 className="text-xl font-black tracking-tight">Supplier pipeline</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {purchaseOrders.slice(0, 5).map((order) => (
                <div key={order.id} className={`rounded-2xl border px-4 py-3 ${isDarkMode ? "border-white/10 bg-[#0d1118]" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{order.poNumber}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{order.supplier}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${isDarkMode ? "bg-white/5 text-slate-300" : "bg-white text-slate-700"}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className={`mt-3 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>Expected: {formatDate(order.expectedDate)} • {formatCurrency(order.totalAmount)}</p>
                </div>
              ))}
              {!purchaseOrders.length ? <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No purchase orders found.</p> : null}
            </div>
          </div>

          <div className={`rounded-[32px] border p-6 ${isDarkMode ? "border-white/10 bg-[#11151d]" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#bf9b30]">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bf9b30]">Recent Movements</p>
                <h2 className="text-xl font-black tracking-tight">Stock activity</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {(dashboard?.recentMovements || []).map((movement, index) => (
                <div key={`${movement.item}-${index}`} className={`rounded-2xl border px-4 py-3 ${isDarkMode ? "border-white/10 bg-[#0d1118]" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{movement.item}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{movement.type} • {movement.qty} {movement.unit}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${movement.type === "OUT" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                      {movement.type}
                    </span>
                  </div>
                  <p className={`mt-3 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>By {movement.by || "Staff"} • {formatDate(movement.time)}</p>
                </div>
              ))}
              {!dashboard?.recentMovements?.length ? <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No movement logs found.</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Inventory;
