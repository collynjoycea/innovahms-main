import React, { useState, useEffect } from 'react';
import { 
  Search, UserPlus, Download, Eye, 
  Edit3, Filter, ChevronDown, MoreVertical,
  Loader2
} from 'lucide-react';

const EmployeeDirectory = () => {
  // Naka-force sa false para sa Light Mode experience
  const isDarkMode = false; 
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = {
    container: "bg-[#f8f9fa]", // Ultra-light gray para hindi masakit sa mata
    card: "bg-white border-zinc-200 shadow-sm shadow-zinc-200/50",
    textMain: "text-zinc-900",
    textSub: "text-zinc-500",
    tableHeader: "bg-zinc-50 text-zinc-600",
    accent: "#b3903c",
    border: "border-zinc-200"
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setEmployees([
        { id: "EMP-2026-001", name: "Collyn Fernandez", dept: "Development", pos: "Fullstack Dev", status: "Active", email: "collyn@innova.com" },
        { id: "EMP-2026-002", name: "Abby Conda", dept: "Operations", pos: "Hotel Manager", status: "Active", email: "abby@innova.com" },
        { id: "EMP-2026-003", name: "Justine Dayang", dept: "HR", pos: "HR Specialist", status: "On Leave", email: "justine@innova.com" },
        { id: "EMP-2026-004", name: "Rochelle Morales", dept: "Finance", pos: "Payroll Lead", status: "Active", email: "rochelle@innova.com" },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${theme.container}`}>
        <Loader2 className="animate-spin text-[#b3903c]" size={40} />
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-8 animate-in fade-in duration-700 transition-colors ${theme.container} min-h-screen`}>
      
      {/* 1. TOP SECTION: TITLE & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-[#b3903c] animate-pulse"></span>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.textSub}`}>Innova-HMS Registry</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Staff <span className="text-[#b3903c]">Intelligence</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300`}>
            <Download size={14} /> Export CSV
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b3903c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#9a7b30] hover:scale-105 transition-all shadow-lg shadow-[#b3903c]/20">
            <UserPlus size={14} /> Add New Staff
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className={`p-4 rounded-[1.5rem] border flex flex-col md:flex-row gap-4 items-center justify-between ${theme.card}`}>
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name, ID, or position..."
            className={`w-full pl-12 pr-4 py-3 rounded-2xl text-xs outline-none border bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#b3903c] transition-all placeholder:text-zinc-400`}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-[10px] font-black uppercase cursor-pointer border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50 transition-colors`}>
            <Filter size={14} /> All Departments <ChevronDown size={14} />
          </div>
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-[10px] font-black uppercase cursor-pointer border-zinc-200 text-zinc-600 bg-white hover:bg-zinc-50 transition-colors`}>
            Status: Active <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* 3. MAIN DIRECTORY TABLE */}
      <div className={`rounded-[2rem] border overflow-hidden ${theme.card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.tableHeader} border-b border-zinc-200`}>
                <th className="px-8 py-5">Employee Info</th>
                <th className="px-6 py-5">Position & Dept</th>
                <th className="px-6 py-5">ID Number</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {employees.map((emp, idx) => (
                <tr key={idx} className="group hover:bg-[#b3903c]/5 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs border bg-zinc-50 border-zinc-200 text-[#b3903c]`}>
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className={`text-[13px] font-black uppercase tracking-tight ${theme.textMain}`}>{emp.name}</p>
                        <p className={`text-[10px] font-bold ${theme.textSub}`}>{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black uppercase ${theme.textMain}`}>{emp.pos}</span>
                      <span className={`text-[10px] font-bold text-[#b3903c]`}>{emp.dept}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`font-mono text-[11px] ${theme.textSub}`}>{emp.id}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase italic border ${
                      emp.status === 'Active' 
                      ? 'border-emerald-500/20 text-emerald-600 bg-emerald-50' 
                      : 'border-amber-500/20 text-amber-600 bg-amber-50'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-400 hover:text-[#b3903c] hover:border-[#b3903c] transition-all">
                        <Eye size={16} />
                      </button>
                      <button className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-400 hover:text-blue-500 hover:border-blue-500 transition-all">
                        <Edit3 size={16} />
                      </button>
                      <button className="p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-400 hover:text-red-500 hover:border-red-500 transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* TABLE FOOTER / PAGINATION */}
        <div className={`px-8 py-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50`}>
          <p className={`text-[10px] font-bold ${theme.textSub}`}>Showing {employees.length} of 48 total employees</p>
          <div className="flex gap-2">
             <button className="px-3 py-1 rounded-lg border border-zinc-200 text-zinc-400 text-[10px] font-black hover:bg-white transition-colors">Prev</button>
             <button className="px-3 py-1 rounded-lg border border-[#b3903c] bg-[#b3903c] text-white text-[10px] font-black hover:bg-[#9a7b30] transition-colors shadow-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDirectory;