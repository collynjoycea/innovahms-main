import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import useStaffSession from '../../../hooks/useStaffSession';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, 
  ChevronRight, MoreHorizontal, Sun, Moon, 
  Coffee, Star, Info
} from 'lucide-react';

const HKSchedule = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const { qs } = useStaffSession();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    axios.get(`/api/housekeeping/schedule${qs}&date=${selectedDate}`)
      .then(res => setShifts(res.data.schedules || []))
      .catch(() => {});
  }, [qs, selectedDate]);

  // Build week dates around selectedDate
  const weeklyDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate);
    const day = new Date(d);
    day.setDate(d.getDate() - d.getDay() + 1 + i);
    const iso = day.toISOString().split('T')[0];
    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: String(day.getDate()),
      iso,
      status: iso < selectedDate ? 'completed' : iso === selectedDate ? 'active' : 'upcoming'
    };
  });

  const shiftIcons = { Morning: <Sun size={14}/>, Break: <Coffee size={14}/>, Afternoon: <Moon size={14}/> };
  const displayShifts = shifts.length > 0
    ? shifts.map(s => ({ time: `${s.shift_start} - ${s.shift_end}`, task: s.task_label || 'Shift', zone: s.zone || '', type: 'Morning', icon: <Sun size={14}/> }))
    : [
        { time: '08:00 AM - 12:00 PM', task: 'Morning Deep Clean',              zone: 'Level 1 & 2',      type: 'Morning',   icon: <Sun size={14}/> },
        { time: '12:00 PM - 01:00 PM', task: 'Staff Break / Handover',           zone: 'Staff Lounge',     type: 'Break',     icon: <Coffee size={14}/> },
        { time: '01:00 PM - 05:00 PM', task: 'General Maintenance & Turn-down',  zone: 'Level 3 & Suite',  type: 'Afternoon', icon: <Moon size={14}/> },
      ];

  const theme = {
    bg: isDarkMode ? "bg-[#0c0c0e]" : "bg-[#f0f0f3]",
    card: isDarkMode ? "bg-[#111111]/90 backdrop-blur-xl" : "bg-white",
    border: isDarkMode ? "border-white/10" : "border-gray-300",
    textMain: isDarkMode ? "text-white" : "text-gray-900",
    textSub: isDarkMode ? "text-gray-500" : "text-gray-400",
    gold: "#c9a84c",
    accent: "text-[#c9a84c]",
    shadow: "shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
  };

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      
      {/* 1. HEADER SECTION */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.border} mb-10`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Work <span className={theme.accent}>Schedule</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-1`}>
            Housekeeping Operations • Obsidian Sanctuary
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className={`px-4 py-2 rounded-xl border ${theme.border} ${theme.card} flex items-center gap-3`}>
              <Clock size={16} className={theme.accent} />
              <span className={`text-[11px] font-black ${theme.textMain}`}>08:00 AM - 05:00 PM</span>
              <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded uppercase">On Duty</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* 2. CALENDAR NAVIGATOR */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`${theme.card} border ${theme.border} rounded-3xl p-8 ${theme.shadow}`}>
            <div className="flex justify-between items-center mb-8">
              <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>March 2026</h2>
              <div className="flex gap-2">
                <button className={`p-2 rounded-lg border ${theme.border} hover:bg-white/5`}><ChevronLeft size={16}/></button>
                <button className={`p-2 rounded-lg border ${theme.border} hover:bg-white/5`}><ChevronRight size={16}/></button>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2">
              {weeklyDates.map((item, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedDate(item.iso)}
                  className={`flex-1 flex flex-col items-center p-4 rounded-2xl transition-all border ${
                    item.status === 'active' 
                    ? 'bg-[#c9a84c] border-[#c9a84c] scale-110 shadow-lg shadow-[#c9a84c]/20' 
                    : `hover:bg-white/5 ${theme.border}`
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-2 ${item.status === 'active' ? 'text-black' : theme.textSub}`}>
                    {item.day}
                  </span>
                  <span className={`text-xl font-black ${item.status === 'active' ? 'text-black' : theme.textMain}`}>
                    {item.date}
                  </span>
                  {item.status === 'completed' && <div className="w-1 h-1 rounded-full bg-green-500 mt-2" />}
                </button>
              ))}
            </div>
          </div>

          {/* 3. DAILY TIMELINE */}
          <div className="space-y-4">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] pl-2 ${theme.textSub}`}>Shift Timeline</h3>
            {displayShifts.map((shift, i) => (
              <div key={i} className={`${theme.card} border ${theme.border} p-6 rounded-2xl flex items-center justify-between group hover:border-[#c9a84c]/50 transition-all`}>
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${theme.border} bg-white/5 ${theme.accent}`}>
                    {shift.icon}
                  </div>
                  <div className="text-left">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.accent}`}>{shift.time}</p>
                    <h4 className={`text-lg font-black uppercase tracking-tighter ${theme.textMain}`}>{shift.task}</h4>
                    <p className={`text-[9px] font-bold ${theme.textSub} uppercase`}>{shift.zone}</p>
                  </div>
                </div>
                <MoreHorizontal size={18} className={theme.textSub} />
              </div>
            ))}
          </div>
        </div>

        {/* 4. SIDEBAR - PERFORMANCE & INFO */}
        <div className="space-y-8 text-left">
          <div className={`${theme.card} border ${theme.border} p-8 rounded-3xl ${theme.shadow} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Star size={80} fill={theme.gold} />
            </div>
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${theme.textMain}`}>Personal Stats</h3>
            <div className="space-y-6">
              {[
                { label: "Weekly Efficiency", value: "94%" },
                { label: "Rooms Cleaned", value: "128" },
                { label: "Perfect Ratings", value: "42" }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>{stat.label}</span>
                    <span className={`text-[11px] font-black ${theme.textMain}`}>{stat.value}</span>
                  </div>
                  <div className={`w-full h-1 rounded-full bg-white/5`}>
                    <div className="h-full bg-[#c9a84c] rounded-full" style={{ width: stat.value }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${theme.border} bg-[#c9a84c]/5`}>
            <div className="flex items-start gap-4">
              <Info size={20} className={theme.accent} />
              <div>
                <h5 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMain} mb-1`}>Shift Memo</h5>
                <p className={`text-[10px] font-medium leading-relaxed ${theme.textSub}`}>
                  All cleaning logs must be synced via INNOVA-HMS before end of shift. Check suite supplies on Level 4.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HKSchedule;