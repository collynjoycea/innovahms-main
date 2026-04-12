import React, { useEffect, useMemo, useState } from 'react';
import { Users, Star, AlertCircle, TrendingUp, Search, ChevronRight, Download, X, BarChart3 } from 'lucide-react';

const peso = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

const Customers = () => {
  const [payload, setPayload] = useState({ customers: [], topGuests: [], atRiskGuests: [], stats: {}, trends: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegment, setActiveSegment] = useState('ALL');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [behaviorFilter, setBehaviorFilter] = useState('monthly');

  const ownerId = (() => {
    try {
      return JSON.parse(localStorage.getItem('ownerSession') || '{}')?.id || null;
    } catch {
      return null;
    }
  })();

  const period = behaviorFilter === 'weekly' ? 'daily' : 'monthly';

  const fetchGuests = async () => {
    if (!ownerId) return setLoading(false);
    try {
      const res = await fetch(`/api/owner/customers/${ownerId}?period=${period}`);
      const data = await res.json();
      if (res.ok) setPayload(data);
    } catch (err) {
      console.error('Error fetching owner customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
    const interval = setInterval(fetchGuests, 15000);
    const onFocus = () => fetchGuests();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [ownerId, period]);

  const guests = payload?.customers || [];

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const haystack = `${guest.name || ''} ${guest.customerId || ''} ${guest.email || ''}`.toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesSegment = activeSegment === 'ALL' || activeSegment === 'ACV' || guest.segment === activeSegment;
      return matchesSearch && matchesSegment;
    });
  }, [guests, searchTerm, activeSegment]);

  const stats = useMemo(() => ({
    vip: guests.filter((g) => g.segment === 'VIP').length,
    standard: guests.filter((g) => g.segment === 'STANDARD' || g.segment === 'LOYAL').length,
    risk: guests.filter((g) => g.riskLevel === 'High' || g.segment === 'RISK').length,
    avgValue: payload?.stats?.averageGuestSpendPhp || 0,
  }), [guests, payload]);

  const trendBars = (payload?.trends?.bookings || []).slice(-6);
  const maxTrend = Math.max(...trendBars.map((v) => Number(v || 0)), 1);

  const exportCSV = () => {
    const rows = [['Customer', 'Segment', 'Spend', 'Bookings', 'Cancel Rate', 'Risk Score', 'Preferred Room']];
    filteredGuests.forEach((guest) => rows.push([
      guest.name,
      guest.segment,
      guest.totalSpend,
      guest.bookingCount,
      guest.cancellationRate,
      guest.riskScore,
      guest.preferredRoom,
    ]));
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `owner_customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#FDFCFB] dark:bg-transparent">
      <div className="w-12 h-12 border-4 border-[#bf9b30] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-8 font-sans text-slate-800 dark:bg-transparent dark:text-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Customer CRM & Insights</h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Behavioral analytics connected to owner reservations data</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-600 transition-all hover:border-[#bf9b30]/30 hover:shadow-lg active:scale-95 dark:border-white/10 dark:bg-[#11151d] dark:text-slate-200 dark:hover:shadow-none">
          <Download size={18}/> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'VIP / PREMIUM', val: stats.vip, color: 'border-yellow-400', icon: <Star size={16}/>, type: 'VIP' },
          { label: 'STANDARD', val: stats.standard, color: 'border-slate-200', icon: <Users size={16}/>, type: 'STANDARD' },
          { label: 'AT RISK', val: stats.risk, color: 'border-red-400', icon: <AlertCircle size={16}/>, type: 'RISK' },
          { label: 'AVG. CUSTOMER VALUE', val: peso(stats.avgValue), color: 'border-[#bf9b30]', icon: <TrendingUp size={16}/>, type: 'ACV' },
        ].map((card) => (
          <div key={card.label} onClick={() => setActiveSegment(card.type)} className={`cursor-pointer rounded-[35px] border-b-4 bg-white p-8 shadow-sm transition-all duration-300 dark:bg-[#11151d] dark:shadow-none ${card.color} ${activeSegment === card.type ? 'ring-2 ring-[#bf9b30] -translate-y-2 shadow-xl dark:shadow-none' : 'hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none'}`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{card.label}</span>
              <div className={`${activeSegment === card.type ? 'text-[#bf9b30]' : 'text-slate-300 dark:text-slate-600'}`}>{card.icon}</div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{card.val}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 rounded-[45px] border border-slate-50 bg-white p-10 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Behavioral Analytics</h3>
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-[#0d1118]">
              {['weekly', 'monthly', 'yearly'].map((filterKey) => (
                <button key={filterKey} onClick={() => setBehaviorFilter(filterKey)} className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase transition-all ${behaviorFilter === filterKey ? 'bg-white text-slate-900 shadow-sm dark:bg-[#11151d] dark:text-white dark:shadow-none' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
                  {filterKey}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 rounded-[30px] border border-slate-100 bg-slate-50 p-6 dark:border-white/10 dark:bg-[#0d1118]">
            <div className="flex items-end gap-3 h-full">
              {trendBars.length ? trendBars.map((value, index) => (
                <div key={`${value}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex h-full w-full items-end rounded-2xl bg-white p-1 dark:bg-[#11151d]">
                    <div className="w-full rounded-xl bg-gradient-to-t from-[#bf9b30] to-[#ecd690]" style={{ height: `${Math.max(16, (Number(value || 0) / maxTrend) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{(payload?.trends?.labels || []).slice(-6)[index]?.slice(-2) || '--'}</p>
                </div>
              )) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-500">
                  <div className="text-center">
                    <BarChart3 className="mx-auto mb-2 opacity-20" size={40}/>
                    <p className="text-[10px] font-black uppercase tracking-widest">No behavior trends yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[45px] border border-slate-50 bg-white p-10 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
          <h3 className="mb-8 text-xl font-black text-slate-900 dark:text-white">Top Guests</h3>
          <div className="space-y-4">
            {(payload?.topGuests || []).slice(0, 4).map((guest) => (
              <div key={`${guest.name}-${guest.customerId || guest.email}`} className="flex items-center gap-3">
                <img src={guest.imageUrl || '/images/deluxe-room.jpg'} alt={guest.name} className="w-12 h-12 rounded-2xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-black text-slate-900 dark:text-white">{guest.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{guest.segment} • {guest.preferredRoom}</p>
                </div>
                <p className="text-sm font-black text-[#bf9b30]">{peso(guest.totalSpend)}</p>
              </div>
            ))}
            {!(payload?.topGuests || []).length && <p className="text-sm text-slate-400 dark:text-slate-500">No top guest data yet.</p>}
          </div>
        </div>
      </div>

      <div className="mb-12 overflow-hidden rounded-[45px] border border-slate-50 bg-white shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-50 bg-white p-10 md:flex-row dark:border-white/10 dark:bg-[#11151d]">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{activeSegment === 'ALL' ? 'Customer Directory' : `${activeSegment} Analysis`}</h3>
            <p className="text-[10px] font-black text-[#bf9b30] mt-1 uppercase tracking-widest">Showing {filteredGuests.length} live profiles</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#bf9b30] transition-colors" size={18}/>
            <input type="text" placeholder="Search name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-2xl bg-slate-50 py-4 pl-12 pr-6 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-[#bf9b30]/20 md:w-80 dark:bg-[#0d1118] dark:text-white" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-[#0d1118] dark:text-slate-500">
              <tr>
                <th className="p-8">Customer</th>
                <th className="py-8">Bookings</th>
                <th className="py-8">Spend</th>
                <th className="py-8">Cancel %</th>
                <th className="py-8">Preferred Room</th>
                <th className="py-8">Segment</th>
                <th className="p-8 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/10">
              {filteredGuests.map((guest) => (
                <tr key={`${guest.name}-${guest.customerId || guest.email}`} className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                  <td className="p-8">
                    <div className="font-black text-slate-800 dark:text-white">{guest.name}</div>
                    <div className="text-[10px] font-bold tracking-tighter text-slate-400 dark:text-slate-500">{guest.email || `#${guest.customerId || 'guest'}`}</div>
                  </td>
                  <td className="text-sm font-bold dark:text-slate-200">{guest.bookingCount || 0} stays</td>
                  <td className="text-sm font-bold text-green-600">{peso(guest.totalSpend)}</td>
                  <td className="text-sm font-bold text-red-500">{Math.round(guest.cancellationRate || 0)}%</td>
                  <td className="text-sm font-medium text-slate-500 dark:text-slate-400">{guest.preferredRoom || 'N/A'}</td>
                  <td><span className="rounded-lg bg-slate-100 px-3 py-1 text-[10px] font-black dark:bg-[#0d1118] dark:text-slate-300">{guest.segment}</span></td>
                  <td className="p-8 text-right">
                    <button onClick={() => setSelectedGuest(guest)} className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#bf9b30] transition-colors hover:text-slate-900 dark:hover:text-white">
                      Details <ChevronRight size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredGuests.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-slate-400 dark:text-slate-500">No customer records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-[40px] bg-white p-10 shadow-2xl animate-in fade-in zoom-in duration-200 dark:bg-[#11151d]">
            <button onClick={() => setSelectedGuest(null)} className="absolute top-8 right-8 rounded-full p-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
              <X size={20} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"/>
            </button>
            <img src={selectedGuest.imageUrl || '/images/deluxe-room.jpg'} alt={selectedGuest.name} className="w-20 h-20 rounded-3xl object-cover mb-6" />
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{selectedGuest.name}</h2>
            <p className="mb-8 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Segment: {selectedGuest.segment}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="rounded-[25px] border border-slate-50 bg-[#FDFCFB] p-6 dark:border-white/10 dark:bg-[#0d1118]">
                <p className="mb-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Revenue Contribution</p>
                <p className="text-2xl font-black text-[#bf9b30]">{peso(selectedGuest.totalSpend)}</p>
              </div>
              <div className="rounded-[25px] border border-slate-50 bg-[#FDFCFB] p-6 dark:border-white/10 dark:bg-[#0d1118]">
                <p className="mb-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Risk Score</p>
                <p className="text-2xl font-black uppercase text-slate-900 dark:text-white">{selectedGuest.riskScore || 0}/100</p>
              </div>
            </div>
            <button className="w-full rounded-2xl bg-[#bf9b30] py-5 font-black text-white shadow-lg shadow-[#bf9b30]/20 transition-all hover:bg-slate-900 active:scale-[0.98] dark:hover:bg-[#d6b65a] dark:hover:text-[#0d0c0a]">
              DB CONNECTED PROFILE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
