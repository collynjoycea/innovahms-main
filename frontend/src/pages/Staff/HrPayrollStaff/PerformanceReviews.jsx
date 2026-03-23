import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Trophy, Star, ThumbsUp, AlertTriangle, 
  Search, Filter, Edit3, Plus,
  TrendingUp, Activity, Loader2
} from 'lucide-react';

const PerformanceReviews = () => {
  const [isDarkMode] = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  // Mock data simulation base sa screenshot mo
  useEffect(() => {
    const fetchPerformance = async () => {
      // Dito mo i-call ang API mo balang araw: http://localhost:5000/api/performance
      setTimeout(() => {
        setReviews([
          { name: "Collyn Fernandez", dept: "Front Desk", tasks: 248, attendance: "95%", punctuality: "92%", score: 94, rating: "Excellent" },
          { name: "Maria Villanueva", dept: "Housekeeping", tasks: 312, attendance: "98%", punctuality: "96%", score: 89, rating: "Good" },
          { name: "Ben Santos", dept: "Maintenance", tasks: 84, attendance: "96%", punctuality: "94%", score: 92, rating: "Excellent" },
          { name: "Diana Cruz", dept: "HR", tasks: 156, attendance: "97%", punctuality: "98%", score: 88, rating: "Good" },
          { name: "Mika Torres", dept: "Marketing", tasks: 128, attendance: "94%", punctuality: "91%", score: 91, rating: "Excellent" },
        ]);
        setLoading(false);
      }, 1000);
    };
    fetchPerformance();
  }, []);

  const theme = {
    container: isDarkMode ? "bg-[#050505]" : "bg-zinc-50",
    card: isDarkMode 
      ? "bg-[#0a0a0a] border-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
      : "bg-white border-zinc-200 shadow-sm",
    textMain: isDarkMode ? "text-zinc-100" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    accent: "#b3903c"
  };

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${theme.container}`}>
        <Loader2 className="animate-spin text-[#b3903c]" size={40} />
      </div>
    );
  }

  const kpis = [
    { label: "Avg Performance Score", value: "87%", icon: <Star size={20} />, trend: "+3% MoM", color: "text-[#b3903c]" },
    { label: "Excellent (90%+)", value: "14", icon: <Trophy size={20} />, trend: "Top Performers", color: "text-emerald-500" },
    { label: "Good (75-89%)", value: "28", icon: <ThumbsUp size={20} />, trend: "Steady Growth", color: "text-blue-500" },
    { label: "Needs Improvement", value: "6", icon: <AlertTriangle size={20} />, trend: "Critical Attention", color: "text-red-500" },
  ];

  return (
    <div className={`p-6 space-y-8 animate-in fade-in duration-700 transition-colors ${theme.container} min-h-screen`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-[#b3903c] animate-pulse"></span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b3903c]">Staff KPIs and Evaluations</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Performance <span className="text-[#b3903c]">Monitoring</span>
          </h1>
        </div>
        
        <button className="flex items-center gap-2 px-6 py-3 bg-[#b3903c] text-black font-black uppercase text-[11px] rounded-xl hover:bg-[#967932] transition-all shadow-[0_0_15px_rgba(179,144,60,0.3)]">
          <Plus size={16} /> New Evaluation
        </button>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className={`p-6 rounded-3xl border group hover:border-[#b3903c]/50 transition-all duration-500 ${theme.card}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-[#b3903c]/10 text-[#b3903c] border border-[#b3903c]/20 group-hover:rotate-12 transition-transform">
                {kpi.icon}
              </div>
              <Activity size={14} className={isDarkMode ? "text-zinc-800" : "text-zinc-200"} />
            </div>
            <h3 className={`text-3xl font-black tracking-tighter mb-1 ${theme.textMain}`}>{kpi.value}</h3>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>{kpi.label}</p>
            <div className="mt-4 flex items-center gap-1">
              <TrendingUp size={10} className={kpi.color} />
              <span className={`text-[9px] font-bold uppercase ${kpi.color}`}>{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* PERFORMANCE REGISTRY TABLE */}
      <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Performance Registry</h2>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${theme.utilityBtn} w-full`}>
              <Search size={14} className="text-zinc-500" />
              <input type="text" placeholder="Search Staff..." className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-widest w-full" />
            </div>
            <div className={`p-2 rounded-xl border ${theme.utilityBtn}`}>
              <Filter size={18} className="text-zinc-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>
                <th className="px-4 pb-2">Employee</th>
                <th className="px-4 pb-2 text-center">Tasks Done</th>
                <th className="px-4 pb-2 text-center">Attendance</th>
                <th className="px-4 pb-2 text-center">Score</th>
                <th className="px-4 pb-2 text-center">Rating</th>
                <th className="px-4 pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((staff, idx) => (
                <tr key={idx} className={`group transition-all duration-300 ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]'}`}>
                  <td className="px-4 py-4 rounded-l-2xl border-y border-l border-zinc-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b3903c] to-[#7a6229] flex items-center justify-center font-black text-black text-[10px]">
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className={`text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{staff.name}</p>
                        <p className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#b3903c]/10 text-[#b3903c] inline-block mt-1`}>{staff.dept}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-y border-zinc-900/50 text-center text-[12px] font-mono font-bold text-zinc-400">{staff.tasks}</td>
                  <td className="px-4 py-4 border-y border-zinc-900/50 text-center text-[12px] font-mono font-bold text-zinc-400">{staff.attendance}</td>
                  <td className="px-4 py-4 border-y border-zinc-900/50">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                          style={{ width: `${staff.score}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-500">{staff.score}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-y border-zinc-900/50 text-center">
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border italic ${
                      staff.rating === 'Excellent' 
                      ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' 
                      : 'border-blue-500/50 text-blue-500 bg-blue-500/10'
                    }`}>
                      {staff.rating}
                    </span>
                  </td>
                  <td className="px-4 py-4 rounded-r-2xl border-y border-r border-zinc-900/50 text-right">
                    <button className="p-2 hover:bg-[#b3903c]/20 rounded-lg transition-colors group-hover:text-[#b3903c] text-zinc-600">
                      <Edit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReviews;