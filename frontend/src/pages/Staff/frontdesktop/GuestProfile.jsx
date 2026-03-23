import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Edit3, Award, Loader2, User, RefreshCw, Calendar, CreditCard } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const TIER_COLORS = {
  DIAMOND:  { text: 'text-blue-400',   bg: 'bg-blue-400/10',   badge: 'border-blue-400/30' },
  PLATINUM: { text: 'text-purple-400', bg: 'bg-purple-400/10', badge: 'border-purple-400/30' },
  GOLD:     { text: 'text-yellow-500', bg: 'bg-yellow-500/10', badge: 'border-yellow-500/30' },
  SILVER:   { text: 'text-zinc-400',   bg: 'bg-zinc-400/10',   badge: 'border-zinc-400/30' },
  STANDARD: { text: 'text-zinc-500',   bg: 'bg-zinc-500/10',   badge: 'border-zinc-500/30' },
};

const STATUS_COLORS = {
  CHECKED_IN:  'text-blue-500',
  CONFIRMED:   'text-emerald-500',
  PENDING:     'text-amber-500',
  CHECKED_OUT: 'text-zinc-400',
  CANCELLED:   'text-red-500',
};

export default function GuestProfile() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('All');

  const fetchGuests = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/guests${qs}`);
      const data = await res.json();
      if (res.ok) {
        setGuests(data.guests || []);
        if (!selected && data.guests?.length > 0) setSelected(data.guests[0]);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchHistory = useCallback(async (id) => {
    setHistLoading(true);
    try {
      const res = await fetch(`/api/staff/guests/${id}/history`);
      const data = await res.json();
      if (res.ok) setHistory(data.history || []);
    } catch { /* ignore */ }
    finally { setHistLoading(false); }
  }, []);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);
  useEffect(() => { if (selected?.id) fetchHistory(selected.id); }, [selected?.id, fetchHistory]);

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) || g.email.toLowerCase().includes(q);
    const matchTier = tierFilter === 'All' || g.tier === tierFilter;
    return matchSearch && matchTier;
  });

  const tc = TIER_COLORS[selected?.tier] || TIER_COLORS.STANDARD;
  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="animate-spin text-[#b3903c]" size={40} /></div>;

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Guest <span className="text-[#b3903c]">Profiles & CRM</span></h1>
          <p className={`text-[9px] font-bold uppercase tracking-[0.3em] mt-1 ${sub}`}>{guests.length} registered guests</p>
        </div>
        <button onClick={fetchGuests} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: GUEST LIST */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex gap-2 flex-wrap mb-2">
            {['All','DIAMOND','PLATINUM','GOLD','SILVER','STANDARD'].map(t => (
              <button key={t} onClick={() => setTierFilter(t)}
                className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all ${tierFilter === t ? 'bg-[#b3903c]/20 border-[#b3903c] text-[#b3903c]' : isDarkMode ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <Search size={14} className={sub} />
            <input type="text" placeholder="Search guest or email..." value={search} onChange={e => setSearch(e.target.value)}
              className={`bg-transparent outline-none text-xs font-bold flex-1 ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} />
          </div>
          <div className="space-y-3">
            {filtered.map(g => {
              const tc2 = TIER_COLORS[g.tier] || TIER_COLORS.STANDARD;
              return (
                <div key={g.id} onClick={() => setSelected(g)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                    selected?.id === g.id
                      ? isDarkMode ? 'bg-[#111114] border-[#b3903c]/50 shadow-[0_0_20px_rgba(179,144,60,0.1)]' : 'bg-amber-50 border-[#b3903c]/40'
                      : isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs ${tc2.bg} ${tc2.text}`}>
                      {g.firstName[0]}{g.lastName[0]}
                    </div>
                    <div className="text-left">
                      <h4 className={`font-black uppercase text-sm tracking-tight ${text}`}>{g.firstName} {g.lastName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-bold ${sub}`}>{g.totalStays} stays ·</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${tc2.bg} ${tc2.text} ${tc2.badge}`}>{g.tier}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black tracking-tighter text-[#b3903c]`}>{g.loyaltyPoints.toLocaleString()}</p>
                    <p className={`text-[8px] font-black uppercase tracking-widest ${sub}`}>Points</p>
                    <p className={`text-[9px] font-bold mt-1 ${sub}`}>₱{(g.totalSpent / 1000).toFixed(1)}K LTV</p>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className={`text-center text-[10px] font-bold uppercase tracking-widest italic py-10 ${sub}`}>No guests found.</p>}
          </div>
        </div>

        {/* RIGHT: DETAIL PANEL */}
        <div className="lg:col-span-5">
          {selected ? (
            <div className={`rounded-[2.5rem] border p-8 sticky top-6 shadow-2xl ${card}`}>
              <div className="flex justify-between items-start mb-6 text-left">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-xl ${tc.bg} ${tc.text}`}>
                    {selected.firstName[0]}{selected.lastName[0]}
                  </div>
                  <div>
                    <h2 className={`text-xl font-black uppercase italic tracking-tighter ${text}`}>{selected.firstName} {selected.lastName}</h2>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>{selected.totalStays} stays · Last: {selected.lastStay || 'N/A'}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${tc.bg} ${tc.text} ${tc.badge}`}>{selected.tier}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* POINTS */}
              <div className="mb-6 text-left">
                <div className="flex justify-between items-end mb-2">
                  <h1 className={`text-4xl font-black italic tracking-tighter text-[#b3903c]`}>{selected.loyaltyPoints.toLocaleString()}</h1>
                  <p className={`text-[10px] font-black uppercase ${sub}`}>Loyalty Points</p>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                  <div className="h-full bg-gradient-to-r from-[#8a6d2b] to-[#e2c275]" style={{ width: `${Math.min(100, (selected.loyaltyPoints / 10000) * 100)}%` }} />
                </div>
                <p className={`text-[9px] font-bold mt-2 uppercase tracking-widest ${sub}`}>LTV: <span className={text}>₱{Number(selected.totalSpent).toLocaleString()}</span></p>
              </div>

              {/* CONTACT */}
              <div className={`mb-6 p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${sub}`}>Contact</p>
                <p className={`text-xs font-bold ${text}`}>{selected.email || '—'}</p>
                <p className={`text-xs font-bold ${sub}`}>{selected.contact || '—'}</p>
              </div>

              {/* STAY HISTORY */}
              <div className="text-left">
                <h4 className={`text-[9px] font-black uppercase tracking-[0.3em] mb-4 ${sub}`}>Stay History</h4>
                {histLoading ? (
                  <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-[#b3903c]" /></div>
                ) : history.length === 0 ? (
                  <p className={`text-[10px] italic ${sub}`}>No stay history found.</p>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {history.map(h => (
                      <div key={h.id} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-white/5 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-[10px] font-black text-[#b3903c]`}>{h.bookingNumber}</p>
                            <p className={`text-[10px] font-bold uppercase ${text}`}>{h.roomName} · Room {h.roomNumber}</p>
                            <p className={`text-[9px] ${sub}`}>{h.checkIn} → {h.checkOut} · {h.nights}n</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-[10px] font-black ${text}`}>₱{Number(h.amount).toLocaleString()}</p>
                            <p className={`text-[9px] font-black ${STATUS_COLORS[h.status] || sub}`}>{h.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`h-full flex flex-col items-center justify-center opacity-30 border-2 border-dashed rounded-[2.5rem] p-20 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <User size={60} strokeWidth={1} />
              <p className={`mt-4 font-black uppercase text-[10px] tracking-widest ${sub}`}>Select a guest to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
