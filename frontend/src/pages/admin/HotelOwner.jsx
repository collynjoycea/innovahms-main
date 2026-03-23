import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Building2, CheckSquare, Search, Download, Mail, Phone } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function HotelOwners() {
  const { isDarkMode } = useOutletContext();
  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f0f0f3]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    inputBg: isDarkMode ? 'bg-white/5' : 'bg-gray-50',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  useEffect(() => {
    fetch('/api/admin/owners')
      .then(r => r.json())
      .then(d => { setOwners(d.owners || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = owners.filter(o =>
    `${o.firstName} ${o.lastName} ${o.email} ${o.hotelName}`.toLowerCase().includes(search.toLowerCase())
  );
  const { paged, page, totalPages, setPage } = usePagination(filtered);

  return (
    <div className={`p-6 space-y-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Hotel <span className="text-[#c9a84c]">Owners</span>
          </h1>
          <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest mt-1`}>
            {total} registered hotel partners
          </p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${theme.border} ${theme.card} text-[10px] font-bold uppercase ${theme.textMain} hover:border-[#c9a84c] transition-all`}>
          <Download size={14} /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Partners', value: total, icon: <Building2 size={20} /> },
          { label: 'Active Hotels', value: owners.filter(o => o.hotelId).length, icon: <CheckSquare size={20} />, color: 'text-green-500' },
          { label: 'Total Rooms', value: owners.reduce((s, o) => s + (o.totalRooms || 0), 0), icon: <Building2 size={20} />, color: 'text-[#c9a84c]' },
          { label: 'No Hotel Yet', value: owners.filter(o => !o.hotelId).length, icon: <Building2 size={20} />, color: 'text-orange-500' },
        ].map((kpi, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}>
            <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} border ${theme.border} text-[#c9a84c] inline-block mb-4`}>{kpi.icon}</div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>{kpi.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${theme.textMain}`}>{kpi.value}</h2>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} overflow-hidden`}>
        <div className={`p-5 border-b ${theme.border} flex flex-col md:flex-row justify-between items-center gap-4 ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Partner Registry</h3>
          </div>
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${theme.border} ${theme.inputBg} w-full md:w-64`}>
            <Search size={14} className="text-gray-500" />
            <input type="text" placeholder="Search owner or hotel..." value={search} onChange={e => setSearch(e.target.value)}
              className={`bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full ${theme.textMain} placeholder:text-gray-500`} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'} border-b ${theme.border}`}>
                <tr>
                  {['Owner', 'Contact', 'Hotel', 'Address', 'Rooms', 'Joined'].map(h => (
                    <th key={h} className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.border}`}>
                {paged.map((o, i) => (
                  <tr key={i} className="hover:bg-[#c9a84c]/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'} flex items-center justify-center text-[#c9a84c] font-black text-[10px] border ${theme.border}`}>
                          {(o.firstName[0] || '') + (o.lastName[0] || '')}
                        </div>
                        <span className={`text-[11px] font-black uppercase ${theme.textMain}`}>{o.firstName} {o.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className={`flex items-center gap-1 text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-bold`}>
                          <Mail size={10} className="text-[#c9a84c]" /> {o.email}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] ${theme.textSub}`}>
                          <Phone size={10} /> {o.contactNumber || '—'}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-[11px] font-black text-[#c9a84c]`}>{o.hotelName}</td>
                    <td className={`px-6 py-4 text-[10px] ${theme.textSub}`}>{o.hotelAddress || '—'}</td>
                    <td className={`px-6 py-4 text-[11px] font-black ${theme.textMain}`}>{o.totalRooms}</td>
                    <td className={`px-6 py-4 text-[10px] font-bold ${theme.textSub} uppercase`}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className={`px-6 py-10 text-center text-[11px] ${theme.textSub}`}>No owners found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
