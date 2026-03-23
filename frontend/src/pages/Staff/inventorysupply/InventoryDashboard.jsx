import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Box, AlertTriangle, ArrowDownLeft, Truck, BarChart3, RefreshCcw, TrendingUp, PackageCheck, LayoutGrid } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function InventoryDashboard() {
  const { isDarkMode } = useOutletContext();
  const { qs, hotelName } = useStaffSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory/dashboard${qs}`);
      const d = await res.json();
      if (res.ok) setData(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-100 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  const stats = [
    { label: 'Total SKUs',      val: data?.stats.totalSkus     ?? '--', sub: 'Items tracked',      icon: <Box />,           color: 'text-[#b3903c]' },
    { label: 'Low-Stock Items', val: data?.stats.lowStock      ?? '--', sub: 'Need reorder',       icon: <AlertTriangle />, color: 'text-red-500' },
    { label: 'Items Out Today', val: data?.stats.itemsOutToday ?? '--', sub: 'Units disbursed',    icon: <ArrowDownLeft />, color: 'text-[#b3903c]' },
    { label: 'Pending Orders',  val: data?.stats.pendingPos    ?? '--', sub: 'Purchase orders',    icon: <Truck />,         color: 'text-emerald-400' },
  ];

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className={`text-4xl font-black italic uppercase tracking-tighter leading-none ${text}`}>
            Inventory <span className="text-[#b3903c]">Dashboard</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-2 h-2 rounded-full bg-[#b3903c] animate-pulse" />
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${sub}`}>
              {hotelName || 'Innova HMS'} · {now.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button onClick={fetchData} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((s, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border group transition-all hover:-translate-y-1 ${card}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDarkMode ? 'bg-zinc-900 group-hover:bg-[#b3903c]/10' : 'bg-zinc-50 group-hover:bg-[#b3903c]/5'} ${s.color}`}>
              {React.cloneElement(s.icon, { size: 22, strokeWidth: 2.5 })}
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>{s.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <h2 className={`text-3xl font-black tracking-tighter ${text}`}>{loading ? '--' : s.val}</h2>
              <span className={`text-[9px] font-bold mb-1.5 uppercase ${s.label === 'Low-Stock Items' ? 'text-red-500' : 'text-[#b3903c]'}`}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: Low stock alerts + recent movements */}
        <div className="lg:col-span-7 space-y-8">
          {/* LOW STOCK */}
          <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#0c0c0e]/40 border-red-900/20' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-500 animate-pulse" size={18} />
                <h2 className={`text-sm font-black uppercase tracking-widest ${text}`}>Critical Alerts</h2>
              </div>
              <span className="text-[10px] font-black text-red-500 uppercase px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20">
                {data?.stats.lowStock || 0} Items
              </span>
            </div>
            {loading ? (
              <div className={`text-center py-8 text-[10px] font-bold uppercase tracking-widest animate-pulse ${sub}`}>Loading...</div>
            ) : (data?.recentMovements || []).filter(m => m.type === 'OUT').length === 0 ? (
              <div className={`text-center py-8 text-[10px] font-bold uppercase tracking-widest italic ${sub}`}>No critical alerts.</div>
            ) : null}
          </div>

          {/* RECENT MOVEMENTS */}
          <div className={`rounded-[2.5rem] border overflow-hidden ${card}`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-100'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <RefreshCcw size={16} className="text-[#b3903c]" />
                <h2 className={`text-sm font-black uppercase tracking-widest ${text}`}>Recent Movements</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/[0.02] text-zinc-500' : 'bg-zinc-50 text-zinc-400'}`}>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4">By</th>
                    <th className="px-6 py-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/40' : 'divide-zinc-100'}`}>
                  {loading ? (
                    <tr><td colSpan="5" className={`p-10 text-center text-[10px] font-bold uppercase animate-pulse ${sub}`}>Loading...</td></tr>
                  ) : (data?.recentMovements || []).length === 0 ? (
                    <tr><td colSpan="5" className={`p-10 text-center text-[10px] font-bold uppercase italic ${sub}`}>No movements yet.</td></tr>
                  ) : (data?.recentMovements || []).map((m, i) => (
                    <tr key={i} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50/50'}`}>
                      <td className={`px-6 py-4 text-[11px] font-black uppercase ${text}`}>{m.item}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-black border ${m.type === 'IN' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{m.type}</span>
                      </td>
                      <td className={`px-6 py-4 text-center text-xs font-black font-mono ${m.type === 'IN' ? 'text-emerald-500' : 'text-red-500'}`}>{m.type === 'IN' ? '+' : '-'}{m.qty}</td>
                      <td className={`px-6 py-4 text-[10px] font-bold uppercase ${sub}`}>{m.by}</td>
                      <td className={`px-6 py-4 text-right text-[10px] font-bold font-mono italic ${sub}`}>{m.time ? new Date(m.time).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Category levels + quick actions */}
        <div className="lg:col-span-5 space-y-8">
          <div className={`p-8 rounded-[2.5rem] border ${card}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 size={18} className="text-[#b3903c]" />
                <h2 className={`text-sm font-black uppercase tracking-widest ${text}`}>Stock by Category</h2>
              </div>
            </div>
            <div className="space-y-5">
              {loading ? (
                <div className={`text-center py-6 text-[10px] font-bold uppercase animate-pulse ${sub}`}>Loading...</div>
              ) : (data?.categories || []).map((cat, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className={sub}>{cat.name}</span>
                    <span className={cat.avgPercent < 30 ? 'text-orange-500' : 'text-[#b3903c]'}>
                      {cat.avgPercent}% <span className={`${sub} font-bold ml-1`}>STOCKED</span>
                    </span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                    <div className={`h-full rounded-full transition-all duration-1000 ${cat.avgPercent < 30 ? 'bg-orange-500' : 'bg-[#b3903c]'}`}
                      style={{ width: `${cat.avgPercent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className={`p-5 rounded-3xl border flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-[#b3903c] text-black border-transparent' : 'bg-zinc-900 text-white border-transparent'}`}>
              <LayoutGrid size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">Stock Registry</span>
            </button>
            <button className={`p-5 rounded-3xl border flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200 shadow-sm'}`}>
              <PackageCheck size={20} className="text-[#b3903c]" />
              <span className="text-[9px] font-black uppercase tracking-widest">Audit Logs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
