import React from 'react';
import { 
  CheckCircle2, Clock, Star, 
  ChevronRight, Calendar, Filter, Download 
} from 'lucide-react';

const HKHistory = ({ isDarkMode }) => {
  // Ultra-Adaptive Theme System (Optimized for both modes)
  const theme = {
    bg: isDarkMode ? "bg-[#0c0c0e]" : "bg-[#f4f4f7]",
    card: isDarkMode 
      ? "bg-[#111111]/90 backdrop-blur-xl border-white/5" 
      : "bg-white border-zinc-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
    innerCard: isDarkMode ? "bg-white/[0.03]" : "bg-zinc-50",
    textMain: isDarkMode ? "text-white" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-500",
    border: isDarkMode ? "border-white/5" : "border-zinc-200",
    gold: "#c9a84c", // Signature INNOVA-HMS Gold
    goldGradient: "from-[#c9a84c] to-[#a68a39]",
    shadow: isDarkMode ? "shadow-[0_20px_50px_rgba(0,0,0,0.5)]" : "shadow-[0_15px_40px_rgba(0,0,0,0.08)]"
  };

  const performanceStats = [
    { label: "COMPLETED THIS WEEK", value: "28", icon: <CheckCircle2 className="text-emerald-500" size={24} /> },
    { label: "AVG TASK TIME", value: "42min", icon: <Clock className="text-purple-500" size={24} /> },
    { label: "PERFORMANCE SCORE", value: "89%", icon: <Star className="text-yellow-500" size={24} /> }
  ];

  const historyData = [
    { id: "104", task: "Full Clean", staff: "Maria V.", status: "Completed", time: "Finished 11:30 AM" },
    { id: "204", task: "Linen Change", staff: "Rosa R.", status: "Completed", time: "Finished 10:45 AM" },
    { id: "Restaurant", task: "Common Area", staff: "Amy C.", status: "Completed", time: "Finished 8:30 AM" },
    { id: "103", task: "Full Clean", staff: "Maria V.", status: "Completed", time: "Yesterday" }
  ];

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      
      {/* 1. ADAPTIVE HEADER */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-8 ${theme.border} mb-12`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Task <span style={{ color: theme.gold }}>History</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-2`}>
            Operations Portal • Performance & Cleaning Logs
          </p>
        </div>
        <div className="flex gap-4 mt-6 md:mt-0">
          <button className={`p-3 rounded-xl border ${theme.border} ${theme.card} ${theme.textMain} hover:border-[#c9a84c]/50 transition-all`}>
            <Download size={18} />
          </button>
          <button className={`p-3 rounded-xl border ${theme.border} ${theme.card} ${theme.textMain} hover:border-[#c9a84c]/50 transition-all`}>
            <Calendar size={18} />
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS GRID (GOLDEN ACCENTS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {performanceStats.map((stat, i) => (
          <div key={i} className={`p-8 rounded-[2.5rem] border ${theme.border} ${theme.card} flex items-center justify-between shadow-xl shadow-black/10 transition-all hover:scale-[1.02]`}>
            <div className="text-left space-y-1">
              <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{stat.label}</p>
              <h3 className={`text-4xl font-black tracking-tight ${theme.textMain}`}>{stat.value}</h3>
            </div>
            <div className={`p-5 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-zinc-100'} border ${theme.border}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* 3. COMPLETED TASKS LIST */}
      <div className={`${theme.card} border rounded-[3rem] p-10 ${theme.shadow} overflow-hidden`}>
        <div className="flex items-center gap-4 mb-10">
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-[#c9a84c]/10' : 'bg-[#c9a84c]/5'} text-[#c9a84c] border border-[#c9a84c]/20`}>
            <Clock size={24} />
          </div>
          <div className="text-left">
            <h2 className={`text-xl font-black uppercase tracking-widest ${theme.textMain}`}>Completed Tasks</h2>
            <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-wider`}>Finished assignments and performance notes</p>
          </div>
        </div>

        <div className="space-y-6">
          {historyData.map((item, i) => (
            <div 
              key={i} 
              className={`group flex items-center justify-between p-6 rounded-3xl border ${theme.border} ${theme.innerCard} hover:border-[#c9a84c]/40 transition-all duration-300 cursor-pointer text-left relative overflow-hidden`}
            >
              <div className="flex items-center gap-6 relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'} flex items-center justify-center border ${isDarkMode ? 'border-emerald-500/20' : 'border-emerald-100'}`}>
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <div>
                  <h4 className={`text-[15px] font-black uppercase tracking-tight ${theme.textMain}`}>
                    {item.task} — <span style={{ color: theme.gold }}>Room {item.id}</span>
                  </h4>
                  <p className={`text-[12px] font-medium ${theme.textSub} mt-1 leading-relaxed`}>
                    Assigned to {item.staff} • {item.time}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-5 relative z-10">
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${theme.border} text-emerald-500 bg-emerald-500/5`}>
                  {item.status}
                </span>
                <ChevronRight size={20} className={`${theme.textSub} group-hover:translate-x-1 group-hover:text-[#c9a84c] transition-all`} />
              </div>

              {/* Decorative corner accent (Glassmorphism effect) */}
              <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-3xl opacity-0 group-hover:opacity-100 transition-opacity border-[#c9a84c]`} />
            </div>
          ))}
        </div>

        <button className={`w-full mt-10 py-5 rounded-2xl border-2 border-dashed ${theme.border} ${theme.card} ${theme.textSub} font-black uppercase tracking-widest text-[11px] hover:text-[#c9a84c] hover:border-[#c9a84c]/50 transition-all`}>
          Load Older Records
        </button>
      </div>
    </div>
  );
};

export default HKHistory;