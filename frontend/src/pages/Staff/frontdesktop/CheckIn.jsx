import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, LogIn, CheckCircle2, AlertCircle, AlertTriangle, Clock, RefreshCw, Loader2, Filter, XCircle } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const TABS = ['ALL', 'TODAY', 'PAST'];

export default function CheckIn() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('TODAY');
  const [processing, setProcessing] = useState(null);
  const [msg, setMsg] = useState({ id: null, text: '', type: '' });
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);
  const [overdueCount, setOverdueCount] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    try {
      const [resRes, overdueRes] = await Promise.all([
        fetch(`/api/staff/reservations${qs}`),
        fetch(`/api/staff/overdue-count${qs}`),
      ]);
      const data = await resRes.json();
      const od = await overdueRes.json();
      if (resRes.ok) { setReservations(data.reservations || []); setStats(data.stats || {}); }
      if (overdueRes.ok) setOverdueCount(od.overdueCount || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 20000); return () => clearInterval(t); }, [fetchData]);

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
      setMsg({ id: r.id, text: 'Double booking detected — resolve conflict before check-in.', type: 'error' });
      return;
    }
    setProcessing(r.id);
    setMsg({ id: null, text: '', type: '' });
    try {
      const res = await fetch(`/api/staff/check-in/${r.id}`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        setMsg({ id: r.id, text: `✓ ${r.guestName} checked in — ${data.bookingNumber}`, type: 'success' });
        fetchData();
      } else {
        setMsg({ id: r.id, text: data.error || 'Check-in failed.', type: 'error' });
      }
    } catch {
      setMsg({ id: r.id, text: 'Server error.', type: 'error' });
    } finally {
      setProcessing(null);
    }
  };

  // Filter: TODAY = check_in today + PENDING or CONFIRMED
  //         PAST  = check_in < today + PENDING or CONFIRMED (late arrivals)
  //         ALL   = CONFIRMED + CHECKED_IN + PENDING
  const display = reservations.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.guestName.toLowerCase().includes(q) || r.bookingNumber.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeTab === 'TODAY') return r.checkIn === today && ['PENDING', 'CONFIRMED'].includes(r.status);
    if (activeTab === 'PAST')  return r.checkIn < today  && ['PENDING', 'CONFIRMED'].includes(r.status);
    return ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(r.status);
  });

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className={`p-8 min-h-screen ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#f8f9fa] text-zinc-900'}`}>

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-4xl font-black italic uppercase tracking-tighter leading-none ${text}`}>
            Arrivals <span className="text-[#b3903c]">Manager</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-[#b3903c] animate-pulse" />
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${sub}`}>
              Real-time Front Desk · {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <Search size={15} className={sub} />
            <input type="text" placeholder="Search guest or ref..." value={search}
              onChange={e => setSearch(e.target.value)}
              className={`bg-transparent outline-none text-xs font-bold w-52 ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} />
          </div>
          <button onClick={fetchData} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Arrivals Today', val: stats.arrivalsToday || 0, color: 'text-[#b3903c]' },
          { label: 'Checked In',     val: stats.checkedIn    || 0, color: 'text-blue-500' },
          { label: 'Pending',        val: stats.pending      || 0, color: 'text-amber-500' },
          { label: 'Double Booked',  val: stats.doubleBooked || 0, color: 'text-rose-500' },
        ].map(s => (
          <div key={s.label} className={`rounded-[2rem] border p-6 flex items-center justify-between ${card}`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${sub}`}>{s.label}</p>
              <p className={`text-3xl font-black italic tracking-tighter ${s.color}`}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* OVERDUE AUTO-CANCEL BANNER */}
      {overdueCount > 0 && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <XCircle size={18} className="text-rose-500 shrink-0" />
            <div>
              <p className="text-rose-500 font-black text-sm uppercase tracking-widest">No-Show Alert</p>
              <p className="text-rose-400 text-[11px] mt-0.5">
                {overdueCount} reservation{overdueCount > 1 ? 's' : ''} past check-in date with no arrival recorded.
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoCancel}
            disabled={cancelling}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shrink-0"
          >
            {cancelling ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            Auto-Cancel All
          </button>
        </div>
      )}

      {cancelResult && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-emerald-400 text-[11px] font-bold">
            {cancelResult.message}
            {cancelResult.cancelled?.length > 0 && ` — ${cancelResult.cancelled.map(c => c.bookingNumber).join(', ')}`}
          </p>
        </div>
      )}

      {/* TABS */}
      <div className={`flex p-1.5 rounded-2xl border w-fit mb-6 ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-[#b3903c] text-black shadow-lg shadow-[#b3903c]/20' : `${sub} hover:text-[#b3903c]`
            }`}>
            {tab === 'TODAY' ? `Today (${stats.arrivalsToday || 0})` : tab}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className={`rounded-[2.5rem] border overflow-hidden ${card}`}>
        <div className={`px-8 py-5 border-b flex items-center justify-between ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-100'}`}>
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-widest ${text}`}>{activeTab} Queue</h2>
          </div>
          <span className="text-xs font-black text-[#b3903c] bg-[#b3903c]/10 px-4 py-1.5 rounded-full border border-[#b3903c]/20">
            {display.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-zinc-800/50 text-zinc-500' : 'border-zinc-100 text-zinc-400'}`}>
                <th className="px-8 py-5">Guest</th>
                <th className="px-8 py-5">Booking Ref</th>
                <th className="px-8 py-5">Room</th>
                <th className="px-8 py-5">Check-In Date</th>
                <th className="px-8 py-5">Arrival Time</th>
                <th className="px-8 py-5">Nights / Amount</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/30' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr><td colSpan="8" className="p-16 text-center text-[#b3903c] font-black text-xs uppercase tracking-widest animate-pulse">Syncing with HMS Database...</td></tr>
              ) : display.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <AlertCircle size={36} className="mb-3 text-[#b3903c]" />
                      <p className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>No records in queue</p>
                    </div>
                  </td>
                </tr>
              ) : display.map(r => (
                <tr key={r.id} className={`group transition-all ${r.isDoubleBooked ? 'bg-rose-500/5' : ''} ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50/50'}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#b3903c]/10 border border-[#b3903c]/20 flex items-center justify-center text-[#b3903c] font-black text-sm">
                        {r.firstName?.[0]}{r.lastName?.[0]}
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase ${text}`}>{r.guestName}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-tighter ${sub}`}>{r.guestContact || 'No contact'}</p>
                      </div>
                      {r.isDoubleBooked && <AlertTriangle size={14} className="text-rose-500" title="Double booking!" />}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[11px] font-black font-mono tracking-widest text-[#b3903c]">{r.bookingNumber}</p>
                    <p className={`text-[9px] font-bold uppercase italic ${sub}`}>{r.paymentMethod}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className={`text-[11px] font-black ${text}`}>Room {r.roomNumber}</p>
                    <p className={`text-[9px] font-bold uppercase ${sub}`}>{r.roomName}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${text}`}>
                      <Clock size={11} className="text-zinc-400" />{r.checkIn}
                    </div>
                    {r.isArrivalToday && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Today</span>}
                    {r.checkIn < today && <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Overdue</span>}
                  </td>
                  <td className="px-8 py-5">
                    <div className={`flex items-center gap-1.5 font-black ${r.checkInTime ? 'text-[#b3903c] text-sm' : `text-[11px] ${sub}`}`}>
                      <Clock size={12} className="text-[#b3903c] shrink-0" />
                      {r.checkInTime || '—'}
                    </div>
                    {r.checkOutTime && (
                      <div className={`text-[9px] font-bold mt-0.5 ${sub}`}>out {r.checkOutTime}</div>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <p className={`text-[11px] font-black ${text}`}>₱{Number(r.amount).toLocaleString()}</p>
                    <p className={`text-[9px] font-bold ${sub}`}>{r.nights} night{r.nights !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      r.status === 'CHECKED_IN' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      r.status === 'CONFIRMED'  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                  'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {r.status === 'CHECKED_IN' ? (
                      <div className="flex items-center justify-end gap-2 text-emerald-500 opacity-60">
                        <CheckCircle2 size={15} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <button onClick={() => handleCheckIn(r)} disabled={processing === r.id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b3903c] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-[#b3903c]/10">
                          {processing === r.id ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} strokeWidth={3} />}
                          Check In
                        </button>
                        {msg.id === r.id && (
                          <p className={`text-[9px] font-bold ${msg.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{msg.text}</p>
                        )}
                      </div>
                    )}
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
