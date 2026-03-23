import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Home, Wrench, Clock, CheckCircle2, 
  TrendingUp, Activity, RefreshCcw,
  AlertTriangle, Loader2,
  Package, ClipboardList, ChevronRight
} from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

const HousekeepingMainteDashboard = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true }; 
  const { qs, firstName } = useStaffSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/housekeeping/dashboard-stats${qs}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        // Fallback Data
        setData({
          pendingTasks: 5,
          inProgress: 2,
          completedToday: 3,
          roomsNeedingClean: 7,
          priorityTasks: [
            { id: 103, type: 'Full Clean', staff: 'Maria V.', time: '2:00 PM', status: 'URGENT', note: 'Check-in at 2PM — VIP Guest' },
            { id: 203, type: 'Linen Change', staff: 'Rosa R.', time: '1:30 PM', status: 'HIGH', note: 'Requested by guest via concierge' },
            { id: 304, type: 'Full Clean', staff: 'Amy C.', time: '3:00 PM', status: 'NORMAL', note: 'Post checkout — standard clean' }
          ],
          roomGrid: [
            { id: 101, type: 'Standard', status: 'Avail' },
            { id: 102, type: 'Standard', status: 'Occupied' },
            { id: 103, type: 'Standard', status: 'Dirty' },
            { id: 104, type: 'Standard', status: 'Clean' },
            { id: 201, type: 'Deluxe', status: 'In Prog' },
            { id: 302, type: 'Superior', status: 'Maint.' }
          ],
          supplies: [
            { name: 'Bath Towels', current: 42, max: 100, alert: true },
            { name: 'Bed Sheets', current: 80, max: 100, alert: false },
            { name: 'Toiletries', current: 28, max: 100, alert: true }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // DYNAMIC THEME ENGINE
  const theme = {
    container: isDarkMode ? "bg-[#050505]" : "bg-[#f4f4f7]",
    card: isDarkMode ? "bg-[#0a0a0a] border-zinc-900 shadow-2xl" : "bg-white border-zinc-200 shadow-md",
    textMain: isDarkMode ? "text-zinc-100" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-600",
    
    // Button Styles
    btnSecondary: isDarkMode 
      ? "bg-zinc-900/50 border-zinc-800 text-zinc-100 hover:border-[#b3903c]/50" 
      : "bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200",
    
    btnOutline: isDarkMode
      ? "border-[#b3903c]/20 bg-[#b3903c]/5 text-[#b3903c] hover:bg-[#b3903c] hover:text-black"
      : "border-[#b3903c]/40 bg-[#b3903c]/10 text-[#b3903c] hover:bg-[#b3903c] hover:text-white",

    // Progress bar track
    track: isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-zinc-200 border-zinc-300",
    
    accent: "#b3903c",
    roomColors: {
      'Avail': isDarkMode ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-emerald-600 border-emerald-600/30 bg-emerald-50',
      'Occupied': isDarkMode ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-red-600 border-red-600/30 bg-red-50',
      'Dirty': isDarkMode ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 'text-amber-700 border-amber-700/30 bg-amber-50',
      'Clean': isDarkMode ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 'text-emerald-500 border-emerald-500/30 bg-emerald-50',
      'In Prog': isDarkMode ? 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5' : 'text-cyan-600 border-cyan-600/30 bg-cyan-50',
      'Maint.': isDarkMode ? 'text-purple-500 border-purple-500/20 bg-purple-500/5' : 'text-purple-700 border-purple-700/30 bg-purple-50',
    }
  };

  if (loading) return (
    <div className={`h-screen flex items-center justify-center ${theme.container}`}>
      <Loader2 className="animate-spin text-[#b3903c]" size={40} />
    </div>
  );

  return (
    <div className={`p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ${theme.container} min-h-screen text-left`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className={`text-4xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Good shift, <span className="text-[#b3903c]">{firstName || 'Staff'}</span>
          </h1>
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] text-[#b3903c] mt-2 opacity-90`}>
            Operations Control • INNOVA-HMS
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all ${theme.btnSecondary}`}>
            <AlertTriangle size={14} className="text-[#b3903c]" /> Report Issue
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#b3903c] text-black text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-[#b3903c]/20">
            <ClipboardList size={14} /> My Tasks
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending Tasks", val: data.pendingTasks, icon: <ClipboardList />, color: "text-amber-500" },
          { label: "In Progress", val: data.inProgress, icon: <RefreshCcw />, color: "text-cyan-500" },
          { label: "Completed Today", val: data.completedToday, icon: <CheckCircle2 />, color: "text-emerald-500" },
          { label: "Needs Cleaning", val: data.roomsNeedingClean, icon: <Home />, color: "text-red-500" },
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border transition-all duration-300 ${theme.card}`}>
            <div className="flex justify-between items-center mb-4">
              <span className={`p-2.5 rounded-xl bg-[#b3903c]/10 text-[#b3903c] border border-[#b3903c]/10`}>{s.icon}</span>
              <TrendingUp size={16} className={theme.textSub} />
            </div>
            <h3 className={`text-4xl font-black tracking-tighter ${theme.textMain}`}>{s.val}</h3>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${theme.textSub}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PRIORITY TASKS LIST */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textMain} flex items-center gap-2`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#b3903c] animate-pulse"></span>
              Live Priority Queue
            </h2>
            <button className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${theme.btnOutline}`}>
              View Schedule
            </button>
          </div>
          
          {data.priorityTasks.map((task, i) => (
            <div key={i} className={`p-5 rounded-[1.8rem] border-l-[6px] group hover:translate-x-1 transition-all border ${theme.card} ${
              task.status === 'URGENT' ? 'border-l-red-500' : 'border-l-[#b3903c]'
            }`}>
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <h3 className={`text-xl font-black uppercase tracking-tighter ${theme.textMain}`}>Unit {task.id}</h3>
                  <div className={`flex items-center gap-2 text-[10px] font-bold mt-1 ${theme.textSub}`}>
                    <Clock size={12} /> {task.time} • {task.type}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className={`text-[8px] font-black px-3 py-1 rounded-full border ${
                    task.status === 'URGENT' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>● {task.status}</span>
                </div>
              </div>
              <div className={`mt-4 p-3 rounded-xl border italic text-[11px] font-medium flex items-start gap-2 ${isDarkMode ? 'bg-[#b3903c]/5 border-[#b3903c]/10 text-[#b3903c]' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <Activity size={14} className="mt-0.5 flex-shrink-0" />
                {task.note}
              </div>
            </div>
          ))}
        </div>

        {/* SIDEBAR: ROOM GRID & SUPPLIES */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* ROOM GRID */}
          <div className={`p-6 rounded-[2rem] border ${theme.card}`}>
            <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-6 ${theme.textMain}`}>Floor Monitor</h2>
            <div className="grid grid-cols-3 gap-3">
              {data.roomGrid.map((room, i) => (
                <div key={i} className={`p-3 rounded-2xl border text-center transition-all cursor-pointer hover:scale-105 ${theme.roomColors[room.status]}`}>
                  <p className="text-xs font-black">{room.id}</p>
                  <p className="text-[7px] font-bold uppercase mt-1 opacity-80">{room.status}</p>
                </div>
              ))}
            </div>
            <button className={`w-full mt-6 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${theme.btnSecondary}`}>
              Open Visual Map
            </button>
          </div>

          {/* SUPPLIES MONITOR */}
          <div className={`p-6 rounded-[2rem] border ${theme.card}`}>
            <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-6 ${theme.textMain}`}>Inventory Alerts</h2>
            <div className="space-y-6">
              {data.supplies.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <p className={`text-[10px] font-black uppercase tracking-wide ${theme.textMain}`}>{item.name}</p>
                    <p className={`text-[10px] font-black ${item.alert ? 'text-red-500' : 'text-[#b3903c]'}`}>
                      {item.current} / {item.max}
                    </p>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden border ${theme.track}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${item.alert ? 'bg-red-500' : 'bg-[#b3903c]'}`} 
                      style={{ width: `${(item.current / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default HousekeepingMainteDashboard;