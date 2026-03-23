import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { History, Search, Download, ArrowUpRight, ArrowDownLeft, Settings, Zap, RefreshCcw } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const TYPE_STYLE = {
  IN:     { icon: <ArrowUpRight size={14} />,  color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  OUT:    { icon: <ArrowDownLeft size={14} />, color: 'text-red-500',     bg: 'bg-red-500/10' },
  ADJUST: { icon: <Settings size={14} />,      color: 'text-[#b3903c]',   bg: 'bg-[#b3903c]/10' },
};

export default function HistoryLogs() {
  const { isDarkMode } = useOutletContext();
  const { qs } = useStaffSession();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory/movements${qs}${qs ? '&' : '?'}limit=100`);
      const d = await res.json();
      if (res.ok) setLogs(d.movements || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l =>
    !search || l.itemName?.toLowerCase().includes(search.toLowerCase()) || l.performedBy?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`p-8 space-y-8 text-left min-h-screen font-sans ${isDarkMode ? 'bg-black' : 'bg-[#f8f9fa]'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className={`text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
            <History className="text-[#b3903c]" size={28} /> Audit Trail
          </h1>
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {logs.length} movement records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
            <input type="text" placeholder="Filter by item or user..." value={search} onChange={e => setSearch(e.target.value)}
              className={`pl-12 pr-6 py-2.5 text-[11px] font-bold outline-none w-64 transition-all rounded-full border ${isDarkMode ? 'bg-zinc-900/50 border-white/5 text-white focus:border-[#b3903c]/50' : 'bg-white border-zinc-200 text-zinc-900 focus:border-[#b3903c]'}`} />
          </div>
          <button onClick={fetchLogs} className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400'} transition-all`}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0c0c0e] border-white/5' : 'bg-white border-zinc-200'}`}>
        <table className="w-full text-left">
          <thead className={`text-[9px] font-black uppercase tracking-[0.3em] border-b ${isDarkMode ? 'bg-zinc-900/50 text-zinc-500 border-white/5' : 'bg-zinc-50 text-zinc-400 border-zinc-100'}`}>
            <tr>
              <th className="px-8 py-5">Type</th>
              <th className="px-6 py-5">Item</th>
              <th className="px-6 py-5">Details</th>
              <th className="px-6 py-5">By</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-8 py-5 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.03]' : 'divide-zinc-100'}`}>
            {loading ? (
              <tr><td colSpan="6" className={`p-16 text-center text-[10px] font-bold uppercase animate-pulse ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Loading audit trail...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" className={`p-16 text-center text-[10px] font-bold uppercase italic ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>No records found.</td></tr>
            ) : filtered.map(log => {
              const st = TYPE_STYLE[log.type] || TYPE_STYLE.ADJUST;
              return (
                <tr key={log.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${st.bg} ${st.color}`}>{st.icon}</div>
                      <span className={`text-[10px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{log.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className={`text-[11px] font-black ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>{log.itemName}</p>
                    <p className="text-[8px] font-bold text-[#b3903c] uppercase tracking-widest">{log.skuId}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className={`text-[10px] font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {log.type === 'IN' ? `+${log.quantity} ${log.unit}` : `-${log.quantity} ${log.unit}`}
                      {log.department ? ` → ${log.department}` : ''}
                      {log.supplier ? ` from ${log.supplier}` : ''}
                    </p>
                    {log.reason && <p className={`text-[9px] ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{log.reason}</p>}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#b3903c]/40" />
                      <span className={`font-black text-[10px] uppercase tracking-tighter ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{log.performedBy || 'Staff'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${isDarkMode ? 'bg-white/[0.03] border-white/5 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
                      Completed
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <p className={`font-mono text-[11px] font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </p>
                    <p className={`font-bold text-[9px] uppercase ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className={`p-5 border-t flex justify-between items-center ${isDarkMode ? 'bg-zinc-900/20 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Showing {filtered.length} of {logs.length} records
          </p>
        </div>
      </div>
    </div>
  );
}
