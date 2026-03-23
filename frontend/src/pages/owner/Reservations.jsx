import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, Filter, AlertTriangle, CheckCircle2,
  Clock, XCircle, Trash2, Ban, RefreshCw, ChevronDown
} from 'lucide-react';

const STATUS_COLORS = {
  PENDING:    'bg-orange-100 text-orange-600 border-orange-200',
  CONFIRMED:  'bg-blue-100 text-blue-600 border-blue-200',
  CHECKED_IN: 'bg-green-100 text-green-600 border-green-200',
  CANCELLED:  'bg-red-100 text-red-600 border-red-200',
  CHECKED_OUT:'bg-gray-100 text-gray-500 border-gray-200',
};

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [stats, setStats]               = useState({});
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showDoubleOnly, setShowDoubleOnly] = useState(false);
  const [actionLoading, setActionLoading]   = useState(null);
  const [toast, setToast]               = useState('');

  const ownerSession = (() => {
    try { return JSON.parse(localStorage.getItem('ownerSession') || '{}'); } catch { return {}; }
  })();
  const ownerId = ownerSession?.id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = ownerId ? `/api/owner/reservations?owner_id=${ownerId}` : '/api/owner/reservations';
      const res = await fetch(url);
      const data = await res.json();
      setReservations(data.reservations || []);
      setStats(data.stats || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [ownerId]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    setActionLoading(id + '-cancel');
    try {
      const res = await fetch(`/api/owner/reservations/${id}/cancel`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Reservation cancelled.');
      load();
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this reservation? This cannot be undone.')) return;
    setActionLoading(id + '-delete');
    try {
      const res = await fetch(`/api/owner/reservations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Reservation deleted.');
      load();
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setActionLoading(null); }
  };

  const exportCSV = () => {
    const rows = [['Booking #','Guest','Room','Check-in','Check-out','Nights','Amount','Status','Payment']];
    filtered.forEach(r => rows.push([r.bookingNumber, r.customerName, r.roomNo, r.checkIn, r.checkOut, r.nights, r.amount, r.status, r.paymentMethod]));
    const csv = rows.map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `reservations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filtered = reservations.filter(r => {
    const matchSearch = `${r.customerName} ${r.bookingNumber} ${r.roomNo} ${r.roomName}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchDouble = !showDoubleOnly || r.isDoubleBooked;
    return matchSearch && matchStatus && matchDouble;
  });

  const statCards = [
    { label: 'Total', value: stats.total ?? 0, color: 'text-gray-800', filter: 'ALL' },
    { label: 'Pending', value: stats.pending ?? 0, color: 'text-orange-600', filter: 'PENDING' },
    { label: 'Confirmed', value: stats.confirmed ?? 0, color: 'text-blue-600', filter: 'CONFIRMED' },
    { label: 'Checked In', value: stats.checkedIn ?? 0, color: 'text-green-600', filter: 'CHECKED_IN' },
    { label: 'Cancelled', value: stats.cancelled ?? 0, color: 'text-red-500', filter: 'CANCELLED' },
    { label: '⚠ Double Booked', value: stats.doubleBooked ?? 0, color: 'text-red-600', filter: 'DOUBLE' },
  ];

  return (
    <div className="p-6 bg-[#F8F9FA] min-h-screen font-sans">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#1a160d] text-white px-5 py-3 rounded-xl shadow-2xl text-[11px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-800">
            Reservations <span className="text-[#bf9b30]">Management</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Today: {stats.todayCheckins ?? 0} check-ins · {stats.todayCheckouts ?? 0} check-outs
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-[10px] font-black uppercase text-gray-500 hover:border-[#bf9b30] transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-[#bf9b30] text-[#0d0c0a] rounded-lg text-[10px] font-black uppercase hover:bg-[#d4ac37] transition-all">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map(s => (
          <button key={s.filter}
            onClick={() => { if (s.filter === 'DOUBLE') { setShowDoubleOnly(true); setStatusFilter('ALL'); } else { setShowDoubleOnly(false); setStatusFilter(s.filter); } }}
            className={`p-4 bg-white border rounded-xl text-left transition-all hover:shadow-md ${
              (s.filter === 'DOUBLE' ? showDoubleOnly : statusFilter === s.filter && !showDoubleOnly)
                ? 'border-[#bf9b30] ring-2 ring-[#bf9b30]/20' : 'border-gray-100'
            }`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* DOUBLE BOOKING ALERT */}
      {(stats.doubleBooked ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 mb-5 rounded-xl border border-red-200 bg-red-50">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-black text-red-700">
              {stats.doubleBooked} double booking{stats.doubleBooked > 1 ? 's' : ''} detected!
            </p>
            <p className="text-[11px] text-red-500 mt-0.5">Same room reserved by multiple guests on overlapping dates. Cancel or delete the duplicates below.</p>
          </div>
          <button onClick={() => { setShowDoubleOnly(true); setStatusFilter('ALL'); }}
            className="px-4 py-2 bg-red-500 text-white text-[10px] font-black uppercase rounded-lg hover:bg-red-600 transition-all flex-shrink-0">
            View All
          </button>
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl flex-1 md:max-w-xs">
          <Search size={14} className="text-gray-400" />
          <input type="text" placeholder="Search guest, booking #, room..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm w-full text-gray-700 placeholder:text-gray-400" />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl">
          <Filter size={13} className="text-gray-400" />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setShowDoubleOnly(false); }}
            className="bg-transparent outline-none text-sm text-gray-600 font-bold cursor-pointer">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="CHECKED_OUT">Checked Out</option>
          </select>
        </div>
        {(showDoubleOnly || statusFilter !== 'ALL' || search) && (
          <button onClick={() => { setShowDoubleOnly(false); setStatusFilter('ALL'); setSearch(''); }}
            className="px-4 py-2 text-[10px] font-black text-[#bf9b30] border border-[#bf9b30]/30 rounded-xl hover:bg-[#bf9b30]/5 transition-all uppercase tracking-widest">
            Clear Filters
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#bf9b30] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Booking #','Guest','Room','Dates','Nights','Amount','Status','Payment','Actions'].map(h => (
                    <th key={h} className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50/50 transition-colors ${r.isDoubleBooked ? 'bg-red-50/40' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {r.isDoubleBooked && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" title="Double booking!" />}
                        <span className="text-[11px] font-black text-[#bf9b30]">{r.bookingNumber}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[11px] font-black text-gray-800">{r.customerName}</p>
                      <p className="text-[9px] text-gray-400">{r.customerEmail}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[11px] font-bold text-gray-700">{r.roomNo}</p>
                      <p className="text-[9px] text-gray-400">{r.roomName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[10px] font-bold text-gray-700">{r.checkIn}</p>
                      <p className="text-[9px] text-gray-400">→ {r.checkOut}</p>
                    </td>
                    <td className="px-5 py-4 text-[11px] font-black text-gray-700">{r.nights}</td>
                    <td className="px-5 py-4 text-[11px] font-black text-gray-800">₱{Number(r.amount).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[8px] font-black px-2 py-1 rounded-full border uppercase ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[10px] font-bold text-gray-600 uppercase">{r.paymentMethod}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {r.status !== 'CANCELLED' && r.status !== 'CHECKED_OUT' && (
                          <button onClick={() => handleCancel(r.id)}
                            disabled={actionLoading === r.id + '-cancel'}
                            title="Cancel reservation"
                            className="p-1.5 rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-50 transition-all disabled:opacity-40">
                            {actionLoading === r.id + '-cancel'
                              ? <RefreshCw size={12} className="animate-spin" />
                              : <Ban size={12} />}
                          </button>
                        )}
                        <button onClick={() => handleDelete(r.id)}
                          disabled={actionLoading === r.id + '-delete'}
                          title="Delete reservation permanently"
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-40">
                          {actionLoading === r.id + '-delete'
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <Trash2 size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-[11px] text-gray-400 uppercase tracking-widest">
                    No reservations found.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
