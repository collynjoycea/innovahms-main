import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Banknote, AlertCircle, Star, Sparkles, Users, RefreshCw, LogIn } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function StaffDashboard() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(null);

  const staffUser = (() => { try { return JSON.parse(localStorage.getItem('staffUser') || '{}'); } catch { return {}; } })();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/dashboard${qs}`);
      const d = await res.json();
      if (res.ok) setData(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  const handleCheckIn = async (id) => {
    setCheckingIn(id);
    try {
      const res = await fetch(`/api/staff/check-in/${id}`, { method: 'PUT' });
      if (res.ok) fetchData();
    } catch { /* ignore */ }
    finally { setCheckingIn(null); }
  };

  const theme = useMemo(() => ({
    bg:   isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f4f4f7]',
    card: isDarkMode ? 'bg-[#111111] border-white/5 shadow-xl' : 'bg-white border-gray-200 shadow-sm',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    sub:  isDarkMode ? 'text-zinc-500' : 'text-gray-500',
    div:  isDarkMode ? 'border-white/5' : 'border-gray-200',
  }), [isDarkMode]);

  const stats = [
    { label: 'Expected Arrivals',  val: data?.arrivalsToday  ?? '--', sub: 'Check-in ready',    icon: <ArrowDownRight size={20}/> },
    { label: 'Departures Today',   val: data?.departuresToday ?? '--', sub: 'Pending check-out', icon: <ArrowUpRight size={20}/> },
    { label: 'Available Rooms',    val: data?.availableRooms  ?? '--', sub: 'Ready for guests',  icon: <CheckCircle2 size={20}/> },
    { label: 'Unpaid Balance',     val: data ? `₱${Number(data.pendingBalance).toLocaleString()}` : '--', sub: 'Total receivables', icon: <Banknote size={20}/> },
  ];

  return (
    <div className={`p-8 space-y-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.div}`}>
        <div className="text-left">
          <h1 className={`text-4xl font-black uppercase tracking-tighter ${theme.text}`}>
            Innova <span className="text-[#b3903c]">Ops</span>
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-[0.4em] mt-2 ${theme.sub}`}>
            {staffUser?.firstName ? `Logged in: ${staffUser.firstName}` : 'Front Desk'} · {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/staff/new-reservation')} className="px-8 py-4 rounded-2xl bg-[#b3903c] text-black text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#b3903c]/20">
            + New Booking
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className={`p-8 rounded-[2rem] border ${theme.card} relative overflow-hidden group`}>
            <div className="relative z-10 text-left">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'} text-[#b3903c]`}>{s.icon}</div>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${theme.sub}`}>{s.label}</p>
              <h3 className={`text-4xl font-black tracking-tighter ${theme.text}`}>{loading ? '---' : s.val}</h3>
              <p className={`text-[9px] mt-1 ${theme.sub}`}>{s.sub}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-[#b3903c] group-hover:scale-110 transition-transform">
              {React.cloneElement(s.icon, { size: 100 })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* ARRIVALS TABLE */}
        <div className={`lg:col-span-2 rounded-[2.5rem] border ${theme.card} p-2`}>
          <div className="px-8 py-6 flex justify-between items-center">
            <h3 className={`text-[11px] font-black uppercase tracking-widest ${theme.text}`}>Today's Arrival Queue</h3>
            <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
          </div>
          {loading ? (
            <div className="px-8 py-10 text-center text-[#b3903c] font-black text-xs uppercase tracking-widest animate-pulse">Syncing...</div>
          ) : (data?.arrivals || []).length === 0 ? (
            <div className={`px-8 py-10 text-center text-[10px] font-bold uppercase tracking-widest italic ${theme.sub}`}>No arrivals today</div>
          ) : (
            <table className="w-full">
              <tbody className={`divide-y ${theme.div}`}>
                {(data?.arrivals || []).map(r => (
                  <tr key={r.id} className="group hover:bg-[#b3903c]/5 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-[#b3903c] flex items-center justify-center text-black font-black text-sm">
                          {r.roomNumber}
                        </div>
                        <div>
                          <p className={`text-[13px] font-black ${theme.text}`}>{r.guestName}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-tighter ${theme.sub}`}>{r.roomName} · {r.bookingNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className={`mr-3 px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${r.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{r.status}</span>
                      <button onClick={() => handleCheckIn(r.id)} disabled={checkingIn === r.id}
                        className="px-5 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 inline-flex items-center gap-1">
                        <LogIn size={12} /> Check In
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PRIORITY + OCCUPANCY */}
        <div className="space-y-8">
          <div className={`p-8 rounded-[2.5rem] border ${theme.card}`}>
            <h3 className={`text-[11px] font-black uppercase tracking-widest mb-8 text-left ${theme.text}`}>Priority Intel</h3>
            <div className="space-y-4">
              {[
                { dot: 'bg-purple-500', text: data?.arrivalsToday > 0 ? `${data.arrivalsToday} guest(s) arriving today` : 'No arrivals today' },
                { dot: 'bg-red-500',    text: data ? `Collect ₱${Number(data.pendingBalance).toLocaleString()} balance` : 'Loading...' },
                { dot: 'bg-green-500',  text: `${data?.inHouse ?? 0} guest(s) currently in-house` },
              ].map((log, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl ${theme.div} border bg-white/[0.02]`}>
                  <div className={`w-2 h-2 rounded-full ${log.dot} shrink-0`} />
                  <p className={`text-[11px] font-bold text-left truncate ${theme.text}`}>{log.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-[#b3903c] text-black">
            <div className="flex justify-between items-start mb-10">
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Occupancy Rate</p>
                <h4 className="text-5xl font-black tracking-tighter">
                  {data && data.availableRooms !== undefined
                    ? `${Math.round(((data.inHouse || 0) / Math.max((data.inHouse || 0) + (data.availableRooms || 1), 1)) * 100)}%`
                    : '--'}
                </h4>
              </div>
              <Users size={32} />
            </div>
            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
              <div className="h-full bg-black rounded-full transition-all"
                style={{ width: data ? `${Math.round(((data.inHouse || 0) / Math.max((data.inHouse || 0) + (data.availableRooms || 1), 1)) * 100)}%` : '0%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
