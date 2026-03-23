import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, Check, AlertTriangle, Loader2, LogIn, CheckCircle2, XCircle } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function TodayArrivals() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(null);
  const [msgs, setMsgs] = useState({});
  const [overdueCount, setOverdueCount] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    try {
      const [resRes, odRes] = await Promise.all([
        fetch(`/api/staff/reservations${qs}`),
        fetch(`/api/staff/overdue-count${qs}`),
      ]);
      const data = await resRes.json();
      const od = await odRes.json();
      if (resRes.ok) { setReservations(data.reservations || []); setStats(data.stats || {}); }
      if (odRes.ok) setOverdueCount(od.overdueCount || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 15000); return () => clearInterval(t); }, [fetchData]);

  const handleAutoCancel = async () => {
    setCancelling(true); setCancelResult(null);
    try {
      const res = await fetch('/api/staff/auto-cancel-overdue', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setCancelResult(data); fetchData(); }
    } catch { /* ignore */ }
    finally { setCancelling(false); }
  };

  const handleCheckIn = async (r) => {
    if (r.isDoubleBooked) {
      setMsgs(p => ({ ...p, [r.id]: { text: 'Double booking — resolve first.', type: 'error' } }));
      return;
    }
    setProcessing(r.id);
    try {
      const res = await fetch(`/api/staff/check-in/${r.id}`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        setMsgs(p => ({ ...p, [r.id]: { text: `Checked in ✓`, type: 'success' } }));
        fetchData();
      } else {
        setMsgs(p => ({ ...p, [r.id]: { text: data.error || 'Failed.', type: 'error' } }));
      }
    } catch {
      setMsgs(p => ({ ...p, [r.id]: { text: 'Server error.', type: 'error' } }));
    } finally { setProcessing(null); }
  };

  // Today's arrivals: check_in = today, status PENDING or CONFIRMED
  const todayArrivals = reservations.filter(r =>
    r.checkIn === today && ['PENDING', 'CONFIRMED'].includes(r.status)
  );

  const filtered = todayArrivals.filter(r => {
    const q = search.toLowerCase();
    return !q || r.guestName.toLowerCase().includes(q) || r.bookingNumber.toLowerCase().includes(q);
  });

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className={`p-8 min-h-screen ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#f8f9fa] text-zinc-900'}`}>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-4xl font-black italic uppercase tracking-tighter leading-none ${text}`}>
            Today's <span className="text-[#b3903c]">Arrivals</span>
          </h1>
          <p className={`text-[9px] font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2 ${sub}`}>
            <Clock size={12} className="text-[#b3903c]" />
            Live Updates · {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`relative flex items-center rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <Search size={15} className={`absolute left-4 ${sub}`} />
            <input type="text" placeholder="Search guest or ref..." value={search}
              onChange={e => setSearch(e.target.value)}
              className={`bg-transparent pl-11 pr-5 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none w-[240px] ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} />
          </div>
          <button onClick={() => navigate('/staff/all-reservations')}
            className="px-5 py-3.5 rounded-2xl border border-[#b3903c]/40 text-[#b3903c] text-[10px] font-black uppercase tracking-widest hover:bg-[#b3903c]/10 transition-all">
            All Reservations
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Expected Arrivals', val: todayArrivals.length,                                          icon: Calendar, color: 'text-blue-500' },
          { label: 'Pending Check-In',  val: todayArrivals.filter(r => r.status === 'PENDING').length,      icon: Clock,    color: 'text-[#b3903c]' },
          { label: 'Confirmed',         val: todayArrivals.filter(r => r.status === 'CONFIRMED').length,    icon: Check,    color: 'text-emerald-500' },
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border flex items-center justify-between ${card}`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${sub}`}>{s.label}</p>
              <h3 className={`text-3xl font-black italic tracking-tighter ${s.color}`}>{s.val}</h3>
            </div>
            <div className={`p-4 rounded-2xl bg-zinc-500/5 ${s.color}`}><s.icon size={22} /></div>
          </div>
        ))}
      </div>

      {/* DOUBLE BOOKING ALERT */}
      {todayArrivals.some(r => r.isDoubleBooked) && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-rose-500 shrink-0" />
          <p className="text-rose-400 text-[11px] font-bold">
            Double booking conflict detected in today's arrivals. Review before processing check-in.
          </p>
        </div>
      )}

      {/* OVERDUE NO-SHOW BANNER */}
      {overdueCount > 0 && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <XCircle size={18} className="text-rose-500 shrink-0" />
            <div>
              <p className="text-rose-500 font-black text-sm uppercase tracking-widest">No-Show / Overdue</p>
              <p className="text-rose-400 text-[11px] mt-0.5">
                {overdueCount} reservation{overdueCount > 1 ? 's' : ''} past check-in date — guest never arrived.
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoCancel}
            disabled={cancelling}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shrink-0"
          >
            {cancelling ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            Auto-Cancel
          </button>
        </div>
      )}

      {cancelResult && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-emerald-400 text-[11px] font-bold">{cancelResult.message}</p>
        </div>
      )}

      {/* ARRIVALS TABLE */}
      <div className={`rounded-[2.5rem] border overflow-hidden ${card}`}>
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-[#b3903c]" size={36} />
            <p className={`text-[10px] font-black uppercase tracking-widest italic ${sub}`}>Syncing with Innova Cloud...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 flex flex-col items-center text-center">
            <div className={`p-6 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
              <Calendar size={36} className={sub} strokeWidth={1} />
            </div>
            <h3 className={`text-lg font-black uppercase italic tracking-tighter ${text}`}>No Arrivals Today</h3>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${sub}`}>
              {search ? 'No match found.' : 'All guests have been processed or none scheduled.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                  {['Booking Ref', 'Guest Name', 'Room', 'Amount', 'Payment', 'Status', 'Action'].map(h => (
                    <th key={h} className={`px-8 py-5 text-left text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/30' : 'divide-zinc-100'}`}>
                {filtered.map(r => (
                  <tr key={r.id} className={`group transition-colors ${r.isDoubleBooked ? 'bg-rose-500/5' : ''} ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-[#b3903c]/5'}`}>
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-[#b3903c] tracking-tighter">{r.bookingNumber}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-[#b3903c] ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                          {r.firstName?.[0]}{r.lastName?.[0]}
                        </div>
                        <div>
                          <p className={`text-xs font-bold uppercase ${text}`}>{r.guestName}</p>
                          {r.isDoubleBooked && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase">
                              <AlertTriangle size={9} /> Double Booked
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className={`text-[11px] font-black ${text}`}>Room {r.roomNumber}</p>
                      <p className={`text-[9px] font-bold uppercase ${sub}`}>{r.roomName}</p>
                    </td>
                    <td className={`px-8 py-5 font-black text-xs ${text}`}>₱{parseInt(r.amount).toLocaleString()}</td>
                    <td className={`px-8 py-5 text-[10px] font-bold uppercase ${sub}`}>{r.paymentMethod}</td>
                    <td className="px-8 py-5">
                      <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${
                        r.status === 'CONFIRMED' ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/5' :
                                                   'border-amber-500/50 text-amber-500 bg-amber-500/5'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col items-start gap-1">
                        <button onClick={() => handleCheckIn(r)} disabled={processing === r.id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b3903c] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-[#b3903c]/10">
                          {processing === r.id ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} strokeWidth={3} />}
                          Process Check-In
                        </button>
                        {msgs[r.id] && (
                          <p className={`text-[9px] font-bold ${msgs[r.id].type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {msgs[r.id].text}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
