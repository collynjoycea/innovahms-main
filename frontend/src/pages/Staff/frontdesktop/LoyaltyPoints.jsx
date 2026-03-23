import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Star, Crown, Gem, Gift, TrendingUp, Award, Zap, Search, RefreshCw, Loader2 } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const TIER_STYLES = {
  DIAMOND:  { color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: '💎 Diamond',  discount: 30 },
  PLATINUM: { color: 'text-purple-400', bg: 'bg-purple-400/10', label: '👑 Platinum', discount: 20 },
  GOLD:     { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: '⭐ Gold',     discount: 10 },
  SILVER:   { color: 'text-zinc-400',   bg: 'bg-zinc-400/10',   label: '🥈 Silver',   discount: 5  },
  STANDARD: { color: 'text-zinc-500',   bg: 'bg-zinc-500/10',   label: 'Standard',    discount: 0  },
};

const REWARDS = [
  { title: 'Spa Access (1 session)',  cost: '800 pts' },
  { title: 'Free Breakfast (2 pax)', cost: '500 pts' },
  { title: 'Room Upgrade (1 tier)',   cost: '2,000 pts' },
  { title: 'Late Checkout',           cost: '300 pts' },
  { title: 'Airport Transfer',        cost: '1,500 pts' },
];

export default function LoyaltyPoints() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/loyalty${qs}`);
      const data = await res.json();
      if (res.ok) { setMembers(data.members || []); setStats(data.stats || {}); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = members.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className={`p-8 min-h-screen transition-all ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${text}`}>
            Loyalty & <span className="text-[#b3903c]">Points</span>
          </h1>
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 ${sub}`}>{stats.total || 0} registered members</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`relative border rounded-2xl ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <Search size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 ${sub}`} />
            <input type="text" placeholder="Search member..." value={search} onChange={e => setSearch(e.target.value)}
              className={`bg-transparent pl-10 pr-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none w-52 ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} />
          </div>
          <button onClick={fetchData} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Members',  val: stats.total    || 0, icon: <Crown />,  color: 'text-orange-400' },
          { label: 'Diamond VIP',    val: stats.diamond  || 0, icon: <Gem />,    color: 'text-blue-400' },
          { label: 'Platinum',       val: stats.platinum || 0, icon: <Star />,   color: 'text-purple-400' },
          { label: 'Gold',           val: stats.gold     || 0, icon: <Award />,  color: 'text-yellow-500' },
        ].map((s, i) => (
          <div key={i} className={`p-8 rounded-[2.5rem] border ${card}`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`p-3 rounded-2xl bg-white/5 ${s.color}`}>{s.icon}</span>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${sub}`}>{s.label}</p>
            <p className={`text-4xl font-black ${text}`}>{loading ? '--' : s.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* TOP MEMBERS */}
        <div className={`lg:col-span-7 p-8 rounded-[2.5rem] border ${card}`}>
          <h2 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6 ${text}`}>
            <Award size={18} className="text-[#b3903c]" /> Loyalty Members
          </h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-[#b3903c]" /></div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map(m => {
                const ts = TIER_STYLES[m.tier] || TIER_STYLES.STANDARD;
                return (
                  <div key={m.id} className={`p-5 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all cursor-pointer`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${ts.bg} ${ts.color}`}>
                        {m.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase tracking-tight ${text}`}>{m.name}</p>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${ts.bg} ${ts.color}`}>{ts.label}</span>
                      </div>
                    </div>
                    <div className="hidden md:block w-28">
                      <p className={`text-[9px] font-black uppercase mb-1 ${sub}`}>Progress</p>
                      <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                        <div className="h-full bg-[#b3903c]" style={{ width: `${m.progress}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${text}`}>{m.points.toLocaleString()}</p>
                      <p className="text-[9px] font-black text-emerald-500 uppercase">{m.discount > 0 ? `${m.discount}% OFF` : 'No discount'}</p>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className={`text-center text-[10px] italic py-8 ${sub}`}>No members found.</p>}
            </div>
          )}
        </div>

        {/* RULES & REWARDS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className={`p-8 rounded-[2.5rem] border ${card}`}>
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6 text-[#b3903c]">
              <Zap size={18} fill="#b3903c" /> Auto-Apply Rules
            </h2>
            <div className="space-y-4">
              {Object.entries(TIER_STYLES).filter(([k]) => k !== 'STANDARD').map(([tier, ts]) => (
                <div key={tier} className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-white/5' : 'border-zinc-100'}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>{ts.label}</span>
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${ts.color}`}>{ts.discount}% auto-discount</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-8 rounded-[2.5rem] border ${card}`}>
            <h2 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6 ${text}`}>
              <Gift size={18} className="text-[#b3903c]" /> Redeemable Rewards
            </h2>
            <div className="space-y-3">
              {REWARDS.map((r, i) => (
                <div key={i} className={`p-4 rounded-2xl flex items-center justify-between border ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-zinc-100 bg-zinc-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-tight ${sub}`}>{r.title}</p>
                  <span className="text-[10px] font-black text-[#b3903c] bg-[#b3903c]/10 px-3 py-1 rounded-lg border border-[#b3903c]/20">{r.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
