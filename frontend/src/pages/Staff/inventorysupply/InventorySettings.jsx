import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Bell, Settings2, Warehouse, Bot, Tags, Edit3, Loader2, CheckCircle2 } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function InventorySettings() {
  const { isDarkMode } = useOutletContext();
  const { qs, hotelId } = useStaffSession();
  const [settings, setSettings] = useState({
    criticalThreshold: 15, lowThreshold: 30, overstockThreshold: 95,
    autoPo: true, emailAlerts: true, smsAlerts: false,
    storageLocation: 'Basement Level B1', capacitySqm: 280, managerName: '',
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [setRes, itemRes] = await Promise.all([
        fetch(`/api/inventory/settings${qs}`),
        fetch(`/api/inventory/items${qs}`),
      ]);
      const [setData, itemData] = await Promise.all([setRes.json(), itemRes.json()]);
      if (setRes.ok) setSettings(setData);
      if (itemRes.ok) {
        const cats = {};
        (itemData.items || []).forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
        setCategories(Object.entries(cats).map(([name, count]) => ({ name, count })));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [qs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch('/api/inventory/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, hotelId }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const inp = isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const card = isDarkMode ? 'bg-zinc-900/20 border-white/5' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  if (loading) return <div className={`h-screen flex items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-[#f8f9fa]'}`}><Loader2 size={32} className="animate-spin text-[#b3903c]" /></div>;

  return (
    <div className={`p-8 space-y-8 text-left min-h-screen ${isDarkMode ? 'bg-black' : 'bg-[#f8f9fa]'}`}>
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-8 ${isDarkMode ? 'border-white/5' : 'border-zinc-200'}`}>
        <div>
          <h1 className={`text-3xl font-black italic tracking-tighter uppercase ${text}`}>Inventory Settings</h1>
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${sub}`}>Thresholds, Alerts & Auto-Order Rules</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-3 bg-[#b3903c] text-black px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-[#b3903c]/10 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: THRESHOLDS & AUTO-ORDER */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`p-8 rounded-[2.5rem] border space-y-8 ${card}`}>
            <div className="flex items-center gap-3">
              <Bell className="text-[#b3903c]" size={18} />
              <h3 className={`text-xs font-black uppercase tracking-widest ${text}`}>Alert Thresholds</h3>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Critical Level (% of Max)', key: 'criticalThreshold', sub: 'Items below this % flagged as CRITICAL' },
                { label: 'Low Stock Level (% of Max)', key: 'lowThreshold',     sub: 'Items below this % flagged as LOW STOCK' },
                { label: 'Overstock Level (% of Max)', key: 'overstockThreshold', sub: '' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${sub}`}>{f.label}</label>
                  <input type="number" min="1" max="100" value={settings[f.key]}
                    onChange={e => setSettings(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    className={`w-full mt-2 border rounded-2xl px-6 py-4 text-sm font-bold focus:border-[#b3903c]/40 outline-none transition-all ${inp}`} />
                  {f.sub && <p className={`text-[9px] font-medium italic ml-1 mt-1 ${sub}`}>{f.sub}</p>}
                </div>
              ))}
            </div>

            <div className={`pt-6 border-t space-y-6 ${isDarkMode ? 'border-white/5' : 'border-zinc-100'}`}>
              <div className="flex items-center gap-3">
                <Bot className="text-[#b3903c]" size={18} />
                <h3 className={`text-xs font-black uppercase tracking-widest ${text}`}>Auto-Ordering</h3>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Enable auto-PO for critical items', key: 'autoPo' },
                  { label: 'Email alerts to manager on low stock', key: 'emailAlerts' },
                  { label: 'SMS alert to supplier on auto-PO', key: 'smsAlerts' },
                ].map(t => (
                  <div key={t.key} className="flex justify-between items-center group cursor-pointer" onClick={() => setSettings(p => ({ ...p, [t.key]: !p[t.key] }))}>
                    <span className={`text-[11px] font-bold group-hover:${isDarkMode ? 'text-white' : 'text-zinc-900'} transition-colors ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{t.label}</span>
                    <div className={`w-12 h-6 rounded-full p-1 transition-all ${settings[t.key] ? 'bg-[#b3903c]' : isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${settings[t.key] ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: CATEGORIES & WAREHOUSE */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-8 rounded-[2.5rem] border space-y-6 ${card}`}>
            <div className="flex items-center gap-3">
              <Tags className="text-[#b3903c]" size={18} />
              <h3 className={`text-xs font-black uppercase tracking-widest ${text}`}>Category Summary</h3>
            </div>
            <div className="space-y-1">
              {categories.length === 0 ? (
                <p className={`text-[10px] italic ${sub}`}>No items in inventory yet.</p>
              ) : categories.map((cat, i) => (
                <div key={i} className={`flex justify-between items-center py-3 px-4 rounded-xl transition-all group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}`}>
                  <span className={`text-[11px] font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{cat.name}</span>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black uppercase ${sub}`}>{cat.count} items</span>
                    <Edit3 size={14} className={`${sub} group-hover:text-[#b3903c] transition-colors`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-8 rounded-[2.5rem] border space-y-6 ${card}`}>
            <div className="flex items-center gap-3">
              <Warehouse className="text-[#b3903c]" size={18} />
              <h3 className={`text-xs font-black uppercase tracking-widest ${text}`}>Warehouse Info</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${sub}`}>Storage Location</label>
                <input type="text" value={settings.storageLocation}
                  onChange={e => setSettings(p => ({ ...p, storageLocation: e.target.value }))}
                  className={`w-full mt-2 border rounded-2xl px-6 py-4 text-[11px] font-bold outline-none focus:border-[#b3903c]/40 ${inp}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${sub}`}>Capacity (SQM)</label>
                  <input type="number" value={settings.capacitySqm}
                    onChange={e => setSettings(p => ({ ...p, capacitySqm: Number(e.target.value) }))}
                    className={`w-full mt-2 border rounded-2xl px-6 py-4 text-[11px] font-bold outline-none focus:border-[#b3903c]/40 ${inp}`} />
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${sub}`}>Manager</label>
                  <input type="text" value={settings.managerName}
                    onChange={e => setSettings(p => ({ ...p, managerName: e.target.value }))}
                    className={`w-full mt-2 border rounded-2xl px-6 py-4 text-[11px] font-bold outline-none focus:border-[#b3903c]/40 italic ${inp}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
