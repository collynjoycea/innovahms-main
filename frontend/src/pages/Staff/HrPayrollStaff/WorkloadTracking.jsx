import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, CheckCircle2, AlertCircle, Users, 
  Search, Filter, Download, TrendingUp, 
  Loader2, LayoutGrid, Activity, ArrowUpRight
} from 'lucide-react';

const WorkloadTracking = () => {
  const [isDarkMode] = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const theme = {
    container: isDarkMode ? "bg-[#050505]" : "bg-zinc-50",
    card: isDarkMode 
      ? "bg-[#0a0a0a] border-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
      : "bg-white border-zinc-200 shadow-sm",
    tableRow: isDarkMode ? "bg-white/[0.01] border-white/5" : "bg-white border-zinc-100",
    textMain: isDarkMode ? "text-zinc-100" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    utilityBtn: isDarkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200",
    accent: "#b3903c"
  };

  const stats = [
    { label: "Total Tasks", value: "284", icon: <Box size={20} />, trend: "This Week", color: "text-zinc-500" },
    { label: "Completed", value: "231", icon: <CheckCircle2 size={20} />, trend: "81.3% Rate", color: "text-emerald-500" },
    { label: "Overloaded", value: "3", icon: <AlertCircle size={20} />, trend: "Critical", color: "text-rose-500" },
    { label: "Underutilized", value: "4", icon: <Users size={20} />, trend: "Low Load", color: "text-purple-500" },
  ];

  const workloadData = [
    { name: "Collyn Fernandez", dept: "Front Desk", assigned: 32, completed: 30, overdue: 0, capacity: 80, status: "Optimal", color: "text-emerald-500" },
    { name: "Maria Villanueva", dept: "Housekeeping", assigned: 38, completed: 31, overdue: 2, capacity: 95, status: "Overloaded", color: "text-rose-500" },
    { name: "Ben Santos", dept: "Maintenance", assigned: 22, completed: 20, overdue: 1, capacity: 55, status: "Normal", color: "text-purple-500" },
    { name: "Rosa Reyes", dept: "Housekeeping", assigned: 40, completed: 28, overdue: 4, capacity: 100, status: "Overloaded", color: "text-rose-500" },
  ];

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${theme.container}`}>
        <Loader2 className="animate-spin text-[#b3903c]" size={40} />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-8 animate-in fade-in duration-700 transition-colors ${theme.container} min-h-screen`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-[#b3903c] animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b3903c]">Capacity Monitoring · March 2026</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Staff <span className="text-[#b3903c]">Workload</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-black uppercase text-[10px] ${theme.utilityBtn} ${theme.textMain}`}>
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className={`p-6 rounded-3xl border transition-all duration-500 hover:border-[#b3903c]/40 ${theme.card}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-[#b3903c]/10 border border-[#b3903c]/20'} text-[#b3903c]`}>
                {stat.icon}
              </div>
              <Activity size={14} className={isDarkMode ? 'text-zinc-800' : 'text-zinc-200'} />
            </div>
            <h3 className={`text-3xl font-black tracking-tighter mb-1 ${theme.textMain}`}>{stat.value}</h3>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>{stat.label}</p>
            <p className={`text-[9px] font-bold uppercase mt-3 ${stat.color} italic`}>{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: STAFF CAPACITY TABLE */}
        <div className={`lg:col-span-2 p-8 rounded-[2rem] border ${theme.card}`}>
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <LayoutGrid size={18} className="text-[#b3903c]" />
              <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Individual Detail</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${theme.utilityBtn}`}>
                <Search size={14} className="text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="SEARCH..." 
                  className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-widest w-24 text-zinc-400 placeholder:text-zinc-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>
                  <th className="px-4">Employee</th>
                  <th className="px-4">Dept</th>
                  <th className="px-4 text-center">Tasks</th>
                  <th className="px-4 text-right">Capacity</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase tracking-tight">
                {workloadData.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase())).map((row, i) => (
                  <tr key={i} className="group cursor-pointer">
                    <td className={`px-4 py-4 rounded-l-2xl border-y border-l ${theme.tableRow}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black ${isDarkMode ? 'bg-[#b3903c]/10 text-[#b3903c] border border-[#b3903c]/20' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                          {row.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className={theme.textMain}>{row.name}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-4 border-y ${theme.tableRow}`}>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] border border-blue-500/20">{row.dept}</span>
                    </td>
                    <td className={`px-4 py-4 border-y text-center font-mono ${theme.tableRow} ${theme.textSub}`}>
                      {row.completed}/{row.assigned}
                    </td>
                    <td className={`px-4 py-4 rounded-r-2xl border-y border-r text-right ${theme.tableRow}`}>
                       <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-mono ${row.capacity > 90 ? 'text-rose-500' : 'text-[#b3903c]'}`}>{row.capacity}%</span>
                          <div className={`w-20 h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                            <div 
                              className={`h-full ${row.capacity > 90 ? 'bg-rose-500' : 'bg-[#b3903c]'} transition-all duration-1000`}
                              style={{ width: `${row.capacity}%` }}
                            ></div>
                          </div>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: LOAD STATUS BREAKDOWN */}
        <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Load Status</h2>
          </div>
          
          <div className="space-y-8">
            {[
              { label: "Optimal Range", count: "12 Staff", color: "bg-emerald-500", width: "70%" },
              { label: "High Capacity", count: "5 Staff", color: "bg-[#b3903c]", width: "40%" },
              { label: "Overloaded", count: "3 Staff", color: "bg-rose-500", width: "15%" },
              { label: "Underutilized", count: "4 Staff", color: "bg-purple-500", width: "20%" },
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{item.label}</p>
                  <p className={`text-sm font-black ${theme.textMain}`}>{item.count}</p>
                </div>
                <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-all duration-1000`} 
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

export default WorkloadTracking;