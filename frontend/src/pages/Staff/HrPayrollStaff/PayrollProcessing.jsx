import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Briefcase, Banknote, Receipt, Wallet, 
  Download, Play, Search, Filter,
  TrendingUp, Activity, Loader2
} from 'lucide-react';

const PayrollProcessing = () => {
  const [isDarkMode] = useOutletContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulation ng loading
    setTimeout(() => setLoading(false), 800);
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

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${theme.container}`}>
        <Loader2 className="animate-spin text-[#b3903c]" size={40} />
      </div>
    );
  }

  const stats = [
    { label: "Employees for Payroll", value: "48", icon: <Briefcase size={20} />, trend: "Active", color: "text-zinc-400" },
    { label: "Gross Payroll", value: "₱820k", icon: <Banknote size={20} />, trend: "Before deductions", color: "text-[#b3903c]" },
    { label: "Total Deductions", value: "₱134k", icon: <Receipt size={20} />, trend: "SSS, PhilHealth, Tax", color: "text-rose-500" },
    { label: "Net Payroll", value: "₱686k", icon: <Wallet size={20} />, trend: "Ready to release", color: "text-emerald-500" },
  ];

  const departmentBreakdown = [
    { dept: "Front Desk", amount: "₱200k", color: "bg-purple-500", width: "90%" },
    { dept: "Housekeeping", amount: "₱180k", color: "bg-emerald-500", width: "85%" },
    { dept: "Maintenance", amount: "₱120k", color: "bg-orange-500", width: "60%" },
    { dept: "F&B", amount: "₱100k", color: "bg-yellow-500", width: "50%" },
    { dept: "HR & Others", amount: "₱86k", color: "bg-pink-500", width: "40%" },
  ];

  return (
    <div className={`p-6 space-y-8 animate-in fade-in duration-700 transition-colors ${theme.container} min-h-screen`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-[#b3903c] animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b3903c]">Generate Payroll · March 2026</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Payroll <span className="text-[#b3903c]">Processing</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
            <button className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-black uppercase text-[10px] ${theme.utilityBtn} ${theme.textMain}`}>
                <Download size={14} /> Export
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#b3903c] text-black font-black uppercase text-[11px] rounded-xl hover:bg-[#967932] transition-all shadow-[0_0_15px_rgba(179,144,60,0.3)]">
                <Play size={14} fill="black" /> Run Payroll
            </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className={`p-6 rounded-3xl border group hover:border-[#b3903c]/50 transition-all duration-500 ${theme.card}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-white/5 text-[#b3903c] border border-white/5">
                {stat.icon}
              </div>
              <Activity size={14} className="text-zinc-800" />
            </div>
            <h3 className={`text-3xl font-black tracking-tighter mb-1 ${theme.textMain}`}>{stat.value}</h3>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>{stat.label}</p>
            <p className={`text-[9px] font-bold uppercase mt-3 ${stat.color} italic`}>{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: PAYROLL SUMMARY TABLE */}
        <div className={`lg:col-span-2 p-8 rounded-[2rem] border ${theme.card}`}>
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <Receipt size={18} className="text-[#b3903c]" />
              <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Payroll Summary</h2>
            </div>
            <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold ${theme.utilityBtn} ${theme.textSub}`}>
                    All Departments <Filter size={12} />
                </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>
                  <th className="px-4">Employee</th>
                  <th className="px-4">Dept</th>
                  <th className="px-4">Basic</th>
                  <th className="px-4">OT Pay</th>
                  <th className="px-4">Deductions</th>
                  <th className="px-4 text-right">Net Pay</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase tracking-tight">
                {[
                  { name: "Collyn Fernandez", dept: "Front Desk", basic: "₱28,000", ot: "₱3,500", ded: "₱4,125", net: "₱28,375" },
                  { name: "Maria Villanueva", dept: "Housekeeping", basic: "₱22,000", ot: "₱0", ded: "₱3,025", net: "₱19,475" },
                  { name: "Ben Santos", dept: "Maintenance", basic: "₱25,000", ot: "₱2,000", ded: "₱3,625", net: "₱23,875" },
                  { name: "Diana Cruz", dept: "HR", basic: "₱35,000", ot: "₱0", ded: "₱6,675", net: "₱29,825" },
                ].map((row, i) => (
                  <tr key={i} className="group cursor-pointer">
                    <td className="px-4 py-4 rounded-l-2xl border-y border-l border-white/5 bg-white/[0.01]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          {row.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className={theme.textMain}>{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-y border-white/5 bg-white/[0.01]">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] border border-blue-500/20">{row.dept}</span>
                    </td>
                    <td className="px-4 py-4 border-y border-white/5 bg-white/[0.01] text-zinc-400 font-mono">{row.basic}</td>
                    <td className="px-4 py-4 border-y border-white/5 bg-white/[0.01] text-[#b3903c] font-mono">{row.ot}</td>
                    <td className="px-4 py-4 border-y border-white/5 bg-white/[0.01] text-rose-500 font-mono">{row.ded}</td>
                    <td className="px-4 py-4 rounded-r-2xl border-y border-r border-white/5 bg-white/[0.01] text-right text-emerald-500 font-mono text-sm">{row.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: BREAKDOWN BY DEPARTMENT */}
        <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Payroll Breakdown</h2>
          </div>
          
          <div className="space-y-8">
            {departmentBreakdown.map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{item.dept}</p>
                  <p className={`text-sm font-black ${theme.textMain}`}>{item.amount}</p>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-out`} 
                    style={{ width: item.width }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollProcessing;