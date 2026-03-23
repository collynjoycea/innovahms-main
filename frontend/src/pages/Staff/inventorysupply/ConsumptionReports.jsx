import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Download, Clock, Truck, Package, ShoppingCart, ArrowUpRight, Plus, X, Loader2, RefreshCcw } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const STATUS_STYLE = {
  PENDING:    'bg-amber-500/10 text-amber-500 border-amber-500/20',
  ORDERED:    'bg-blue-500/10 text-blue-500 border-blue-500/20',
  IN_TRANSIT: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  RECEIVED:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  CANCELLED:  'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function ConsumptionReports() {
  const { isDarkMode } = useOutletContext();
  const { qs, hotelId, firstName } = useStaffSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ supplier: '', expectedDate: '', totalAmount: 0, notes: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/inventory/purchase-orders${qs}`);
      const d = await res.json();
      if (res.ok) setOrders(d.orders || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/inventory/purchase-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hotelId, createdBy: firstName || 'Staff' }),
      });
      const d = await res.json();
      if (res.ok) { setMsg(`PO ${d.poNumber} created.`); setShowAdd(false); fetchOrders(); }
      else setMsg(d.error || 'Failed.');
    } catch { setMsg('Server error.'); }
    finally { setSaving(false); }
  };

  const stats = {
    pending:   orders.filter(o => ['PENDING','ORDERED'].includes(o.status)).length,
    inTransit: orders.filter(o => o.status === 'IN_TRANSIT').length,
    received:  orders.filter(o => o.status === 'RECEIVED').length,
  };

  const card = isDarkMode ? 'bg-[#0c0c0e] border-white/5' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
  const inp  = isDarkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900';

  return (
    <div className={`p-8 space-y-8 text-left animate-in fade-in duration-500 min-h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-[#b3903c]/10 text-[#b3903c]"><Activity size={14} /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#b3903c]">Supply Chain</span>
          </div>
          <h1 className={`text-4xl font-black italic tracking-tighter uppercase leading-none ${text}`}>
            Consumption <span className="text-[#b3903c]">& Orders</span>
          </h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-[#b3903c] text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase hover:scale-105 transition-all shadow-lg shadow-[#b3903c]/20">
            <Plus size={14} /> New PO
          </button>
          <button onClick={fetchOrders} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400'} transition-all`}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Pending Orders',  val: stats.pending,   icon: <Clock />,    color: 'text-[#b3903c]' },
          { label: 'In Transit',      val: stats.inTransit, icon: <Truck />,    color: 'text-sky-400' },
          { label: 'Received (All)',  val: stats.received,  icon: <Package />,  color: 'text-emerald-500' },
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border ${card}`}>
            <div className="flex justify-between items-start mb-4">
              <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>{s.label}</p>
              {React.cloneElement(s.icon, { className: s.color, size: 16 })}
            </div>
            <h3 className={`text-3xl font-black italic uppercase tracking-tighter ${text}`}>{loading ? '--' : String(s.val).padStart(2, '0')}</h3>
          </div>
        ))}
      </div>

      {/* PO LIST */}
      <div className={`rounded-[2.5rem] border overflow-hidden ${card}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-white/5' : 'border-zinc-100'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <ShoppingCart size={16} className="text-[#b3903c]" />
            <h3 className={`text-xs font-black uppercase tracking-[0.3em] ${text}`}>Purchase Orders</h3>
          </div>
          <span className={`text-[10px] font-black uppercase ${sub}`}>{orders.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/[0.02] text-zinc-500' : 'bg-zinc-50 text-zinc-400'}`}>
                <th className="px-6 py-4">PO Number</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Expected</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created By</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.03]' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr><td colSpan="6" className={`p-12 text-center text-[10px] font-bold uppercase animate-pulse ${sub}`}>Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="6" className={`p-12 text-center text-[10px] font-bold uppercase italic ${sub}`}>No purchase orders yet.</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}`}>
                  <td className="px-6 py-4"><span className="text-[11px] font-black font-mono text-[#b3903c]">{o.poNumber}</span></td>
                  <td className={`px-6 py-4 text-[11px] font-bold uppercase ${text}`}>{o.supplier}</td>
                  <td className={`px-6 py-4 text-[11px] font-black ${text}`}>₱{Number(o.totalAmount).toLocaleString()}</td>
                  <td className={`px-6 py-4 text-[10px] font-bold ${sub}`}>{o.expectedDate || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black border ${STATUS_STYLE[o.status] || STATUS_STYLE.PENDING}`}>{o.status}</span>
                  </td>
                  <td className={`px-6 py-4 text-[10px] font-bold uppercase ${sub}`}>{o.createdBy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PO MODAL */}
      {showAdd && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'} flex justify-between items-center`}>
              <h2 className="text-xl font-black uppercase tracking-tighter text-[#b3903c]">New Purchase Order</h2>
              <button onClick={() => setShowAdd(false)} className={`${sub} hover:text-red-500`}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {[
                { label: 'Supplier', key: 'supplier', type: 'text' },
                { label: 'Expected Date', key: 'expectedDate', type: 'date' },
                { label: 'Total Amount (₱)', key: 'totalAmount', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className={`w-full p-3 rounded-xl border outline-none focus:border-[#b3903c] ${inp}`} required={f.key !== 'totalAmount'} />
                </div>
              ))}
              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className={`w-full p-3 rounded-xl border outline-none focus:border-[#b3903c] resize-none ${inp}`} />
              </div>
              {msg && <p className="text-[11px] font-bold text-emerald-500">{msg}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className={`flex-1 py-3 rounded-xl border font-black uppercase text-[10px] ${isDarkMode ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-500'} transition-all`}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[#b3903c] text-black font-black uppercase text-[10px] hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null} Create PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
