import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import useStaffSession from '../../../hooks/useStaffSession';
import { Search, Filter, CheckCircle2, Clock, RefreshCw, Loader2 } from 'lucide-react';

const STATUS_COLORS = {
  Available:   { border: 'border-emerald-500/50', text: 'text-emerald-500', bg: 'bg-emerald-500/5',  dot: 'bg-emerald-500',  label: 'Available' },
  Occupied:    { border: 'border-red-500/50',     text: 'text-red-500',     bg: 'bg-red-500/5',      dot: 'bg-red-500',      label: 'Occupied' },
  Dirty:       { border: 'border-amber-500/50',   text: 'text-amber-500',   bg: 'bg-amber-500/5',    dot: 'bg-amber-500',    label: 'Dirty' },
  Clean:       { border: 'border-emerald-400/50', text: 'text-emerald-400', bg: 'bg-emerald-400/5',  dot: 'bg-emerald-400',  label: 'Clean ✓' },
  InProgress:  { border: 'border-cyan-500/50',    text: 'text-cyan-500',    bg: 'bg-cyan-500/5',     dot: 'bg-cyan-500',     label: 'In Prog' },
  Maintenance: { border: 'border-purple-500/50',  text: 'text-purple-500',  bg: 'bg-purple-500/5',   dot: 'bg-purple-500',   label: 'Maint.' },
  Cleaning:    { border: 'border-orange-500/50',  text: 'text-orange-500',  bg: 'bg-orange-500/5',   dot: 'bg-orange-500',   label: 'Cleaning' },
};

const STATUS_CYCLE = ['Available', 'Dirty', 'InProgress', 'Clean', 'Occupied', 'Maintenance'];
const getStyle = (s) => STATUS_COLORS[s] || { border: 'border-zinc-700', text: 'text-zinc-400', bg: '', dot: 'bg-zinc-500', label: s || '—' };
const nextStatus = (current) => STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];

export default function RoomStatusMap() {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const { qs, hotelId } = useStaffSession();
  const [rooms, setRooms] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`/api/housekeeping/room-status${qs}`);
      const data = await res.json();
      if (res.ok) {
        setRooms(data.rooms || []);
        setCounts(data.counts || {});
        setLastSync(new Date());
      } else {
        setError(data.error || 'Failed to load rooms.');
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    fetchRooms();
    const t = setInterval(fetchRooms, 30000);
    return () => clearInterval(t);
  }, [fetchRooms]);

  const handleStatusChange = async (room) => {
    const next = nextStatus(room.status);
    setUpdating(room.id);
    try {
      const res = await fetch(`/api/housekeeping/room-status/${room.room_label}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel_id: hotelId, status: next }),
      });
      if (res.ok) {
        setRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: next } : r));
        setCounts(prev => {
          const n = { ...prev };
          n[room.status] = Math.max(0, (n[room.status] || 1) - 1);
          n[next] = (n[next] || 0) + 1;
          return n;
        });
      }
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const filtered = rooms.filter(r => {
    const matchSearch = !search || r.room_label?.toLowerCase().includes(search.toLowerCase()) || r.room_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const theme = {
    bg:       isDarkMode ? 'bg-[#0c0c0e]'      : 'bg-[#f0f0f3]',
    card:     isDarkMode ? 'bg-[#111]/90'       : 'bg-white',
    border:   isDarkMode ? 'border-white/10'    : 'border-gray-200',
    textMain: isDarkMode ? 'text-white'         : 'text-gray-900',
    textSub:  isDarkMode ? 'text-gray-500'      : 'text-gray-400',
    input:    isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400',
  };

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg}`}>

      {/* HEADER */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.border} mb-8`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Room Status <span className="text-[#c9a84c]">Map</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-1`}>
            Live Room Status · Click a room to cycle status
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${theme.input}`}>
            <Search size={14} className="text-[#c9a84c] shrink-0" />
            <input type="text" placeholder="Search room..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-widest w-28" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer ${theme.input}`}>
            <option value="All">All Status</option>
            {STATUS_CYCLE.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={fetchRooms}
            className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'}`}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* LEGEND */}
      <div className={`${theme.card} border ${theme.border} p-4 rounded-2xl mb-6 flex flex-wrap gap-4 items-center`}>
        {Object.entries(STATUS_COLORS).map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${val.dot}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>
              {key} <span className="text-[#c9a84c]">({counts[key] || 0})</span>
            </span>
          </div>
        ))}
        <span className={`ml-auto text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>
          {filtered.length} / {rooms.length} rooms
        </span>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-red-400 text-[11px] font-bold">
          {error}
        </div>
      )}

      {/* ROOM GRID */}
      <div className={`${theme.card} border ${theme.border} p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)]`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-[#c9a84c]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className={`text-center py-16 text-[11px] font-bold uppercase tracking-widest ${theme.textSub}`}>
            {rooms.length === 0 ? 'No rooms found. Add rooms via the Owner panel.' : 'No rooms match your filter.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filtered.map((room) => {
              const sc = getStyle(room.status);
              const isUpdating = updating === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => !isUpdating && handleStatusChange(room)}
                  disabled={isUpdating}
                  className={`relative p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 active:scale-95 group disabled:opacity-60 ${sc.border} ${sc.bg}`}
                >
                  {isUpdating && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30">
                      <Loader2 size={16} className="animate-spin text-[#c9a84c]" />
                    </div>
                  )}
                  <div className="text-center space-y-1">
                    <h4 className={`text-xl font-black uppercase tracking-tighter ${theme.textMain} group-hover:text-[#c9a84c] transition-colors`}>
                      {room.room_label}
                    </h4>
                    <p className={`text-[8px] font-black uppercase tracking-[0.15em] ${theme.textSub}`}>
                      {room.room_type}
                    </p>
                  </div>
                  <div className={`mt-3 py-1 rounded-lg border ${sc.border}`}>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity border-[#c9a84c]" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER STATS */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} flex items-center gap-4`}>
          <div className="p-3 rounded-xl bg-[#c9a84c] text-black shrink-0">
            <Clock size={18} strokeWidth={3} />
          </div>
          <div className="text-left">
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Last Sync</p>
            <p className={`text-[11px] font-bold ${theme.textMain}`}>
              {lastSync ? lastSync.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Not synced'}
            </p>
          </div>
        </div>
        <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} flex items-center gap-4`}>
          <div className="p-3 rounded-xl bg-emerald-500 text-black shrink-0">
            <CheckCircle2 size={18} strokeWidth={3} />
          </div>
          <div className="text-left">
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Available</p>
            <p className={`text-[11px] font-bold text-emerald-500`}>{counts['Available'] || 0} rooms ready</p>
          </div>
        </div>
        <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} flex items-center gap-4`}>
          <div className="p-3 rounded-xl bg-red-500 text-white shrink-0">
            <RefreshCw size={18} strokeWidth={3} />
          </div>
          <div className="text-left">
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Needs Attention</p>
            <p className={`text-[11px] font-bold text-red-400`}>
              {(counts['Dirty'] || 0) + (counts['Maintenance'] || 0)} rooms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
