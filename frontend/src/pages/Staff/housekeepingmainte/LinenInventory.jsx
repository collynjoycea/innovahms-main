import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import useStaffSession from '../../../hooks/useStaffSession';
import { 
  Package, AlertTriangle, CheckCircle2, 
  ShoppingCart, History, Search,
  Plus
} from 'lucide-react';

const LinenInventory = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const { qs } = useStaffSession();
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState(null);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`/api/housekeeping/inventory${qs}`);
      setInventory(res.data.inventory || []);
      setLastSync(new Date());
    } catch {}
  };

  useEffect(() => { fetchInventory(); }, [qs]);

  const handleRestock = async (id) => {
    try {
      await axios.patch(`/api/housekeeping/inventory/${id}/restock`, { qty: 20 });
      fetchInventory();
    } catch {}
  };

  const linens     = inventory.filter(i => i.category === 'Linens'     && i.item_name.toLowerCase().includes(search.toLowerCase()));
  const toiletries = inventory.filter(i => i.category === 'Toiletries' && i.item_name.toLowerCase().includes(search.toLowerCase()));
  const lowStockCount = inventory.filter(i => i.current_qty < i.max_qty * 0.4).length;

  const theme = {
    bg:       isDarkMode ? 'bg-[#0c0c0e]'          : 'bg-[#f0f0f3]',
    card:     isDarkMode ? 'bg-[#111111]/90 backdrop-blur-xl' : 'bg-white',
    border:   isDarkMode ? 'border-white/10'        : 'border-gray-300',
    textMain: isDarkMode ? 'text-white'             : 'text-gray-900',
    textSub:  isDarkMode ? 'text-gray-500'          : 'text-gray-400',
    shadow:   'shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
  };

  const toRows = (items) => items.map(i => ({
    id:     i.id,
    item:   i.item_name,
    stock:  Math.round((i.current_qty / i.max_qty) * 100),
    qty:    `${i.current_qty}/${i.max_qty} ${i.unit}`,
    status: i.current_qty < i.max_qty * 0.4 ? 'Low Stock' : 'In Stock',
  }));

  const InventoryTable = ({ title, items }) => (
    <div className={`${theme.card} border ${theme.border} rounded-[2rem] overflow-hidden ${theme.shadow} mb-10`}>
      <div className={`px-8 py-6 border-b ${theme.border} flex justify-between items-center bg-white/5`}>
        <div className="flex items-center gap-3">
          <Package className="text-[#c9a84c]" size={20} />
          <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>{title}</h2>
        </div>
        <button className="px-5 py-2 rounded-xl bg-[#c9a84c] text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all">
          <Plus size={14} strokeWidth={3} /> Request Restock
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} border-b ${theme.border}`}>
              <th className="px-8 py-5">Item Name</th>
              <th className="px-8 py-5">Stock Level</th>
              <th className="px-8 py-5">Qty / Max</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.length === 0 ? (
              <tr><td colSpan={5} className={`px-8 py-10 text-center text-[11px] ${theme.textSub}`}>No items found.</td></tr>
            ) : items.map((row, i) => (
              <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                <td className={`px-8 py-5 text-[11px] font-bold ${theme.textMain}`}>{row.item}</td>
                <td className="px-8 py-5 w-48">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${row.stock < 40 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${row.stock}%` }} />
                    </div>
                    <span className={`text-[10px] font-black ${theme.textSub}`}>{row.stock}%</span>
                  </div>
                </td>
                <td className={`px-8 py-5 text-[10px] font-bold ${theme.textSub}`}>{row.qty}</td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                    row.status === 'Low Stock' ? 'border-red-500/30 text-red-500 bg-red-500/5' : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5'
                  }`}>
                    {row.status === 'Low Stock' && <AlertTriangle size={10} className="inline mr-1 mb-0.5" />}
                    {row.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => handleRestock(row.id)} className={`p-2 rounded-lg border ${theme.border} text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black transition-all`}>
                    <ShoppingCart size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg}`}>

      {/* HEADER */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.border} mb-10`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Linen & <span className="text-[#c9a84c]">Supplies</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-1`}>
            Stock Levels and Inventory Management
          </p>
        </div>
        <div className="flex gap-4">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${theme.border} ${theme.card}`}>
            <Search size={16} className="text-[#c9a84c]" />
            <input
              type="text"
              placeholder="Search Item..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-widest w-32"
            />
          </div>
          <button className={`p-2 rounded-xl border ${theme.border} ${theme.textMain} hover:border-[#c9a84c]/50 transition-all`}>
            <History size={18} />
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Total Items',    value: String(inventory.length), sub: 'Across all categories', icon: <Package size={20} /> },
          { label: 'Low Stock Alert', value: String(lowStockCount),   sub: 'Items need attention',  icon: <AlertTriangle size={20} className="text-red-500" /> },
          { label: 'Last Inventory', value: lastSync ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--', sub: 'Auto-synced today', icon: <CheckCircle2 size={20} className="text-emerald-500" /> },
        ].map((stat, i) => (
          <div key={i} className={`${theme.card} border ${theme.border} p-6 rounded-3xl flex items-center justify-between`}>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.textSub} mb-1`}>{stat.label}</p>
              <h4 className={`text-2xl font-black ${theme.textMain}`}>{stat.value}</h4>
              <p className={`text-[8px] font-bold ${theme.textSub} mt-1`}>{stat.sub}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl border ${theme.border} flex items-center justify-center bg-white/5 text-[#c9a84c]`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* TABLES */}
      <InventoryTable title="Linens Inventory"     items={toRows(linens)} />
      <InventoryTable title="Toiletries Inventory" items={toRows(toiletries)} />

    </div>
  );
};

export default LinenInventory;
