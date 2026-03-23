import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, Download, RefreshCw, X } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function SystemLogs() {
  const { isDarkMode } = useOutletContext();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const { paged: pagedLogs, page, totalPages, setPage } = usePagination(logs);

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f4f4f7]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white/90 backdrop-blur-md',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-200',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/50' : 'shadow-xl shadow-gray-200/50',
  };

  const load = () => {
    setLoading(true);
    fetch('/api/admin/system-logs')
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setStats(d.stats || {}); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const typeColor = (type) => {
    if (type === 'success') return 'bg-green-500';
    if (type === 'warning') return 'bg-orange-500';
    if (type === 'error') return 'bg-red-500';
    return 'bg-blue-500';
  };

  return (
    <div className={`p-6 space-y-6 text-left relative min-h-screen transition-colors duration-500 ${theme.bg}`}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className={`${isDarkMode ? 'bg-[#161618]' : 'bg-white'} border ${theme.border} rounded-xl px-5 py-4 flex items-center gap-4 ${theme.shadow}`}>
            <div className="bg-[#c9a84c]/10 p-2 rounded-lg"><FileText size={18} className="text-[#c9a84c]" /></div>
            <p className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} pr-8`}>{toast}</p>
            <button onClick={() => setToast('')} className="text-gray-500 hover:text-[#c9a84c]"><X size={14} /></button>
          </div>
        </div>
      )}

      <div className={`flex justify-between items-end border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            System <span className="text-[#c9a84c]">Logs</span>
          </h1>
          <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest mt-1`}>
            All platform events and activity
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { load(); showToast('Logs refreshed.'); }}
            className={`flex items-center gap-2 px-4 py-2 bg-transparent border ${theme.border} rounded-lg text-[10px] font-black uppercase ${theme.textSub} hover:text-[#c9a84c] transition-all`}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => showToast('Logs exported.')}
            className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] rounded-lg text-[10px] font-black uppercase text-black hover:scale-105 transition-all shadow-lg shadow-[#c9a84c]/20">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Today', val: stats.totalToday ?? 0 },
          { label: 'Pending', val: stats.warnings ?? 0 },
          { label: 'Errors', val: stats.errors ?? 0 },
          { label: 'Auth Events', val: stats.authEvents ?? 0 },
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-2xl ${theme.card} border ${theme.border} ${theme.shadow} hover:border-[#c9a84c]/30 transition-all`}>
            <p className={`text-[9px] font-black uppercase ${theme.textSub} tracking-widest`}>{s.label}</p>
            <h2 className={`text-3xl font-black mt-2 ${theme.textMain} tabular-nums`}>{s.val}</h2>
          </div>
        ))}
      </div>

      <div className={`${theme.card} rounded-2xl border ${theme.border} ${theme.shadow} overflow-hidden`}>
        <div className={`p-4 border-b ${theme.border} flex justify-between items-center ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/50'}`}>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Activity Log</span>
          <span className={`text-[9px] font-bold ${theme.textSub}`}>{logs.length} entries</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className={`divide-y ${isDarkMode ? 'divide-white/[0.03]' : 'divide-gray-100'}`}>
            {pagedLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-6 px-6 py-4 hover:bg-[#c9a84c]/5 transition-colors group">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColor(log.type)}`} />
                <span className={`text-[10px] font-bold ${theme.textSub} w-36 tabular-nums shrink-0`}>
                  {log.time ? new Date(log.time).toLocaleString() : '—'}
                </span>
                <p className={`flex-1 text-[11px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} group-hover:text-[#c9a84c] transition-colors`}>
                  {log.event} — <span className={`${isDarkMode ? 'text-gray-600' : 'text-gray-400'} text-[9px] uppercase`}>{log.actor}</span>
                </p>
              </div>
            ))}
            {logs.length === 0 && (
              <div className={`px-6 py-10 text-center text-[11px] ${theme.textSub}`}>No logs found.</div>
            )}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} setPage={setPage} total={logs.length} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
