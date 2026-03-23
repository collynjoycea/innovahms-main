import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { X, PackagePlus, PackageMinus, ArrowDownCircle, ArrowUpCircle, History, RefreshCcw, AlertTriangle, Loader2, Download } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function StockInOut() {
  const { isDarkMode } = useOutletContext();
  const { qs, hotelId, firstName } = useStaffSession();
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'IN' | 'OUT' | null
  const [form, setForm] = useState({ itemId: '', quantity: 1, unitCost: 0, supplier: '', poNumber: '', department: '', reason: 'Regular Replenishment', notes: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [stats, setStats] = useState({ dailyDispatch: 0, restockReceived: 0, pendingApprovals: 0 });

  const fetchAll = useCallback(async () => {
    try {
      const [movRes, itemRes, lowRes] = await Promise.all([
        fetch(`/api/inventory/movements${qs}${qs ? '&' : '?'}limit=20`),
        fetch(`/api/inventory/items${qs}`),
        fetch(`/api/inventory/low-stock${qs}`),
      ]);
      const [movData, itemData, lowData] = await Promise.all([movRes.json(), itemRes.json(), lowRes.json()]);
      if (movRes.ok) {
        setMovements(movData.movements || []);
        const today = new Date().toISOString().split('T')[0];
        const todayMov = (movData.movements || []).filter(m => m.createdAt?.startsWith(today));
        setStats({
          dailyDispatch: todayMov.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
          restockReceived: todayMov.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
          pendingApprovals: 0,
        });
      }
      if (itemRes.ok) setItems(itemData.items || []);
      if (lowRes.ok) setLowStock(lowData.items || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = (type) => {
    setModal(type);
    setForm({ itemId: items[0]?.id || '', quantity: 1, unitCost: 0, supplier: '', poNumber: '', department: 'Housekeeping', reason: 'Regular Replenishment', notes: '' });
    setMsg({ text: '', type: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setMsg({ text: '', type: '' });
    try {
      const endpoint = modal === 'IN' ? '/api/inventory/stock-in' : '/api/inventory/stock-out';
      const payload = {
        itemId: Number(form.itemId), quantity: Number(form.quantity),
        performedBy: firstName || 'Staff', staffId: null,
        ...(modal === 'IN' ? { unitCost: Number(form.unitCost), supplier: form.supplier, poNumber: form.poNumber } : { department: form.department, reason: form.reason }),
        notes: form.notes,
      };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) { setMsg({ text: data.message, type: 'success' }); setModal(null); fetchAll(); }
      else setMsg({ text: data.error || 'Failed.', type: 'error' });
    } catch { setMsg({ text: 'Server error.', type: 'error' }); }
    finally { setSaving(false); }
  };

  const selectedItem = items.find(i => String(i.id) === String(form.itemId));

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/60' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
  const inp  = isDarkMode ? 'bg-[#121214] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900';

  return (
    <div className={`p-8 min-h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'} text-left`}>
      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden ${card}`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'} flex justify-between items-center`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${modal === 'IN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {modal === 'IN' ? <ArrowDownCircle size={26} /> : <ArrowUpCircle size={26} />}
                </div>
                <div>
                  <h2 className={`text-xl font-black italic uppercase tracking-tighter ${text}`}>
                    Record Stock <span className={modal === 'IN' ? 'text-emerald-500' : 'text-red-500'}>{modal}</span>
                  </h2>
                  <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Inventory Flow Control</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className={`${sub} hover:text-red-500 transition-all`}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Item *</label>
                <select value={form.itemId} onChange={e => setForm(p => ({ ...p, itemId: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-2xl border text-[11px] font-bold outline-none focus:border-[#b3903c] ${inp}`} required>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.stockLevel} {i.unit})</option>)}
                </select>
              </div>
              {selectedItem && (
                <div className={`flex justify-between px-5 py-3 rounded-2xl border ${modal === 'IN' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                  <div><p className={`text-[9px] font-bold ${sub} uppercase`}>Current Stock</p><p className="text-[11px] font-black text-sky-400">{selectedItem.stockLevel} {selectedItem.unit}</p></div>
                  <div className="text-right"><p className={`text-[9px] font-bold ${sub} uppercase`}>Reorder Point</p><p className="text-[11px] font-black text-orange-500">{selectedItem.reorderPoint}</p></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Quantity *</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border text-[11px] font-bold outline-none focus:border-[#b3903c] ${inp}`} required />
                </div>
                {modal === 'IN' ? (
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Unit Cost (₱)</label>
                    <input type="number" min="0" step="0.01" value={form.unitCost} onChange={e => setForm(p => ({ ...p, unitCost: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-2xl border text-[11px] font-bold outline-none focus:border-[#b3903c] ${inp}`} />
                  </div>
                ) : (
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Department</label>
                    <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-2xl border text-[11px] font-bold outline-none focus:border-[#b3903c] ${inp}`}>
                      {['Housekeeping','F&B Service','Maintenance','Front Desk','Admin'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {modal === 'IN' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Supplier</label>
                    <input type="text" value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-2xl border text-[11px] font-bold outline-none focus:border-[#b3903c] ${inp}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>PO Number</label>
                    <input type="text" value={form.poNumber} onChange={e => setForm(p => ({ ...p, poNumber: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-2xl border text-[11px] font-bold outline-none focus:border-[#b3903c] ${inp}`} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Reason</label>
                  <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border text-[11px] font-bold outline-none focus:border-[#b3903c] ${inp}`}>
                    {['Regular Replenishment','Guest Request','Damage Replacement','Maintenance Use','Event Setup'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-2xl border text-[11px] font-bold outline-none resize-none focus:border-[#b3903c] ${inp}`} />
              </div>
              {msg.text && <p className={`text-[11px] font-bold ${msg.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{msg.text}</p>}
              <button type="submit" disabled={saving}
                className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${modal === 'IN' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {modal === 'IN' ? 'Verify & Add to Inventory' : 'Confirm Disbursement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LOW STOCK ALERT BAR */}
      {lowStock.length > 0 && (
        <div className="mb-6 flex items-center gap-4 px-5 py-3 rounded-2xl border border-red-500/20 bg-red-500/5">
          <AlertTriangle size={14} className="text-red-500 animate-pulse shrink-0" />
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
            {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low: {lowStock.slice(0,3).map(i => i.name).join(', ')}{lowStock.length > 3 ? '...' : ''}
          </p>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div>
          <h1 className={`text-4xl font-black italic uppercase tracking-tighter leading-none ${text}`}>
            Stock <span className="text-[#b3903c]">Movements</span>
          </h1>
          <p className={`text-[11px] font-bold uppercase tracking-widest mt-2 ${sub}`}>Live monitoring of inventory inflow and disbursement</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openModal('IN')} className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
            <PackagePlus size={16} /> Stock In
          </button>
          <button onClick={() => openModal('OUT')} className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-105 transition-all">
            <PackageMinus size={16} /> Stock Out
          </button>
          <button onClick={fetchAll} className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400'} transition-all`}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Daily Dispatch',    val: stats.dailyDispatch,    color: 'text-red-500',     desc: 'Units out today' },
          { label: 'Restock Received',  val: stats.restockReceived,  color: 'text-emerald-500', desc: 'Units in today' },
          { label: 'Low Stock Items',   val: lowStock.length,        color: 'text-[#b3903c]',   desc: 'Need reorder' },
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border ${card} transition-all hover:border-[#b3903c]/50`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${sub} mb-1`}>{s.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${text}`}>{loading ? '--' : s.val}</h2>
            <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${s.color}`}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* MOVEMENTS TABLE */}
      <div className={`rounded-[2.5rem] border overflow-hidden ${card}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-zinc-500/10' : 'border-zinc-100'} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#b3903c] animate-ping" />
            <h3 className={`text-xs font-black uppercase tracking-[0.3em] ${text}`}>Real-time Movement Archive</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub} border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-100'}`}>
                <th className="px-6 py-4 text-left">Item</th>
                <th className="px-6 py-4 text-center">Flow</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4 text-left">Dept / Supplier</th>
                <th className="px-6 py-4 text-left">By</th>
                <th className="px-6 py-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/40' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr><td colSpan="6" className={`p-12 text-center text-[10px] font-bold uppercase animate-pulse ${sub}`}>Loading movements...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan="6" className={`p-12 text-center text-[10px] font-bold uppercase italic ${sub}`}>No movements recorded yet.</td></tr>
              ) : movements.map((m, i) => (
                <tr key={i} className={`group hover:bg-[#b3903c]/[0.03] transition-all`}>
                  <td className="px-6 py-4">
                    <p className={`text-[11px] font-black uppercase ${text}`}>{m.itemName}</p>
                    <p className="text-[8px] font-bold text-[#b3903c] uppercase tracking-widest">{m.skuId}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest border ${m.type === 'IN' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                      {m.type === 'IN' ? 'INFLOW' : 'OUTFLOW'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-center font-black text-sm ${m.type === 'IN' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {m.type === 'IN' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className={`px-6 py-4 text-[10px] font-bold uppercase ${sub}`}>{m.department || m.supplier || '—'}</td>
                  <td className={`px-6 py-4 text-[10px] font-bold uppercase ${sub}`}>{m.performedBy}</td>
                  <td className={`px-6 py-4 text-right text-[10px] font-bold font-mono italic ${sub}`}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
