import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Calendar, Clock, AlertTriangle, RefreshCw, ChevronDown, X } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const STATUS_STYLES = {
  PENDING:     'bg-amber-500/10 text-amber-500 border-amber-500/20',
  CONFIRMED:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  CHECKED_IN:  'bg-blue-500/10 text-blue-500 border-blue-500/20',
  CHECKED_OUT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  CANCELLED:   'bg-red-500/10 text-red-500 border-red-500/20',
  FAILED:      'bg-red-500/10 text-red-400 border-red-500/20',
};

// Quick date tabs
const DATE_TABS = [
  { key: 'all',      label: 'All Dates' },
  { key: 'today',    label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past',     label: 'Past' },
];

export default function AllReservation() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch(`/api/staff/reservations${qs}`);
      const data = await res.json();
      if (res.ok) { setReservations(data.reservations || []); setStats(data.stats || {}); }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); const t = setInterval(() => fetchData(true), 30000); return () => clearInterval(t); }, [fetchData]);

  // Clickable stat card sets both status + date filter
  const handleStatClick = (key) => {
    if (key === 'total')        { setStatusFilter('all');        setDateFilter('all'); }
    else if (key === 'pending') { setStatusFilter('PENDING');    setDateFilter('all'); }
    else if (key === 'confirmed'){ setStatusFilter('CONFIRMED'); setDateFilter('all'); }
    else if (key === 'checkedIn'){ setStatusFilter('CHECKED_IN');setDateFilter('all'); }
    else if (key === 'cancelled'){ setStatusFilter('CANCELLED'); setDateFilter('all'); }
    else if (key === 'arrivalsToday') { setStatusFilter('all'); setDateFilter('today'); }
    else if (key === 'doubleBooked')  { setStatusFilter('all'); setDateFilter('all'); setSearch(''); }
  };

  const filtered = reservations.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.guestName.toLowerCase().includes(q) ||
      r.bookingNumber.toLowerCase().includes(q) ||
      (r.roomNumber || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    let matchDate = true;
    if (dateFilter === 'today')    matchDate = r.checkIn === today;
    if (dateFilter === 'upcoming') matchDate = r.checkIn > today;
    if (dateFilter === 'past')     matchDate = r.checkIn < today;
    return matchSearch && matchStatus && matchDate;
  });

  const doubleBooked = reservations.filter(r => r.isDoubleBooked);
  const isFiltered = statusFilter !== 'all' || dateFilter !== 'all' || search !== '';

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
  const inputCls = `outline-none text-[11px] font-bold bg-transparent ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`;
  const selectCls = `appearance-none pl-4 pr-8 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`;

  const STAT_CARDS = [
    { key: 'total',        label: 'Total',          val: stats.total        || 0, color: text,                activeColor: 'ring-2 ring-[#b3903c]' },
    { key: 'pending',      label: 'Pending',        val: stats.pending      || 0, color: 'text-amber-500',   activeColor: 'ring-2 ring-amber-500' },
    { key: 'confirmed',    label: 'Confirmed',      val: stats.confirmed    || 0, color: 'text-emerald-500', activeColor: 'ring-2 ring-emerald-500' },
    { key: 'checkedIn',    label: 'Checked In',     val: stats.checkedIn    || 0, color: 'text-blue-500',    activeColor: 'ring-2 ring-blue-500' },
    { key: 'cancelled',    label: 'Cancelled',      val: stats.cancelled    || 0, color: 'text-red-500',     activeColor: 'ring-2 ring-red-500' },
    { key: 'arrivalsToday',label: 'Arrivals Today', val: stats.arrivalsToday|| 0, color: 'text-[#b3903c]',  activeColor: 'ring-2 ring-[#b3903c]' },
    { key: 'doubleBooked', label: 'Double Booked',  val: stats.doubleBooked || 0, color: 'text-rose-500',    activeColor: 'ring-2 ring-rose-500' },
  ];

  const isCardActive = (key) => {
    if (key === 'total')         return statusFilter === 'all' && dateFilter === 'all';
    if (key === 'pending')       return statusFilter === 'PENDING';
    if (key === 'confirmed')     return statusFilter === 'CONFIRMED';
    if (key === 'checkedIn')     return statusFilter === 'CHECKED_IN';
    if (key === 'cancelled')     return statusFilter === 'CANCELLED';
    if (key === 'arrivalsToday') return dateFilter === 'today';
    return false;
  };

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#f8f9fa] text-zinc-900'}`}>

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
            Master <span className="text-[#b3903c]">Reservations</span>
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-[0.4em] mt-2 flex items-center gap-2 ${sub}`}>
            <span className="w-5 h-[1px] bg-[#b3903c]" /> Live Database Feed · {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFiltered && (
            <button onClick={() => { setStatusFilter('all'); setDateFilter('all'); setSearch(''); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-500/30 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-rose-500 hover:border-rose-500/30 transition-all">
              <X size={12} /> Clear Filters
            </button>
          )}
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b3903c] text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* CLICKABLE STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {STAT_CARDS.map(s => (
          <button key={s.key} onClick={() => handleStatClick(s.key)}
            className={`rounded-2xl border p-4 text-center transition-all hover:scale-[1.03] active:scale-95 ${card} ${isCardActive(s.key) ? s.activeColor : 'hover:border-[#b3903c]/40'}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${sub}`}>{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
          </button>
        ))}
      </div>

      {/* DOUBLE BOOKING ALERT */}
      {doubleBooked.length > 0 && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-rose-500 font-black text-sm uppercase tracking-widest">Double Booking Detected</p>
            <p className="text-rose-400 text-[11px] mt-1">
              {doubleBooked.map(r => `${r.bookingNumber} (Room ${r.roomNumber})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* DATE QUICK TABS + FILTERS */}
      <div className={`flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl border ${card}`}>
        {/* Quick date tabs */}
        <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
          {DATE_TABS.map(t => (
            <button key={t.key} onClick={() => setDateFilter(t.key)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                dateFilter === t.key ? 'bg-[#b3903c] text-black shadow' : `${sub} hover:text-[#b3903c]`
              }`}>
              {t.key === 'today' ? `Today (${stats.arrivalsToday || 0})` : t.label}
            </button>
          ))}
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${sub}`} />
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border flex-1 min-w-[180px] ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <Search size={14} className={sub} />
          <input type="text" placeholder="Search guest, ref, room..." value={search}
            onChange={e => setSearch(e.target.value)} className={inputCls} />
          {search && (
            <button onClick={() => setSearch('')} className={`${sub} hover:text-rose-500 transition-all`}><X size={12} /></button>
          )}
        </div>

        <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${sub}`}>{filtered.length} records</span>
      </div>

      {/* TABLE */}
      <div className={`rounded-[2rem] border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                <th className="px-6 py-5">Guest / Ref</th>
                <th className="px-6 py-5">Room</th>
                <th className="px-6 py-5">Check-In</th>
                <th className="px-6 py-5">Arrival Time</th>
                <th className="px-6 py-5">Check-Out</th>
                <th className="px-6 py-5">Nights</th>
                <th className="px-6 py-5">Amount</th>
                <th className="px-6 py-5">Payment</th>
                <th className="px-6 py-5">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/30' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr><td colSpan="9" className="p-16 text-center text-[#b3903c] font-black text-xs uppercase tracking-widest animate-pulse">Fetching records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-16 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Calendar size={36} />
                      <p className={`text-[10px] font-bold uppercase tracking-widest italic ${sub}`}>
                        {isFiltered ? 'No records match your filters.' : 'No reservations found.'}
                      </p>
                      {isFiltered && (
                        <button onClick={() => { setStatusFilter('all'); setDateFilter('all'); setSearch(''); }}
                          className="text-[#b3903c] text-[10px] font-black uppercase tracking-widest underline underline-offset-2">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className={`group transition-all ${r.isDoubleBooked ? 'bg-rose-500/5' : ''} ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50/60'}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      {r.isDoubleBooked && <AlertTriangle size={14} className="text-rose-500 shrink-0" />}
                      <div>
                        <p className="text-[11px] font-black text-[#b3903c]">{r.bookingNumber}</p>
                        <p className={`text-[12px] font-black uppercase tracking-tight ${text}`}>{r.guestName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.isArrivalToday && (
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">Arriving Today</span>
                          )}
                          {r.checkOut === today && r.status === 'CHECKED_IN' && (
                            <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-full">Due Out Today</span>
                          )}
                          {r.checkOut < today && r.status === 'CHECKED_IN' && (
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded-full">Overdue</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className={`text-[11px] font-black ${text}`}>Room {r.roomNumber}</p>
                    <p className={`text-[9px] font-bold uppercase ${sub}`}>{r.roomName}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${text}`}>
                      <Calendar size={11} className="text-[#b3903c]" />{r.checkIn || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${r.checkInTime ? 'text-[#b3903c]' : sub}`}>
                      <Clock size={11} className="text-[#b3903c]" />
                      {r.checkInTime || '—'}
                    </div>
                    {r.checkOutTime && (
                      <div className={`flex items-center gap-1.5 text-[9px] font-bold mt-0.5 ${sub}`}>
                        <Clock size={9} /> out {r.checkOutTime}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${r.checkOut < today && r.status === 'CHECKED_IN' ? 'text-red-500' : text}`}>
                      <Clock size={11} className={r.checkOut < today && r.status === 'CHECKED_IN' ? 'text-red-500' : 'text-zinc-400'} />{r.checkOut || '—'}
                    </div>
                  </td>
                  <td className={`px-6 py-5 text-[11px] font-black ${text}`}>{r.nights}n</td>
                  <td className={`px-6 py-5 text-[11px] font-black ${text}`}>₱{Number(r.amount).toLocaleString()}</td>
                  <td className={`px-6 py-5 text-[10px] font-bold uppercase ${sub}`}>{r.paymentMethod}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest border ${STATUS_STYLES[r.status] || STATUS_STYLES.PENDING}`}>
                      {r.status}
                    </span>
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
