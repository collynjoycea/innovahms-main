import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, Download, Clock, Calendar, 
  ChevronDown, Filter, Loader2, AlertCircle,
  MoreVertical, UserCheck, UserX, AlertTriangle, Coffee
} from 'lucide-react';

import useStaffSession from '../../../hooks/useStaffSession';

const AttendanceTracking = () => {
  const [isDarkMode] = useOutletContext();
  const { qs } = useStaffSession();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. THEME CONFIGURATION
  const theme = {
    container: isDarkMode ? "bg-[#050505]" : "bg-zinc-50",
    card: isDarkMode 
      ? "bg-[#0a0a0a] border-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
      : "bg-white border-zinc-200 shadow-sm",
    textMain: isDarkMode ? "text-zinc-100" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    tableHeader: isDarkMode ? "bg-white/5 text-zinc-500" : "bg-zinc-50 text-zinc-600",
    input: isDarkMode ? "bg-[#050505] border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900",
    accent: "#b3903c"
  };

  // 2. FETCH DATA FROM DB (FLASK API)
  const fetchAttendanceData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/staff/list${qs}`);
      if (response.data) {
        const staffList = response.data.staff || [];
        const s = response.data.stats || {};
        setLogs(staffList.map(st => ({
          name: st.name,
          dept: st.role,
          time: st.clockIn || '—',
          clockOut: st.clockOut || '—',
          status: st.shiftStatus,
        })));
        setStats({
          present: s.present || 0,
          absent: s.absent || 0,
          late: staffList.filter(st => st.shiftStatus === 'Late').length,
          onLeave: 0,
        });
        setError(null);
      }
    } catch (err) {
      console.error('DB Sync Error:', err);
      setError('Failed to sync with Innova-HMS DB.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceData();
    // Auto-refresh every 30 seconds para "Live" ang feeling
    const interval = setInterval(fetchAttendanceData, 30000);
    return () => clearInterval(interval);
  }, [fetchAttendanceData]);

  // 3. SEARCH FILTER LOGIC
  const filteredLogs = logs.filter(log => 
    log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.dept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center ${theme.container}`}>
        <Loader2 className="animate-spin text-[#b3903c] mb-4" size={40} />
        <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.textSub}`}>Scanning Bio-Matrix...</p>
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-8 animate-in fade-in duration-700 transition-colors ${theme.container} min-h-screen`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.textSub}`}>Daily Time-In/Out Logs</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Attendance <span className="text-[#b3903c]">Tracking</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-600'}`}>
            <Download size={14} /> Export Report
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b3903c] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-[#b3903c]/20">
            <UserCheck size={14} /> Log Attendance
          </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Present", val: stats.present, color: "text-emerald-500", icon: <UserCheck size={20}/>, bg: "bg-emerald-500/10" },
          { label: "Absent", val: stats.absent, color: "text-rose-500", icon: <UserX size={20}/>, bg: "bg-rose-500/10" },
          { label: "Late", val: stats.late, color: "text-amber-500", icon: <AlertTriangle size={20}/>, bg: "bg-amber-500/10" },
          { label: "On Leave", val: stats.onLeave, color: "text-purple-500", icon: <Coffee size={20}/>, bg: "bg-purple-500/10" }
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-3xl border transition-transform hover:scale-[1.02] ${theme.card}`}>
             <div className={`w-10 h-10 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4 border border-current/20`}>
                {s.icon}
             </div>
             <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>{s.label}</p>
             <h3 className={`text-4xl font-black tracking-tighter mt-1 ${s.color}`}>{s.val}</h3>
          </div>
        ))}
      </div>

      {/* SEARCH & FILTERS */}
      <div className={`p-4 rounded-[1.5rem] border flex flex-col md:flex-row gap-4 items-center justify-between ${theme.card}`}>
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="Search employee history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-2xl text-xs outline-none border transition-all ${theme.input} focus:border-[#b3903c]`}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-[10px] font-black uppercase cursor-pointer ${theme.input}`}>
            <Calendar size={14} /> {new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })} <ChevronDown size={14} />
          </div>
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-[10px] font-black uppercase cursor-pointer ${theme.input}`}>
            <Filter size={14} /> All Status <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-2 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* DATA TABLE & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 rounded-[2rem] border overflow-hidden ${theme.card}`}>
           <div className="p-6 border-b border-zinc-900/10 flex justify-between items-center">
             <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Today's Live Logs</h2>
             <span className="text-[9px] font-bold text-[#b3903c] px-3 py-1 bg-[#b3903c]/10 rounded-full border border-[#b3903c]/20 italic">Intelligence Active</span>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.tableHeader} border-b ${isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}`}>
                   <th className="px-8 py-5">Personnel</th>
                   <th className="px-6 py-5">Department</th>
                   <th className="px-6 py-5">Clock In</th>
                   <th className="px-6 py-5">Clock Out</th>
                   <th className="px-6 py-5">Status</th>
                   <th className="px-8 py-5 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-900/50' : 'divide-zinc-100'}`}>
                 {filteredLogs.map((log, idx) => (
                   <tr key={idx} className="group hover:bg-[#b3903c]/5 transition-colors">
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-[#b3903c]' : 'bg-zinc-50 border-zinc-200 text-[#b3903c]'}`}>
                            {log.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className={`text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{log.name}</span>
                        </div>
                     </td>
                     <td className="px-6 py-5">
                       <span className="text-[10px] font-bold text-[#b3903c] bg-[#b3903c]/5 px-2 py-1 rounded-md border border-[#b3903c]/10">{log.dept}</span>
                     </td>
                     <td className="px-6 py-5">
                       <div className="flex flex-col">
                         <span className={`text-[11px] font-mono ${theme.textMain}`}>{log.time}</span>
                         <span className={`text-[8px] font-bold ${theme.textSub}`}>Clock In</span>
                       </div>
                     </td>
                     <td className="px-6 py-5">
                       <div className="flex flex-col">
                         <span className={`text-[11px] font-mono ${theme.textMain}`}>{log.clockOut}</span>
                         <span className={`text-[8px] font-bold ${theme.textSub}`}>Clock Out</span>
                       </div>
                     </td>
                     <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase italic border ${
                          log.status === 'Present' || log.status === 'On Duty'
                          ? 'border-emerald-500/20 text-emerald-600 bg-emerald-500/5'
                          : log.status === 'Late'
                          ? 'border-amber-500/20 text-amber-600 bg-amber-500/5'
                          : log.status === 'Completed' || log.status === 'Off Duty'
                          ? 'border-slate-500/20 text-slate-400 bg-slate-500/5'
                          : 'border-rose-500/20 text-rose-500 bg-rose-500/5'
                        }`}>
                          {log.status}
                        </span>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <button className={`p-2 rounded-lg border transition-all ${isDarkMode ? 'border-zinc-800 text-zinc-600 hover:text-white' : 'border-zinc-200 text-zinc-400'}`}>
                          <MoreVertical size={14} />
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
             {filteredLogs.length === 0 && (
               <div className={`p-10 text-center text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>
                 No records detected in the matrix.
               </div>
             )}
           </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Overtime Tracker</h2>
              <Clock size={16} className="text-[#b3903c]" />
            </div>
            
            <div className="space-y-6">
              {logs.slice(0, 4).map((log, i) => (
                <div key={i} className="flex justify-between items-center group cursor-pointer">
                  <p className={`text-[11px] font-black uppercase tracking-tight ${theme.textMain} group-hover:text-[#b3903c] transition-colors`}>{log.name}</p>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-amber-500 tracking-tighter">+1.5h OT</p>
                    <p className={`text-[9px] font-bold ${theme.textSub}`}>Est. +₱320.00</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-8 py-3 rounded-2xl border border-zinc-900/10 text-[9px] font-black uppercase tracking-[0.2em] text-[#b3903c] hover:bg-[#b3903c]/5 transition-all">
              View OT Distribution
            </button>
          </div>

          <div className={`p-8 rounded-[2rem] border bg-gradient-to-br from-[#b3903c]/10 to-transparent ${isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}`}>
            <h2 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${theme.textMain}`}>Weekly Forecast</h2>
            <p className={`text-[10px] font-bold leading-relaxed ${theme.textSub}`}>
              Predictive analytics shows a <span className="text-[#b3903c]">12% increase</span> in early clock-ins for the next week due to shifts in maintenance schedules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracking;