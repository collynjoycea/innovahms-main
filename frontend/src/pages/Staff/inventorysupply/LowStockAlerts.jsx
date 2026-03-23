import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertCircle, RefreshCcw, Search, ShoppingCart, AlertTriangle, ChevronRight, Bot, Download, Box, Loader2, CheckCircle2 } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function LowStockAlerts() {
  const { isDarkMode } = useOutletContext();
  const { qs } = useStaffSession();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [reordering, setReordering] = useState(null);
  const [reorderMsg, setReorderMsg] = useState({});

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory/low-stock${qs}`);
      const d = await res.json();
      if (res.ok) setAlerts(d.items || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => { fetchAlerts(); const t = setInterval(fetchAlerts, 30000); return () => clearInterval(t); }, [fetchAlerts]);

  const handleReorder = async (item) => {
    setReordering(item.id);
    // Simulate stock-in of reorder quantity (reorderPoint - current)
    const qty = Math.max(item.reorderPoint - item.stockLevel, item.reorderPoint);
    try {
      const res = await fetch('/api/inventory/stock-in', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, quantity: qty, supplier: item.supplier, notes: 'Auto-reorder from Low Stock Alert', performedBy: 'System' }),
      });
      const d = await res.json();
      if (res.ok) { setReorderMsg(p => ({ ...p, [item.id]: { text: d.message, type: 'success' } })); fetchAlerts(); }
      else setReorderMsg(p => ({ ...p, [item.id]: { text: d.error || 'Failed.', type: 'error' } }));
    } catch { setReorderMsg(p => ({ ...p, [item.id]: { text: 'Server error.', type: 'error' } })); }
    finally { setReordering(null); }
  };

  const cats = ['All', ...Array.from(new Set(alerts.map(a => a.category)))];
  const filtered = alerts.filter(a =>
    (filterCat === 'All' || a.category === filterCat) &&
    a.name.toLowerCase().includes(search.toLowerCase())
  );
  const critical = alerts.filter(a => a.severity === 'CRITICAL').length;
  const low = alerts.filter(a => a.severity === 'LOW STOCK').length;

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-zinc-100' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-500';

  return (
    <div className={`p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f4f4f5]'} text-left`}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertTriangle size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className={`text-2xl font-black italic uppercase tracking-tighter leading-none ${text}`}>
              Low-Stock <span className="text-[#b3903c]">Alerts</span>
            </h1>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${sub}`}>
              {critical} Critical · {low} Low Stock
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={fetchAlerts} className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400'} transition-all`}>
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b3903c] text-black text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[#b3903c]/20">
            <ShoppingCart size={14} strokeWidth={3} /> Bulk Reorder
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Critical',   val: critical, icon: <AlertCircle />, color: 'text-red-500' },
          { label: 'Low Stock',  val: low,       icon: <Box />,         color: 'text-orange-500' },
          { label: 'Total Items',val: alerts.length, icon: <Bot />,     color: 'text-blue-500' },
        ].map((s, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${card} flex items-center justify-between group`}>
            <div>
              <p className={`${sub} text-[9px] font-black uppercase tracking-widest`}>{s.label}</p>
              <h2 className={`text-3xl font-black tracking-tighter mt-1 ${s.color}`}>{loading ? '--' : s.val}</h2>
            </div>
            <div className={`${s.color} opacity-20 group-hover:opacity-40 transition-opacity`}>
              {React.cloneElement(s.icon, { size: 32 })}
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className={`rounded-3xl border overflow-hidden ${card}`}>
        <div className={`p-5 border-b ${isDarkMode ? 'border-zinc-500/10' : 'border-zinc-100'} flex flex-col lg:flex-row justify-between lg:items-center gap-4`}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${text}`}>Active Alerts</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={`relative flex items-center rounded-xl border ${isDarkMode ? 'bg-black/40 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
              <Search size={13} className={`absolute left-3 ${sub}`} />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className={`bg-transparent pl-8 pr-4 py-2 text-[10px] font-bold outline-none w-40 uppercase ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border outline-none cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-300 text-zinc-600'}`}>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/[0.02] text-zinc-500' : 'bg-zinc-50 text-zinc-400'}`}>
                <th className="px-6 py-4 text-left">Item</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Severity</th>
                <th className="px-6 py-4 text-center">Supplier</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/50' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr><td colSpan="5" className={`p-12 text-center text-[10px] font-bold uppercase animate-pulse ${sub}`}>Loading alerts...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className={`p-12 text-center text-[10px] font-bold uppercase italic ${sub}`}>
                  {alerts.length === 0 ? '✓ All items are well-stocked.' : 'No items match filter.'}
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}`}>
                  <td className="px-6 py-4">
                    <p className={`text-[11px] font-black uppercase tracking-tight ${text}`}>{item.name}</p>
                    <p className="text-[8px] font-bold text-[#b3903c] tracking-widest uppercase mt-0.5">{item.category} · {item.skuId}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex flex-col items-center w-24">
                      <span className={`text-[10px] font-black ${item.severity === 'CRITICAL' ? 'text-red-500' : 'text-orange-500'}`}>
                        {item.stockLevel} / {item.reorderPoint}
                      </span>
                      <div className="w-full h-1 bg-zinc-500/20 rounded-full mt-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${item.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min(100, (item.stockLevel / item.reorderPoint) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black border ${item.severity === 'CRITICAL' ? 'bg-red-500/5 text-red-500 border-red-500/20' : 'bg-orange-500/5 text-orange-500 border-orange-500/20'}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-center text-[9px] font-bold uppercase ${sub}`}>{item.supplier || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <button onClick={() => handleReorder(item)} disabled={reordering === item.id}
                        className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all flex items-center gap-1.5 border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-[#b3903c] hover:border-[#b3903c]/40' : 'bg-white border-zinc-300 text-zinc-600 hover:border-[#b3903c]'} disabled:opacity-50`}>
                        {reordering === item.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
                        Restock
                      </button>
                      {reorderMsg[item.id] && (
                        <p className={`text-[8px] font-bold ${reorderMsg[item.id].type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {reorderMsg[item.id].text}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
