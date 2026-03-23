import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  FileSignature, Search, Filter, Plus, 
  Eye, Download, MoreVertical, ShieldCheck,
  FileText, Clock, AlertCircle, Loader2
} from 'lucide-react';

const EmploymentContracts = () => {
  const [isDarkMode] = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Mock loading delay para sa "Innova-HMS" feel
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const theme = {
    container: isDarkMode ? "bg-[#050505]" : "bg-zinc-50",
    card: isDarkMode 
      ? "bg-[#0a0a0a] border-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
      : "bg-white border-zinc-200 shadow-sm",
    textMain: isDarkMode ? "text-zinc-100" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    utilityBtn: isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200",
    accent: "#b3903c"
  };

  // Mock Data para sa Contracts
  const contracts = [
    { id: 1, staff: "Collyn Fernandez", type: "Full-Time", status: "Active", signedDate: "2026-01-15", expiry: "2027-01-15" },
    { id: 2, staff: "Maria Villanueva", type: "Probationary", status: "Active", signedDate: "2026-02-10", expiry: "2026-08-10" },
    { id: 3, staff: "Ben Santos", type: "Part-Time", status: "Expired", signedDate: "2025-03-01", expiry: "2026-03-01" },
    { id: 4, staff: "Diana Cruz", type: "Full-Time", status: "Active", signedDate: "2026-01-01", expiry: "2028-01-01" },
  ];

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${theme.container}`}>
        <Loader2 className="animate-spin text-[#b3903c]" size={40} />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-8 animate-in fade-in duration-700 ${theme.container} min-h-screen`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-500">Legal & Agreement Tracking</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Employment <span className="text-[#b3903c] italic font-medium">Contracts</span>
          </h1>
        </div>
        
        <button className="flex items-center gap-2 px-6 py-3 bg-[#b3903c] text-black font-black uppercase text-[11px] rounded-xl hover:scale-105 transition-all shadow-[0_0_15px_rgba(179,144,60,0.3)]">
          <Plus size={16} /> New Contract
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border ${theme.card}`}>
          <Search size={18} className="text-zinc-600" />
          <input 
            type="text" 
            placeholder="Search by employee or contract type..." 
            className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-widest w-full text-zinc-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className={`p-4 rounded-2xl border ${theme.utilityBtn} ${theme.textSub} hover:text-[#b3903c] transition-colors`}>
          <Filter size={20} />
        </button>
      </div>

      {/* CONTRACTS TABLE */}
      <div className={`rounded-[2rem] border overflow-hidden ${theme.card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/[0.02]' : 'bg-black/[0.02]'} ${theme.textSub}`}>
                <th className="px-6 py-5">Staff Member</th>
                <th className="px-6 py-5">Contract Type</th>
                <th className="px-6 py-5">Signed Date</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contracts.filter(c => c.staff.toLowerCase().includes(searchQuery.toLowerCase())).map((contract) => (
                <tr key={contract.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
                        <FileText size={16} />
                      </div>
                      <p className={`text-sm font-black uppercase tracking-tight ${theme.textMain}`}>{contract.staff}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded bg-zinc-900 border border-zinc-800 ${theme.textSub}`}>
                      {contract.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs">
                      <Clock size={12} /> {contract.signedDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1 text-[9px] font-black uppercase italic ${contract.status === 'Active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {contract.status === 'Active' ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
                      {contract.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-[#b3903c]/20 rounded-lg text-zinc-500 hover:text-[#b3903c] transition-colors">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 hover:bg-[#b3903c]/20 rounded-lg text-zinc-500 hover:text-[#b3903c] transition-colors">
                        <Download size={16} />
                      </button>
                      <button className="p-2 hover:bg-rose-500/20 rounded-lg text-zinc-500 hover:text-rose-500 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUMMARY FOOTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className={`p-6 rounded-3xl border ${theme.card} flex items-center justify-between`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>Total Active Contracts</p>
            <h4 className={`text-2xl font-black ${theme.textMain}`}>32 Agreements</h4>
          </div>
          <ShieldCheck size={32} className="text-emerald-500/20" />
        </div>
        <div className={`p-6 rounded-3xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-between`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest text-rose-500/60 mb-1`}>Expiring Soon</p>
            <h4 className={`text-2xl font-black ${theme.textMain}`}>5 Contracts</h4>
          </div>
          <AlertCircle size={32} className="text-rose-500/20" />
        </div>
      </div>
    </div>
  );
};

export default EmploymentContracts;