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
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
      <div className="w-12 h-12 border-4 border-[#bf9b30] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] p-8 font-sans text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Customer CRM & Insights</h1>
          <p className="text-slate-400 font-medium mt-1 uppercase text-[10px] tracking-[0.2em]">Behavioral analytics connected to owner reservations data</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 bg-white hover:shadow-lg hover:border-[#bf9b30]/30 transition-all active:scale-95">
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
          <div key={card.label} onClick={() => setActiveSegment(card.type)} className={`bg-white p-8 rounded-[35px] border-b-4 ${card.color} shadow-sm cursor-pointer transition-all duration-300 ${activeSegment === card.type ? 'ring-2 ring-[#bf9b30] -translate-y-2 shadow-xl' : 'hover:-translate-y-1 hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{card.label}</span>
              <div className={`${activeSegment === card.type ? 'text-[#bf9b30]' : 'text-slate-300'}`}>{card.icon}</div>
            </div>
            <h2 className="text-3xl font-black text-slate-900">{card.val}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-white p-10 rounded-[45px] shadow-sm border border-slate-50">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black">Behavioral Analytics</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['weekly', 'monthly', 'yearly'].map((filterKey) => (
                <button key={filterKey} onClick={() => setBehaviorFilter(filterKey)} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${behaviorFilter === filterKey ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                  {filterKey}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 bg-slate-50 rounded-[30px] border border-slate-100 p-6">
            <div className="flex items-end gap-3 h-full">
              {trendBars.length ? trendBars.map((value, index) => (
                <div key={`${value}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full h-full bg-white rounded-2xl p-1 flex items-end">
                    <div className="w-full rounded-xl bg-gradient-to-t from-[#bf9b30] to-[#ecd690]" style={{ height: `${Math.max(16, (Number(value || 0) / maxTrend) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{(payload?.trends?.labels || []).slice(-6)[index]?.slice(-2) || '--'}</p>
                </div>
              )) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <div className="text-center">
                    <BarChart3 className="mx-auto mb-2 opacity-20" size={40}/>
                    <p className="text-[10px] font-black uppercase tracking-widest">No behavior trends yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-50">
          <h3 className="text-xl font-black mb-8">Top Guests</h3>
          <div className="space-y-4">
            {(payload?.topGuests || []).slice(0, 4).map((guest) => (
              <div key={`${guest.name}-${guest.customerId || guest.email}`} className="flex items-center gap-3">
                <img src={guest.imageUrl || '/images/deluxe-room.jpg'} alt={guest.name} className="w-12 h-12 rounded-2xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 truncate">{guest.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{guest.segment} • {guest.preferredRoom}</p>
                </div>
                <p className="text-sm font-black text-[#bf9b30]">{peso(guest.totalSpend)}</p>
              </div>
            ))}
            {!(payload?.topGuests || []).length && <p className="text-sm text-slate-400">No top guest data yet.</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[45px] shadow-sm border border-slate-50 overflow-hidden mb-12">
        <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-6 bg-white">
          <div>
            <h3 className="text-2xl font-black">{activeSegment === 'ALL' ? 'Customer Directory' : `${activeSegment} Analysis`}</h3>
            <p className="text-[10px] font-black text-[#bf9b30] mt-1 uppercase tracking-widest">Showing {filteredGuests.length} live profiles</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#bf9b30] transition-colors" size={18}/>
            <input type="text" placeholder="Search name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl w-full md:w-80 text-sm font-bold outline-none focus:ring-2 focus:ring-[#bf9b30]/20 transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
            <tbody className="divide-y divide-slate-50">
              {filteredGuests.map((guest) => (
                <tr key={`${guest.name}-${guest.customerId || guest.email}`} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-8">
                    <div className="font-black text-slate-800">{guest.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 tracking-tighter">{guest.email || `#${guest.customerId || 'guest'}`}</div>
                  </td>
                  <td className="text-sm font-bold">{guest.bookingCount || 0} stays</td>
                  <td className="text-sm font-bold text-green-600">{peso(guest.totalSpend)}</td>
                  <td className="text-sm font-bold text-red-500">{Math.round(guest.cancellationRate || 0)}%</td>
                  <td className="text-sm text-slate-500 font-medium">{guest.preferredRoom || 'N/A'}</td>
                  <td><span className="text-[10px] font-black px-3 py-1 bg-slate-100 rounded-lg">{guest.segment}</span></td>
                  <td className="p-8 text-right">
                    <button onClick={() => setSelectedGuest(guest)} className="text-[#bf9b30] font-black text-[10px] uppercase tracking-widest hover:text-slate-900 flex items-center gap-1 ml-auto transition-colors">
                      Details <ChevronRight size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredGuests.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-slate-400">No customer records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedGuest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setSelectedGuest(null)} className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full transition-colors">
              <X size={20} className="text-slate-400 hover:text-slate-900"/>
            </button>
            <img src={selectedGuest.imageUrl || '/images/deluxe-room.jpg'} alt={selectedGuest.name} className="w-20 h-20 rounded-3xl object-cover mb-6" />
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedGuest.name}</h2>
            <p className="text-slate-400 font-black text-[10px] tracking-widest uppercase mb-8">Segment: {selectedGuest.segment}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-6 bg-[#FDFCFB] border border-slate-50 rounded-[25px]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Revenue Contribution</p>
                <p className="text-2xl font-black text-[#bf9b30]">{peso(selectedGuest.totalSpend)}</p>
              </div>
              <div className="p-6 bg-[#FDFCFB] border border-slate-50 rounded-[25px]">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Risk Score</p>
                <p className="text-2xl font-black text-slate-900 uppercase">{selectedGuest.riskScore || 0}/100</p>
              </div>
            </div>
            <button className="w-full py-5 bg-[#bf9b30] text-white rounded-2xl font-black shadow-lg shadow-[#bf9b30]/20 hover:bg-slate-900 transition-all active:scale-[0.98]">
              DB CONNECTED PROFILE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
