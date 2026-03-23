import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LayoutGrid, ShieldCheck, Zap, AlertCircle, Crown, RefreshCw, Trash2, AlertTriangle, Loader2, X, CheckCircle2 } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const STATUS_STYLES = {
  available:   { color: 'text-emerald-500', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5',  dot: 'bg-emerald-500' },
  occupied:    { color: 'text-red-500',     border: 'border-red-500/30',     bg: 'bg-red-500/5',      dot: 'bg-red-500' },
  cleaning:    { color: 'text-orange-500',  border: 'border-orange-500/30',  bg: 'bg-orange-500/5',   dot: 'bg-orange-500' },
  maintenance: { color: 'text-purple-500',  border: 'border-purple-500/30',  bg: 'bg-purple-500/5',   dot: 'bg-purple-500' },
  reserved:    { color: 'text-blue-500',    border: 'border-blue-500/30',    bg: 'bg-blue-500/5',     dot: 'bg-blue-500' },
};
const getStyle = (s) => STATUS_STYLES[(s || '').toLowerCase()] || STATUS_STYLES.available;

export default function RoomMapAssign() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [rooms, setRooms] = useState([]);
  const [doubleBooked, setDoubleBooked] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [delMsg, setDelMsg] = useState({ id: null, text: '', type: '' });
  const [floorFilter, setFloorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/room-map${qs}`);
      const data = await res.json();
      if (res.ok) { setRooms(data.rooms || []); setCounts(data.counts || {}); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchDoubleBooked = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/reservations${qs}`);
      const data = await res.json();
      if (res.ok) setDoubleBooked((data.reservations || []).filter(r => r.isDoubleBooked));
    } catch { /* ignore */ }
    finally { setDbLoading(false); }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchDoubleBooked();
    const t = setInterval(() => { fetchRooms(); fetchDoubleBooked(); }, 30000);
    return () => clearInterval(t);
  }, [fetchRooms, fetchDoubleBooked]);

  const handleDeleteDoubleBooked = async (r) => {
    setDeleting(r.id);
    setDelMsg({ id: null, text: '', type: '' });
    try {
      const res = await fetch(`/api/staff/reservations/${r.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setDelMsg({ id: r.id, text: data.message, type: 'success' });
        fetchDoubleBooked();
        fetchRooms();
      } else {
        setDelMsg({ id: r.id, text: data.error || 'Delete failed.', type: 'error' });
      }
    } catch {
      setDelMsg({ id: r.id, text: 'Server error.', type: 'error' });
    } finally { setDeleting(null); }
  };

  // Extract unique floors from room numbers
  const floors = ['All', ...Array.from(new Set(rooms.map(r => r.roomNumber?.toString()[0]).filter(Boolean))).sort()];

  const filteredRooms = rooms.filter(r => {
    const matchFloor = floorFilter === 'All' || r.roomNumber?.toString().startsWith(floorFilter);
    const matchStatus = statusFilter === 'All' || r.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchFloor && matchStatus;
  });

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className={`p-8 min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-4xl font-black italic uppercase tracking-tighter ${text}`}>
            Room Map & <span className="text-[#b3903c]">Smart Assignment</span>
          </h1>
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic ${sub}`}>
            {rooms.length} rooms · {counts.available || 0} available
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={floorFilter} onChange={e => setFloorFilter(e.target.value)}
            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}>
            {floors.map(f => <option key={f} value={f}>{f === 'All' ? 'All Floors' : `Floor ${f}`}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}>
            {['All','Available','Occupied','Cleaning','Maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => { fetchRooms(); fetchDoubleBooked(); }}
            className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-[#b3903c]' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'} transition-all`}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ROOM MAP */}
        <div className={`lg:col-span-7 p-8 rounded-[2.5rem] border ${card}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <h2 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${text}`}>
              <LayoutGrid size={18} className="text-[#b3903c]" /> Live Room Map
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(STATUS_STYLES).map(([s, st]) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span className={`text-[8px] font-black uppercase tracking-tighter ${sub}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {loading ? (
              <div className="col-span-full py-20 text-center">
                <Loader2 size={32} className="animate-spin text-[#b3903c] mx-auto" />
              </div>
            ) : filteredRooms.map(room => {
              const st = getStyle(room.status);
              const isVIP = ['suite','presidential','deluxe'].some(t => room.roomType?.toLowerCase().includes(t));
              return (
                <div key={room.id} className={`relative p-4 rounded-2xl border transition-all hover:scale-105 cursor-pointer group ${st.border} ${isDarkMode ? st.bg : 'bg-white'}`}>
                  {isVIP && <Crown size={11} className="absolute top-2 right-2 text-orange-400 group-hover:animate-bounce" />}
                  <p className={`text-xl font-black text-center mb-0.5 ${text}`}>{room.roomNumber}</p>
                  <p className={`text-[7px] font-bold text-center uppercase tracking-tighter mb-1.5 ${sub}`}>{room.roomType}</p>
                  <div className={`text-[7px] font-black text-center uppercase tracking-[0.15em] py-1 rounded-lg ${st.color} ${isDarkMode ? 'bg-white/5' : 'bg-zinc-100'}`}>
                    {room.status}
                  </div>
                </div>
              );
            })}
            {!loading && filteredRooms.length === 0 && (
              <div className={`col-span-full py-10 text-center text-[10px] font-bold uppercase tracking-widest italic ${sub}`}>No rooms match filter.</div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* DOUBLE BOOKING MANAGER */}
          <div className={`p-8 rounded-[2.5rem] border ${card}`}>
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-5 text-rose-500">
              <AlertTriangle size={18} /> Double Booking Manager
            </h2>
            {dbLoading ? (
              <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-[#b3903c]" /></div>
            ) : doubleBooked.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <p className="text-emerald-500 text-[11px] font-bold">No double bookings detected.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {doubleBooked.map(r => (
                  <div key={r.id} className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-black text-rose-400">{r.bookingNumber}</p>
                        <p className={`text-xs font-black uppercase ${text}`}>{r.guestName}</p>
                        <p className={`text-[9px] ${sub}`}>Room {r.roomNumber} · {r.checkIn} → {r.checkOut}</p>
                        <p className={`text-[9px] font-bold ${sub}`}>{r.status}</p>
                      </div>
                      <button onClick={() => handleDeleteDoubleBooked(r)} disabled={deleting === r.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shrink-0">
                        {deleting === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Delete
                      </button>
                    </div>
                    {delMsg.id === r.id && (
                      <p className={`mt-2 text-[9px] font-bold ${delMsg.type === 'success' ? 'text-emerald-500' : 'text-rose-400'}`}>{delMsg.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI RULES */}
          <div className={`p-8 rounded-[2.5rem] border ${card}`}>
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-5 text-[#b3903c]">
              <Zap size={18} fill="#b3903c" /> AI Auto-Assignment Rules
            </h2>
            <div className="space-y-3">
              {[
                { icon: <Crown size={14} className="text-orange-400" />,   rule: 'Diamond VIP / Platinum → Highest floor available' },
                { icon: <ShieldCheck size={14} className="text-blue-400" />, rule: 'Gold / Premium → Cleaned room with preference match' },
                { icon: <Zap size={14} className="text-emerald-400" />,    rule: 'Standard → Next available by floor preference' },
                { icon: <AlertCircle size={14} className="text-red-400" />, rule: 'Risk flagged → Standard, no upgrades' },
                { icon: <LayoutGrid size={14} className="text-zinc-400" />, rule: 'Groups → Adjacent rooms automatically linked' },
              ].map((r, i) => (
                <div key={i} className={`p-4 rounded-2xl flex items-center gap-4 border transition-all hover:translate-x-1 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
                  <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-black text-[#b3903c] border border-[#b3903c]/30 shrink-0">{i+1}</div>
                  <div className="flex items-center gap-2">
                    {r.icon}
                    <p className={`text-[9px] font-black uppercase tracking-tight leading-relaxed ${sub}`}>{r.rule}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROOM COUNTS */}
          <div className={`p-6 rounded-[2.5rem] border ${card}`}>
            <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 italic ${sub}`}>Room Status Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(counts).map(([status, count]) => {
                const st = getStyle(status);
                return (
                  <div key={status} className={`p-3 rounded-xl border ${st.border} ${isDarkMode ? st.bg : 'bg-white'} text-center`}>
                    <p className={`text-2xl font-black ${st.color}`}>{count}</p>
                    <p className={`text-[8px] font-black uppercase tracking-widest ${sub}`}>{status}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
