import React, { useEffect, useState } from 'react';
import { Star, TrendingUp, MessageSquare, Download } from 'lucide-react';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const raw = localStorage.getItem('ownerSession');
    let ownerId = null;
    try { ownerId = JSON.parse(raw)?.id || null; } catch {}

    const url = ownerId ? `/api/owner/reviews?owner_id=${ownerId}` : '/api/owner/reviews';
    fetch(url)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setStats(d.stats || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = reviews.filter(r => {
    if (filter === '5') return r.rating === 5;
    if (filter === 'low') return r.rating <= 2;
    return true;
  });

  const exportCSV = () => {
    const rows = [['Guest', 'Room', 'Hotel', 'Rating', 'Title', 'Comment', 'Date']];
    reviews.forEach(r => rows.push([r.guestName, r.roomName, r.hotelName, r.rating, r.title, r.comment, r.createdAt]));
    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `reviews_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-8 bg-[#F9F8F3] min-h-screen font-sans text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1A1A1A]">Reputation Management</h1>
          <p className="text-slate-500 mt-1 text-sm">Monitor and analyze guest satisfaction for your hotel.</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#C5A358] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#B49247] transition-all shadow-md active:scale-95">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Reviews', val: stats.total ?? 0, icon: <MessageSquare size={18} /> },
          { label: 'Avg Rating', val: `${stats.avgRating ?? 0} ★`, icon: <Star size={18} /> },
          { label: '5-Star', val: reviews.filter(r => r.rating === 5).length, icon: <TrendingUp size={18} /> },
          { label: 'This Month', val: reviews.filter(r => r.createdAt && new Date(r.createdAt).getMonth() === new Date().getMonth()).length, icon: <TrendingUp size={18} /> },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#E8E2D2] shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-[#C5A358]">{s.icon}</div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
            <h2 className="text-2xl font-black text-slate-800">{s.val}</h2>
          </div>
        ))}
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 mb-6">
        {[['all', 'All'], ['5', '5 Star'], ['low', 'Low Ratings']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === val ? 'bg-[#C5A358] text-white shadow-md' : 'bg-white border border-[#E8E2D2] text-slate-500 hover:border-[#C5A358]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* REVIEWS LIST */}
      <div className="bg-white rounded-3xl border border-[#E8E2D2] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h2 className="font-bold text-lg text-slate-800 font-serif">Guest Feedback</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-[#C5A358] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 opacity-40">
            <MessageSquare className="w-10 h-10 mb-2 text-slate-400" />
            <p className="text-sm font-medium italic text-slate-500">No reviews found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((r) => (
              <div key={r.id} className="p-6 hover:bg-[#FCFAF5] transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C5A358]/10 flex items-center justify-center font-black text-[#C5A358]">
                      {r.guestName?.[0] || 'G'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{r.guestName}</h4>
                      <p className="text-[10px] text-[#C5A358] font-bold uppercase tracking-widest">
                        {r.roomName || r.hotelName || 'Innova HMS'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={12} fill={s <= r.rating ? '#C5A358' : 'transparent'} className={s <= r.rating ? 'text-[#C5A358]' : 'text-slate-200'} />
                      ))}
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
                {r.title && <p className="text-sm font-bold text-slate-700 mb-1">{r.title}</p>}
                <p className="text-sm text-slate-500 italic leading-relaxed">"{r.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
