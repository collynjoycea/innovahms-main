import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LayoutDashboard, RefreshCw, Users, BedDouble, TrendingUp, Banknote } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function StaffDashboard() {
  const { isDarkMode } = useOutletContext();
  const { qs, hotelName, firstName } = useStaffSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/dashboard${qs}`);
      const d = await res.json();
      if (res.ok) setData(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  const theme = {
    bg:   isDarkMode ? 'bg-[#080808]' : 'bg-[#f8f9fa]',
    card: isDarkMode ? 'bg-[#111] border-white/5 shadow-xl' : 'bg-white border-zinc-200 shadow-sm',
    text: isDarkMode ? 'text-white' : 'text-zinc-900',
    sub:  isDarkMode ? 'text-zinc-500' : 'text-zinc-400',
    div:  isDarkMode ? 'border-white/5' : 'border-zinc-200',
    watermark: isDarkMode ? 'text-white/[0.02]' : 'text-black/[0.02]',
  };

  const stats = [
    { label: 'Arrivals Today',  val: data?.arrivalsToday  ?? '--', icon: <TrendingUp size={20}/>,  color: 'text-[#b3903c]' },
    { label: 'Departures Today',val: data?.departuresToday ?? '--', icon: <BedDouble size={20}/>,   color: 'text-blue-500' },
    { label: 'In-House Guests', val: data?.inHouse         ?? '--', icon: <Users size={20}/>,       color: 'text-emerald-500' },
    { label: 'Pending Balance', val: data ? `₱${Number(data.pendingBalance).toLocaleString()}` : '--', icon: <Banknote size={20}/>, color: 'text-amber-500' },
  ];

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-500 overflow-hidden ${theme.bg}`}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <h1 className={`text-[15vw] font-black uppercase tracking-[0.1em] italic ${theme.watermark}`}>Dashboard</h1>
      </div>

      <div className="relative z-10 p-8 space-y-8">
        <div className={`flex justify-between items-end border-b pb-6 ${theme.div}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#b3903c]/10 border border-[#b3903c]/20">
                <LayoutDashboard size={20} color="#b3903c" />
              </div>
              <h1 className={`text-3xl font-black uppercase tracking-tighter italic ${theme.text}`}>
                Hotel <span className="text-[#b3903c]">Manager</span>
              </h1>
            </div>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ml-12 ${theme.sub}`}>
              {hotelName || 'Innova HMS'} · {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={fetchData} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className={`p-8 rounded-[2rem] border ${theme.card} relative overflow-hidden group`}>
              <div className="relative z-10 text-left">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'} ${s.color}`}>{s.icon}</div>
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${theme.sub}`}>{s.label}</p>
                <h3 className={`text-4xl font-black tracking-tighter ${theme.text}`}>{loading ? '---' : s.val}</h3>
              </div>
              <div className={`absolute -right-4 -bottom-4 opacity-[0.03] ${s.color} group-hover:scale-110 transition-transform`}>
                {React.cloneElement(s.icon, { size: 100 })}
              </div>
            </div>
          ))}
        </div>

        {/* Today's Arrivals */}
        <div className={`rounded-[2.5rem] border ${theme.card} p-2`}>
          <div className="px-8 py-6 flex justify-between items-center">
            <h3 className={`text-[11px] font-black uppercase tracking-widest ${theme.text}`}>Today's Arrival Queue</h3>
            <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
          </div>
          {loading ? (
            <div className={`px-8 py-10 text-center text-[10px] font-bold uppercase tracking-widest animate-pulse ${theme.sub}`}>Syncing...</div>
          ) : (data?.arrivals || []).length === 0 ? (
            <div className={`px-8 py-10 text-center text-[10px] font-bold uppercase tracking-widest italic ${theme.sub}`}>No arrivals today</div>
          ) : (
            <table className="w-full">
              <tbody className={`divide-y ${theme.div}`}>
                {(data?.arrivals || []).map(r => (
                  <tr key={r.id} className="hover:bg-[#b3903c]/5 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#b3903c] flex items-center justify-center text-black font-black text-sm">{r.roomNumber}</div>
                        <div>
                          <p className={`text-[13px] font-black ${theme.text}`}>{r.guestName}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-tighter ${theme.sub}`}>{r.roomName} · {r.bookingNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${r.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
