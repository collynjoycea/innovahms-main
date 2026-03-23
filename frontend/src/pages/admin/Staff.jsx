import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Laptop, CheckSquare, Search, Trash2 } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function Staff() {
  const { isDarkMode } = useOutletContext();
  const [staff, setStaff] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const cardBg = isDarkMode ? 'bg-[#111111]' : 'bg-white';
  const borderStyle = isDarkMode ? 'border-white/10' : 'border-gray-200';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSub = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDarkMode ? 'bg-white/5' : 'bg-gray-100';

  const load = () => {
    setLoading(true);
    fetch('/api/admin/staff')
      .then(r => r.json())
      .then(d => { setStaff(d.staff || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
    load();
  };

  const filtered = staff.filter(s =>
    `${s.firstName} ${s.lastName} ${s.role} ${s.hotelName}`.toLowerCase().includes(search.toLowerCase())
  );
  const { paged, page, totalPages, setPage } = usePagination(filtered);
  const active = staff.filter(s => String(s.status || '').toLowerCase() === 'active').length;

  const roleColor = (role) => {
    const r = String(role || '').toLowerCase();
    if (r.includes('manager') || r.includes('lead')) return 'bg-purple-500/10 text-purple-400';
    if (r.includes('front') || r.includes('desk')) return 'bg-blue-500/10 text-blue-400';
    if (r.includes('house') || r.includes('clean')) return 'bg-cyan-500/10 text-cyan-400';
    return 'bg-[#c9a84c]/10 text-[#c9a84c]';
  };

  return (
    <div className={`p-6 space-y-8 transition-colors duration-300 ${isDarkMode ? 'bg-[#09090b]' : 'bg-[#f8f9fa]'}`}>
      <div className={`flex flex-col md:flex-row justify-between items-center gap-4 border-b ${borderStyle} pb-6`}>
        <div className="text-left">
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${textMain}`}>
            Staff <span className="italic font-light">Management</span>
          </h1>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
            {total} total staff across all hotels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Staff', value: total, icon: <Users size={20} /> },
          { label: 'Active', value: active, icon: <CheckSquare size={20} />, color: 'text-green-500' },
          { label: 'Hotels Covered', value: [...new Set(staff.map(s => s.hotelName))].length, icon: <Laptop size={20} />, color: 'text-[#c9a84c]' },
        ].map((kpi, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${cardBg} ${borderStyle} shadow-sm`}>
            <div className="p-2.5 rounded-xl bg-white/5 text-[#c9a84c] border border-white/5 inline-block mb-4">{kpi.icon}</div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">{kpi.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${textMain}`}>{kpi.value}</h2>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border ${cardBg} ${borderStyle} shadow-xl overflow-hidden`}>
        <div className={`p-5 border-b ${borderStyle} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <div className="flex items-center gap-3">
            <Users className="text-[#c9a84c]" size={18} />
            <h3 className={`text-xs font-black uppercase tracking-widest ${textMain}`}>Staff Registry</h3>
          </div>
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${borderStyle} ${inputBg} w-full md:w-64`}>
            <Search size={14} className="text-gray-500" />
            <input type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
              className={`bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full ${textMain} placeholder:text-gray-600`} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'} border-b ${borderStyle}`}>
                <tr>
                  {['Name', 'Role', 'Hotel', 'Status', 'Date Hired', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                {paged.map((s, i) => (
                  <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#c9a84c]/20 flex items-center justify-center text-[#c9a84c] font-black text-[9px] border border-[#c9a84c]/30">
                          {(s.firstName[0] || '') + (s.lastName[0] || '')}
                        </div>
                        <span className={`text-[11px] font-black uppercase ${textMain}`}>{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${roleColor(s.role)} border border-white/5`}>
                        {s.role}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-[10px] font-bold ${textSub} uppercase tracking-tight`}>{s.hotelName}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                        String(s.status || '').toLowerCase() === 'active'
                          ? 'text-green-500 bg-green-500/10 border-green-500/20'
                          : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
                      }`}>{s.status || 'Active'}</span>
                    </td>
                    <td className={`px-6 py-4 text-[10px] font-bold ${textSub}`}>
                      {s.dateHired ? new Date(s.dateHired).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleDelete(s.id)} className={`p-1.5 rounded-lg border ${borderStyle} text-red-500 hover:bg-red-500/10 transition-all opacity-60 group-hover:opacity-100`}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className={`px-6 py-10 text-center text-[11px] text-gray-500`}>No staff found.</td></tr>
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
