import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, Users, DollarSign, Building2, Download } from 'lucide-react';

export default function Analytics() {
  const { isDarkMode } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f0f0f3]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  useEffect(() => {
    fetch('/api/admin/reports')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const kpis = data?.kpis || {};
  const chart = data?.revenueChart || { labels: [], values: [] };
  const maxVal = Math.max(...chart.values, 1);

  if (loading) return (
    <div className={`p-6 min-h-screen flex items-center justify-center ${theme.bg}`}>
      <div className="w-10 h-10 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={`p-6 space-y-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Reports & <span className="text-[#c9a84c]">Analytics</span>
          </h1>
          <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest mt-1`}>
            Live platform performance
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#c9a84c] text-black font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all">
          <Download size={16} strokeWidth={3} /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Hotel Partners', value: kpis.totalPartners ?? 0, icon: <Building2 size={20} /> },
          { label: 'Platform Revenue', value: `₱${((kpis.totalRevenue ?? 0) / 1000).toFixed(0)}k`, icon: <DollarSign size={20} /> },
          { label: 'Total Reservations', value: kpis.totalReservations ?? 0, icon: <TrendingUp size={20} /> },
          { label: 'Total Customers', value: kpis.totalCustomers ?? 0, icon: <Users size={20} /> },
        ].map((kpi, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} group transition-all`}>
            <div className={`p-2.5 rounded-xl border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#c9a84c] inline-block mb-4`}>{kpi.icon}</div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>{kpi.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${theme.textMain}`}>{kpi.value}</h2>
          </div>
        ))}
      </div>

      <div className={`p-7 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}>
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Monthly Revenue</h3>
          </div>
          <span className={`text-[9px] font-bold ${theme.textSub} uppercase`}>Last 6 months</span>
        </div>

        {chart.labels.length > 0 ? (
          <div className="h-56 flex items-end justify-between gap-3 px-2">
            {chart.labels.map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group cursor-pointer">
                <div
                  style={{ height: `${(chart.values[i] / maxVal) * 100}%` }}
                  className={`w-full max-w-[45px] rounded-t-lg transition-all relative ${isDarkMode ? 'bg-[#c9a84c]/60 group-hover:bg-[#c9a84c]' : 'bg-[#c9a84c]'}`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-black whitespace-nowrap">
                    ₱{Number(chart.values[i]).toLocaleString()}
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={`h-56 flex items-center justify-center text-[11px] ${theme.textSub}`}>
            No revenue data yet.
          </div>
        )}
      </div>
    </div>
  );
}
