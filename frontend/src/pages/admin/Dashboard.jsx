import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, Hotel, Calendar, Banknote, Star, ArrowUpRight } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function Dashboard() {
  const { isDarkMode } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f0f0f3]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  const kpis = data?.kpis || {};
  const roomStatus = data?.roomStatus || [];
  const recentBookings = data?.recentBookings || [];
  const maxRooms = kpis.totalRooms || 1;
  const { paged: pagedBookings, page: bPage, totalPages: bTotal, setPage: setBPage } = usePagination(recentBookings);

  const statCards = [
    { label: 'Occupancy Rate', value: `${kpis.occupancyRate ?? 0}%`, change: `${kpis.occupiedRooms ?? 0} occupied`, icon: <Hotel size={20} />, color: 'text-green-500' },
    { label: "Check-ins Today", value: kpis.todayCheckins ?? 0, change: `${kpis.pendingReservations ?? 0} Pending`, icon: <Calendar size={20} />, color: 'text-[#c9a84c]' },
    { label: 'Total Revenue', value: `₱${((kpis.totalRevenue ?? 0) / 1000).toFixed(0)}k`, change: `${kpis.totalRooms ?? 0} rooms`, icon: <Banknote size={20} />, color: 'text-green-500' },
    { label: 'Total Customers', value: kpis.totalCustomers ?? 0, change: `${kpis.totalOwners ?? 0} owners`, icon: <Star size={20} />, color: 'text-[#c9a84c]' },
  ];

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
            System <span className="text-[#c9a84c]">Dashboard</span>
          </h1>
          <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest mt-1`}>
            Live data from database
          </p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${theme.border} ${theme.card} text-[10px] font-bold uppercase ${theme.textMain} hover:border-[#c9a84c] transition-all`}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} transition-all`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#c9a84c]`}>
              {stat.icon}
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>{stat.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${theme.textMain}`}>{stat.value}</h2>
            <p className={`text-[10px] font-bold uppercase mt-2 flex items-center gap-1 ${stat.color}`}>
              <ArrowUpRight size={12} strokeWidth={3} /> {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* ROOM STATUS + RECENT BOOKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`p-7 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Room Status</h3>
          </div>
          <div className="space-y-5">
            {roomStatus.map((s, i) => {
              const colors = ['bg-green-500', 'bg-red-500', 'bg-orange-500', 'bg-purple-500'];
              const texts = ['text-green-500', 'text-red-500', 'text-orange-500', 'text-purple-500'];
              return (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>{s.label}</span>
                    <span className={`text-[11px] font-black ${texts[i] || 'text-[#c9a84c]'}`}>{s.count}</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <div style={{ width: `${maxRooms ? (s.count / maxRooms) * 100 : 0}%` }} className={`h-full rounded-full ${colors[i] || 'bg-[#c9a84c]'} transition-all duration-1000`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`lg:col-span-2 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} overflow-hidden`}>
          <div className={`px-6 py-5 border-b ${theme.border} flex justify-between items-center ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/50'}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Recent Bookings</h3>
            <span className="text-[9px] font-black uppercase text-[#c9a84c]">Live</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} border-b ${theme.border}`}>
                  <th className="px-6 py-4">Guest</th>
                  <th className="px-6 py-4">Hotel</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.border}`}>
                {pagedBookings.map((row, i) => {
                  const statusColor = row.status === 'CONFIRMED' || row.status === 'COMPLETED' ? 'text-green-500 bg-green-500/10' :
                    row.status === 'CANCELLED' ? 'text-red-500 bg-red-500/10' : 'text-[#c9a84c] bg-[#c9a84c]/10';
                  return (
                    <tr key={i} className="hover:bg-[#c9a84c]/5 transition-colors">
                      <td className={`px-6 py-4 text-[11px] font-black ${theme.textMain}`}>{row.guestName}</td>
                      <td className="px-6 py-4 text-[10px] font-black text-[#c9a84c]">{row.hotelName}</td>
                      <td className={`px-6 py-4 text-[10px] font-bold ${theme.textMain}`}>₱{Number(row.amount).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${statusColor}`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {recentBookings.length === 0 && (
                  <tr><td colSpan={4} className={`px-6 py-8 text-center text-[11px] ${theme.textSub}`}>No bookings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={bPage} totalPages={bTotal} setPage={setBPage} total={recentBookings.length} isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  );
}
