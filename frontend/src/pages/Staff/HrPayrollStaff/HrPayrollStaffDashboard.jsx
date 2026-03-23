import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Users, Wallet, Clock, UserCheck, 
  TrendingUp, Activity,
  Calendar, FileText, BellRing, Loader2
} from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const HrPayrollStaffDashboard = () => {
  const [isDarkMode] = useOutletContext();
  const { qs } = useStaffSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // FETCH DATA FROM BACKEND
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`/api/hr/dashboard-stats${qs}`);
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching HR stats:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const theme = {
    container: isDarkMode ? "bg-[#050505]" : "bg-zinc-50",
    card: isDarkMode 
      ? "bg-[#0a0a0a] border-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
      : "bg-white border-zinc-200 shadow-sm",
    textMain: isDarkMode ? "text-zinc-100" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    logItem: isDarkMode ? "border-zinc-900/50" : "border-zinc-100",
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

  // Mapper para sa stats box
  const stats = [
    { label: "Active Employees", value: data?.totalEmployees || "0", icon: <Users size={20} />, trend: "+2 this month", color: "text-emerald-500" },
    { label: "Monthly Payroll", value: `₱${data?.monthlyPayroll || "0"}`, icon: <Wallet size={20} />, trend: "Due Mar 31", color: "text-[#b3903c]" },
    { label: "Present Today", value: data?.presentToday || "0", icon: <UserCheck size={20} />, trend: "Live Tracker", color: "text-blue-500" },
    { label: "Leave Requests", value: data?.pendingLeaves || "0", icon: <Clock size={20} />, trend: "Needs Approval", color: "text-amber-500" },
  ];

  return (
    <div className={`p-4 space-y-8 animate-in fade-in duration-700 transition-colors ${theme.container} min-h-screen`}>
      
      {/* 1. TOP WELCOME SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Innova-HMS Live Intelligence</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            HR & Payroll <span className="text-[#b3903c]">Command</span>
          </h1>
        </div>
        
        <div className={`flex items-center gap-4 p-3 rounded-2xl border ${theme.card}`}>
          <div className="text-right">
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>System Status</p>
            <p className="text-[11px] font-bold text-emerald-500 uppercase italic">Operational</p>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Activity size={20} className="text-emerald-500" />
          </div>
        </div>
      </div>

      {/* 2. KEY METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className={`p-6 rounded-3xl border group hover:border-[#b3903c]/50 transition-all duration-500 ${theme.card}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-[#b3903c]/10 text-[#b3903c] border border-[#b3903c]/20 group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <TrendingUp size={14} className={isDarkMode ? "text-zinc-700" : "text-zinc-300"} />
            </div>
            <h3 className={`text-3xl font-black tracking-tighter mb-1 ${theme.textMain}`}>{stat.value}</h3>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>{stat.label}</p>
            <div className="mt-4">
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'} ${stat.color}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. MAIN CONTENT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: TODAY'S ATTENDANCE (REAL DATA FROM DB) */}
        <div className={`lg:col-span-2 p-8 rounded-[2rem] border ${theme.card}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Today's Attendance</h2>
            <button className="text-[10px] font-black uppercase text-[#b3903c] hover:underline">Full Logs</button>
          </div>
          
          <div className="space-y-6">
            {data?.attendanceLogs?.length > 0 ? (
              data.attendanceLogs.map((log, idx) => (
                <div key={idx} className={`flex items-center justify-between py-2 border-b ${theme.logItem} last:border-0`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-[#b3903c]' : 'bg-zinc-100 border-zinc-200 text-[#b3903c]'}`}>
                      {log.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className={`text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{log.name}</p>
                      <p className={`text-[10px] font-bold ${theme.textSub}`}>{log.dept}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-mono ${theme.textMain}`}>{log.time}</p>
                    <p className="text-[9px] font-black text-emerald-500 uppercase italic">{log.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-xs ${theme.textSub} italic`}>No attendance logs for today.</p>
            )}
          </div>
        </div>

        {/* RIGHT: ALERTS & UTILITIES */}
        <div className="space-y-6">
          <div className={`p-8 rounded-[2rem] border bg-gradient-to-br from-[#b3903c]/10 to-transparent ${isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}`}>
            <div className="flex items-center gap-3 mb-6">
              <BellRing size={18} className="text-[#b3903c]" />
              <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Critical Alerts</h2>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-zinc-100'}`}>
                <p className={`text-[11px] font-bold ${theme.textMain} leading-relaxed`}>
                  You have <span className="text-[#b3903c]">{data?.pendingLeaves} pending</span> leave requests that require immediate review.
                </p>
              </div>
            </div>
          </div>

          <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] mb-6 ${theme.textMain}`}>HR Toolbox</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className={`flex flex-col items-center justify-center p-4 rounded-2xl border hover:border-[#b3903c] transition-all gap-2 group ${theme.utilityBtn}`}>
                <FileText size={20} className="text-zinc-500 group-hover:text-[#b3903c]" />
                <span className="text-[9px] font-black uppercase text-zinc-500">Run Payroll</span>
              </button>
              <button className={`flex flex-col items-center justify-center p-4 rounded-2xl border hover:border-[#b3903c] transition-all gap-2 group ${theme.utilityBtn}`}>
                <Users size={20} className="text-zinc-500 group-hover:text-[#b3903c]" />
                <span className="text-[9px] font-black uppercase text-zinc-500">Employees</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HrPayrollStaffDashboard;