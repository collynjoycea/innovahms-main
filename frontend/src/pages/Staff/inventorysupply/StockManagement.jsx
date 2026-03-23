import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Plus, Download, Filter, AlertTriangle, CheckCircle2, Edit3, Trash2, X, Loader2, RefreshCcw } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const CATEGORIES = ['All', 'Linens', 'Toiletries', 'Cleaning', 'F&B', 'Paper', 'Maintenance', 'Safety', 'General'];

const EMPTY = { skuId: '', name: '', description: '', category: 'General', unit: 'pcs', supplier: '', stockLevel: 0, minStock: 10, maxStock: 100, reorderPoint: 10, unitCost: 0 };

export default function StockManagement() {
  const { isDarkMode } = useOutletContext();
  const { qs, hotelId, firstName } = useStaffSession();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (qs) params.set('hotel_id', qs.replace('?hotel_id=', ''));
      if (search) params.set('search', search);
      if (category !== 'All') params.set('category', category);
      const res = await fetch(`/api/inventory/items?${params}`);
      const d = await res.json();
      if (res.ok) { setItems(d.items || []); setSummary(d.summary || {}); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs, search, category]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => { setForm({ ...EMPTY, hotelId }); setEditId(null); setModal('add'); setMsg(''); };
  const openEdit = (item) => {
    setForm({ skuId: item.skuId, name: item.name, description: item.description, category: item.category, unit: item.unit, supplier: item.supplier, stockLevel: item.stockLevel, minStock: item.minStock, maxStock: item.maxStock, reorderPoint: item.reorderPoint, unitCost: item.unitCost, hotelId });
    setEditId(item.id); setModal('edit'); setMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      const url = modal === 'edit' ? `/api/inventory/items/${editId}` : '/api/inventory/items';
      const method = modal === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (res.ok) { setModal(null); fetchItems(); }
      else setMsg(d.error || 'Failed.');
    } catch { setMsg('Server error.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item permanently?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/inventory/items/${id}`, { method: 'DELETE' });
      if (res.ok) fetchItems();
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-100 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
  const inp  = isDarkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900';

  return (
    <div className={`p-8 min-h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-[#fcfcfc]'}`}>
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-[#b3903c] rounded-full" />
            <h1 className={`text-4xl font-black italic uppercase tracking-tighter leading-none ${text}`}>
              Inventory <span className="text-[#b3903c]">List</span>
            </h1>
          </div>
          <p className={`text-[11px] font-black uppercase tracking-[0.25em] ml-5 ${sub}`}>
            {summary.total || 0} SKUs · {summary.critical || 0} Critical · {summary.low || 0} Low Stock
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchItems} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400'} transition-all`}>
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#b3903c] text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#b3903c]/20">
            <Plus size={16} strokeWidth={3} /> Add Item
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                category === cat ? 'bg-[#b3903c] text-black border-transparent shadow-lg shadow-[#b3903c]/20 scale-105'
                : isDarkMode ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:border-[#b3903c]/30' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
              }`}>{cat}</button>
          ))}
        </div>
        <div className={`flex items-center rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
          <Search size={15} className={`ml-4 ${sub}`} />
          <input type="text" placeholder="Search SKU or name..." value={search} onChange={e => setSearch(e.target.value)}
            className={`bg-transparent pl-3 pr-5 py-3 text-[11px] font-bold outline-none w-64 ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} />
        </div>
      </div>

      {/* TABLE */}
      <div className={`rounded-[2rem] border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/[0.02] text-zinc-500' : 'bg-zinc-50 text-zinc-400'}`}>
                <th className="px-6 py-5">SKU</th>
                <th className="px-6 py-5">Item</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Stock Level</th>
                <th className="px-6 py-5">Min / Max</th>
                <th className="px-6 py-5">Unit Cost</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/40' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr><td colSpan="8" className={`p-16 text-center text-[10px] font-bold uppercase animate-pulse ${sub}`}>Loading inventory...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="8" className={`p-16 text-center text-[10px] font-bold uppercase italic ${sub}`}>No items found.</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className={`group transition-all ${isDarkMode ? 'hover:bg-[#b3903c]/[0.02]' : 'hover:bg-zinc-50/50'}`}>
                  <td className="px-6 py-5"><span className="text-[11px] font-black font-mono text-[#b3903c]">{item.skuId}</span></td>
                  <td className="px-6 py-5">
                    <p className={`text-xs font-black uppercase ${text}`}>{item.name}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${sub}`}>{item.unit} · {item.supplier}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${isDarkMode ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-zinc-100 text-zinc-500'}`}>{item.category}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-black ${item.status === 'CRITICAL' ? 'text-red-500' : item.status === 'LOW' ? 'text-orange-500' : 'text-emerald-500'}`}>{item.stockLevel}</span>
                        <span className={`text-[9px] font-bold ${sub}`}>{item.stockPercent}%</span>
                      </div>
                      <div className={`h-1.5 w-32 rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                        <div className={`h-full rounded-full ${item.status === 'CRITICAL' ? 'bg-red-500' : item.status === 'LOW' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                          style={{ width: `${item.stockPercent}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-orange-500">{item.minStock}</span>
                      <span className={`text-[9px] ${sub}`}>/</span>
                      <span className="text-[10px] font-black text-emerald-500">{item.maxStock}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-5 text-[11px] font-black ${text}`}>₱{Number(item.unitCost).toLocaleString()}</td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                      item.status === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      item.status === 'LOW'      ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>{item.status}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => openEdit(item)} className={`p-2 rounded-lg border transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-[#b3903c]' : 'bg-white border-zinc-200 text-zinc-400 hover:text-[#b3903c]'}`}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className={`p-2 rounded-lg border transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-red-500' : 'bg-white border-zinc-200 text-zinc-400 hover:text-red-500'}`}>
                        {deleting === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {modal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'} flex justify-between items-center`}>
              <h2 className={`text-xl font-black uppercase tracking-tighter text-[#b3903c]`}>{modal === 'add' ? 'Add New Item' : 'Edit Item'}</h2>
              <button onClick={() => setModal(null)} className={`${sub} hover:text-red-500 transition-all`}><X size={22} strokeWidth={3} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              {[
                { label: 'SKU ID', key: 'skuId', type: 'text', disabled: modal === 'edit' },
                { label: 'Item Name', key: 'name', type: 'text' },
                { label: 'Unit', key: 'unit', type: 'text' },
                { label: 'Supplier', key: 'supplier', type: 'text' },
                { label: 'Stock Level', key: 'stockLevel', type: 'number' },
                { label: 'Unit Cost (₱)', key: 'unitCost', type: 'number' },
                { label: 'Min Stock', key: 'minStock', type: 'number' },
                { label: 'Max Stock', key: 'maxStock', type: 'number' },
                { label: 'Reorder Point', key: 'reorderPoint', type: 'number' },
              ].map(f => (
                <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
                  <label className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} disabled={f.disabled}
                    onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className={`w-full p-3 rounded-xl border outline-none focus:border-[#b3903c] transition-all ${inp} ${f.disabled ? 'opacity-50 cursor-not-allowed' : ''}`} required />
                </div>
              ))}
              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className={`w-full p-3 rounded-xl border outline-none focus:border-[#b3903c] transition-all ${inp}`}>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={`text-[9px] font-black uppercase tracking-widest block mb-1.5 ${sub}`}>Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className={`w-full p-3 rounded-xl border outline-none focus:border-[#b3903c] transition-all resize-none ${inp}`} />
              </div>
              {msg && <p className="col-span-2 text-rose-500 text-[11px] font-bold">{msg}</p>}
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className={`flex-1 py-3 rounded-xl border font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'border-zinc-800 text-zinc-500 hover:text-white' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900'} transition-all`}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[#b3903c] text-black font-black uppercase text-[10px] tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {modal === 'add' ? 'Add Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
