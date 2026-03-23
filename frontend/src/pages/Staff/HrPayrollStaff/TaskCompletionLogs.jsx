import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ClipboardCheck, CheckCircle2, AlarmClock, XCircle, 
  Search, Filter, Download, BarChart3, 
  Loader2, Calendar, Activity, ArrowUpRight
} from 'lucide-react';

const TaskCompletionLogs = () => {
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
    { label: "Total Logs Today", value: "48", icon: <ClipboardCheck size={20} />, trend: "March 15, 2026", color: "text-zinc-500" },
    { label: "On-Time", value: "38", icon: <CheckCircle2 size={20} />, trend: "79.1% Rate", color: "text-emerald-500" },
    { label: "Late Completions", value: "7", icon: <AlarmClock size={20} />, trend: "Needs Attention", color: "text-orange-500" },
    { label: "Missed / Overdue", value: "3", icon: <XCircle size={20} />, trend: "Follow-up required", color: "text-rose-500" },
  ];

  const combinedLogs = [
    { name: "Collyn Fernandez", dept: "Front Desk", attendance: "Present", shift: "8AM-5PM", done: 6, assigned: 6, rate: 100, task: "VIP Check-in Suite 501", status: "Completed", color: "text-emerald-500" },
    { name: "Maria Villanueva", dept: "Housekeeping", attendance: "Present", shift: "7AM-4PM", done: 5, assigned: 6, rate: 83, task: "Suite 402 deep clean", status: "Pending", color: "text-purple-500" },
    { name: "Ben Santos", dept: "Maintenance", attendance: "On Duty", shift: "7AM-4PM", done: 3, assigned: 3, rate: 100, task: "AC repair Room 308", status: "Completed", color: "text-emerald-500" },
    { name: "Rosa Reyes", dept: "Housekeeping", attendance: "Late", shift: "8AM-5PM", done: 4, assigned: 6, rate: 67, task: "Linen change Floor 2", status: "Pending", color: "text-orange-500" },
    { name: "Jun Bautista", dept: "F&B", attendance: "Absent", shift: "-", done: 0, assigned: 4, rate: 0, task: "-", status: "Overdue", color: "text-rose-500" },
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b3903c]">Operational Log · {stats[0].trend}</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Task Completion <span className="text-[#b3903c] italic font-medium">Logs</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-black uppercase text-[10px] ${theme.utilityBtn} ${theme.textMain}`}>
            <Download size={14} /> Export Logs
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
        {/* LEFT: COMBINED ATTENDANCE & TASK LOG */}
        <div className={`lg:col-span-2 p-8 rounded-[2rem] border ${theme.card}`}>
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-[#b3903c]" />
              <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Combined Operational Log</h2>
            </div>
            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${theme.utilityBtn}`}>
              <Search size={14} className="text-zinc-500" />
              <input 
                type="text" 
                placeholder="SEARCH LOGS..." 
                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-widest w-24 text-zinc-400 placeholder:text-zinc-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>
                  <th className="px-4">Employee</th>
                  <th className="px-4">Attendance</th>
                  <th className="px-4 text-center">Tasks</th>
                  <th className="px-4">Notable Task</th>
                  <th className="px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold uppercase tracking-tight">
                {combinedLogs.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase())).map((row, i) => (
                  <tr key={i} className="group cursor-pointer">
                    <td className={`px-4 py-4 rounded-l-2xl border-y border-l ${theme.tableRow}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black ${isDarkMode ? 'bg-[#b3903c]/10 text-[#b3903c] border border-[#b3903c]/20' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                          {row.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className={theme.textMain}>{row.name}</p>
                          <p className="text-[8px] text-zinc-500 tracking-widest">{row.dept}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-4 border-y ${theme.tableRow}`}>
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black ${row.attendance === 'Absent' ? 'text-rose-500' : 'text-emerald-500'}`}>{row.attendance}</span>
                        <span className="text-[8px] text-zinc-600">{row.shift}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-4 border-y text-center ${theme.tableRow}`}>
                       <div className="flex flex-col items-center gap-1">
                          <span className={theme.textMain}>{row.done}/{row.assigned}</span>
                          <div className={`w-12 h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                            <div className={`h-full ${row.color} transition-all duration-1000`} style={{ width: `${row.rate}%` }}></div>
                          </div>
                       </div>
                    </td>
                    <td className={`px-4 py-4 border-y ${theme.tableRow} italic text-zinc-500`}>
                      {row.task}
                    </td>
                    <td className={`px-4 py-4 rounded-r-2xl border-y border-r text-right ${theme.tableRow}`}>
                       <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${row.color} ${isDarkMode ? 'bg-current/10 border-current/20' : 'bg-white border-current/20'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: DEPT COMPLETION TIMES */}
        <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Avg Completion Time</h2>
          </div>
          
          <div className="space-y-8">
            {[
              { label: "Front Desk", time: "42 min", color: "bg-purple-500", width: "60%" },
              { label: "Housekeeping", time: "58 min", color: "bg-emerald-500", width: "85%" },
              { label: "Maintenance", time: "74 min", color: "bg-orange-500", width: "95%" },
              { label: "F&B", time: "35 min", color: "bg-yellow-500", width: "45%" },
              { label: "Marketing", time: "48 min", color: "bg-blue-500", width: "65%" },
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-end">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{item.label}</p>
                  <p className={`text-sm font-black ${theme.textMain}`}>{item.time}</p>
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
          
          <div className={`mt-10 p-4 rounded-2xl border border-dashed border-zinc-800 ${isDarkMode ? 'bg-zinc-900/20' : 'bg-zinc-50'}`}>
            <p className="text-[9px] font-black text-[#b3903c] uppercase tracking-widest mb-2">Efficiency Note</p>
            <p className="text-[10px] text-zinc-500 leading-relaxed italic">Maintenance tasks are trending 12% slower than last week. Check equipment logs.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCompletionLogs;