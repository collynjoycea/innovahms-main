import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Building2, CheckSquare, Search, Download, Mail, Phone, Eye, BadgeCheck, X } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function HotelOwners() {
  const { isDarkMode } = useOutletContext();
  const [owners, setOwners] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [actionLoading, setActionLoading] = useState('');

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f0f0f3]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    inputBg: isDarkMode ? 'bg-white/5' : 'bg-gray-50',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  const loadOwners = () => {
    setLoading(true);
    fetch('/api/admin/owners')
      .then((r) => r.json())
      .then((d) => {
        setOwners(d.owners || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadOwners();
  }, []);

  const filtered = owners.filter((o) =>
    `${o.firstName} ${o.lastName} ${o.email} ${o.hotelName} ${o.hotelCode || ''} ${o.approvalStatus || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const { paged, page, totalPages, setPage } = usePagination(filtered);

  const approveOwner = async (ownerId) => {
    setActionLoading(String(ownerId));
    try {
      const response = await fetch(`/api/admin/owners/${ownerId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to approve owner.');
      loadOwners();
      if (selectedOwner?.id === ownerId) {
        setSelectedOwner((current) => current ? { ...current, approvalStatus: 'APPROVED' } : current);
      }
    } catch (error) {
      window.alert(error.message || 'Unable to approve owner.');
    } finally {
      setActionLoading('');
    }
  };

  const statusBadge = (status) => {
    const normalized = String(status || 'APPROVED').toUpperCase();
    if (normalized === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
    if (normalized === 'REJECTED') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

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
          { label: 'Approved Owners', value: owners.filter((o) => o.approvalStatus === 'APPROVED').length, icon: <CheckSquare size={20} />, color: 'text-green-500' },
          { label: 'Pending Review', value: owners.filter((o) => o.approvalStatus === 'PENDING').length, icon: <CheckSquare size={20} />, color: 'text-orange-500' },
          { label: 'Total Rooms', value: owners.reduce((s, o) => s + (o.totalRooms || 0), 0), icon: <Building2 size={20} />, color: 'text-[#c9a84c]' },
          { label: 'No Hotel Yet', value: owners.filter((o) => !o.hotelId).length, icon: <Building2 size={20} />, color: 'text-slate-500' },
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
            <input
              type="text"
              placeholder="Search owner or hotel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full ${theme.textMain} placeholder:text-gray-500`}
            />
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
                  {['Owner', 'Contact', 'Hotel', 'Hotel Code', 'Status', 'Rooms', 'Actions'].map((h) => (
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
                          <Phone size={10} /> {o.contactNumber || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-black text-[#c9a84c]">{o.hotelName}</td>
                    <td className={`px-6 py-4 text-[10px] font-black ${theme.textMain}`}>{o.hotelCode || 'No Code Yet'}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusBadge(o.approvalStatus)}`}>
                        {o.approvalStatus || 'APPROVED'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-[11px] font-black ${theme.textMain}`}>{o.totalRooms}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setSelectedOwner(o)} className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${theme.border} ${theme.card} ${theme.textMain}`}>
                          <Eye size={12} /> Review
                        </button>
                        {o.approvalStatus !== 'APPROVED' ? (
                          <button type="button" onClick={() => approveOwner(o.id)} disabled={actionLoading === String(o.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60">
                            <BadgeCheck size={12} /> {actionLoading === String(o.id) ? 'Approving...' : 'Approve'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className={`px-6 py-10 text-center text-[11px] ${theme.textSub}`}>No owners found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} isDarkMode={isDarkMode} />
      </div>

      {selectedOwner ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-4xl rounded-3xl border ${theme.border} ${theme.card} ${theme.shadow} max-h-[88vh] overflow-y-auto`}>
            <div className={`sticky top-0 flex items-center justify-between border-b px-6 py-5 ${theme.border} ${theme.card}`}>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${theme.textSub}`}>Owner Review</p>
                <h3 className={`mt-2 text-2xl font-black ${theme.textMain}`}>{selectedOwner.firstName} {selectedOwner.lastName}</h3>
              </div>
              <button type="button" onClick={() => setSelectedOwner(null)} className={`rounded-full border p-2 ${theme.border} ${theme.textMain}`}>
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <section className={`rounded-2xl border p-5 ${theme.border} ${theme.inputBg}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${theme.textSub}`}>Review Status</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusBadge(selectedOwner.approvalStatus)}`}>{selectedOwner.approvalStatus || 'APPROVED'}</span>
                    <span className={`text-[11px] font-bold ${theme.textSub}`}>Joined {selectedOwner.createdAt ? new Date(selectedOwner.createdAt).toLocaleDateString() : '-'}</span>
                  </div>
                  {selectedOwner.reviewNotes ? <p className={`mt-3 text-sm ${theme.textSub}`}>{selectedOwner.reviewNotes}</p> : null}
                  {selectedOwner.approvalStatus !== 'APPROVED' ? (
                    <button type="button" onClick={() => approveOwner(selectedOwner.id)} disabled={actionLoading === String(selectedOwner.id)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-60">
                      <BadgeCheck size={14} /> {actionLoading === String(selectedOwner.id) ? 'Approving...' : 'Approve Owner'}
                    </button>
                  ) : null}
                </section>

                <section className={`rounded-2xl border p-5 ${theme.border} ${theme.inputBg}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${theme.textSub}`}>Bank Details</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className={theme.textMain}><span className={theme.textSub}>Bank:</span> {selectedOwner.bankName || '--'}</p>
                    <p className={theme.textMain}><span className={theme.textSub}>Account Name:</span> {selectedOwner.bankAccountName || '--'}</p>
                    <p className={theme.textMain}><span className={theme.textSub}>Account Number:</span> {selectedOwner.bankAccountNumber || '--'}</p>
                  </div>
                </section>

                <section className={`rounded-2xl border p-5 ${theme.border} ${theme.inputBg}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${theme.textSub}`}>Uploaded Documents</p>
                  <div className="mt-4 space-y-3">
                    {[
                      ['Business Permit', selectedOwner.businessPermitPath],
                      ['BIR Certificate', selectedOwner.birCertificatePath],
                      ['Fire Safety Certificate', selectedOwner.fireSafetyCertificatePath],
                      ['Valid ID', selectedOwner.validIdPath],
                    ].map(([label, href]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <span className="text-sm font-bold text-slate-700">{label}</span>
                        {href ? <a href={href} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9b7a2a] underline">Open File</a> : <span className="text-xs text-slate-400">Missing</span>}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className={`rounded-2xl border p-5 ${theme.border} ${theme.inputBg}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${theme.textSub}`}>Hotel Profile</p>
                  {selectedOwner.hotelBuildingImage || selectedOwner.hotelLogo ? (
                    <img src={selectedOwner.hotelBuildingImage || selectedOwner.hotelLogo} alt={selectedOwner.hotelName} className="mt-4 h-52 w-full rounded-2xl object-cover" />
                  ) : null}
                  <div className="mt-4 space-y-2 text-sm">
                    <p className={theme.textMain}><span className={theme.textSub}>Hotel:</span> {selectedOwner.hotelName || '--'}</p>
                    <p className={theme.textMain}><span className={theme.textSub}>Code:</span> {selectedOwner.hotelCode || '--'}</p>
                    <p className={theme.textMain}><span className={theme.textSub}>Address:</span> {selectedOwner.hotelAddress || '--'}</p>
                    <p className={theme.textMain}><span className={theme.textSub}>Description:</span> {selectedOwner.hotelDescription || '--'}</p>
                  </div>
                </section>

                <section className={`rounded-2xl border p-5 ${theme.border} ${theme.inputBg}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${theme.textSub}`}>Policies</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div><p className={`text-[10px] font-black uppercase tracking-[0.18em] ${theme.textSub}`}>Check-in</p><p className={`mt-1 ${theme.textMain}`}>{selectedOwner.checkInPolicy || '--'}</p></div>
                    <div><p className={`text-[10px] font-black uppercase tracking-[0.18em] ${theme.textSub}`}>Check-out</p><p className={`mt-1 ${theme.textMain}`}>{selectedOwner.checkOutPolicy || '--'}</p></div>
                    <div><p className={`text-[10px] font-black uppercase tracking-[0.18em] ${theme.textSub}`}>Cancellation</p><p className={`mt-1 ${theme.textMain}`}>{selectedOwner.cancellationPolicy || '--'}</p></div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
