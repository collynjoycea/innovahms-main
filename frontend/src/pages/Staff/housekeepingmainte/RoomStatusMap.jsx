import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Search, Filter, Map as MapIcon, 
  Info, Bell, User, CheckCircle2, 
  AlertCircle, Clock, Hammer
} from 'lucide-react';

const RoomStatusMap = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };

  const theme = {
    bg: isDarkMode ? "bg-[#0c0c0e]" : "bg-[#f0f0f3]",
    card: isDarkMode ? "bg-[#111111]/90 backdrop-blur-xl" : "bg-white",
    border: isDarkMode ? "border-white/10" : "border-gray-300",
    textMain: isDarkMode ? "text-white" : "text-gray-900",
    textSub: isDarkMode ? "text-gray-500" : "text-gray-400",
    gold: "#c9a84c",
    goldGradient: "from-[#c9a84c] to-[#a68a39]",
    shadow: "shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
  };

  const statusColors = {
    Available: { border: "border-emerald-500/50", text: "text-emerald-500", bg: "bg-emerald-500/5", label: "Avail" },
    Occupied: { border: "border-red-500/50", text: "text-red-500", bg: "bg-red-500/5", label: "Occupied" },
    Dirty: { border: "border-[#c9a84c]/50", text: "text-[#c9a84c]", bg: "bg-[#c9a84c]/5", label: "Dirty" },
    Clean: { border: "border-emerald-400/50", text: "text-emerald-400", bg: "bg-emerald-400/5", label: "Clean ✓" },
    InProgress: { border: "border-cyan-500/50", text: "text-cyan-500", bg: "bg-cyan-500/5", label: "In Prog" },
    Maintenance: { border: "border-purple-500/50", text: "text-purple-500", bg: "bg-purple-500/5", label: "Maint." }
  };

  const rooms = [
    { id: '101', type: 'Standard', status: 'Available' },
    { id: '102', type: 'Standard', status: 'Occupied' },
    { id: '103', type: 'Standard', status: 'Dirty' },
    { id: '104', type: 'Standard', status: 'Clean' },
    { id: '201', type: 'Deluxe', status: 'InProgress' },
    { id: '202', type: 'Deluxe', status: 'Occupied' },
    { id: '203', type: 'Deluxe', status: 'Dirty' },
    { id: '204', type: 'Deluxe', status: 'Available' },
    { id: '205', type: 'Deluxe', status: 'Clean' },
    { id: '301', type: 'Superior', status: 'Occupied' },
    { id: '302', type: 'Superior', status: 'Maintenance' },
    { id: '303', type: 'Superior', status: 'Available' },
    { id: '304', type: 'Superior', status: 'Dirty' },
    { id: '401', type: 'Suite', status: 'Occupied' },
    { id: '402', type: 'Suite', status: 'Available' },
    { id: '501', type: 'Pres.', status: 'Occupied' },
  ];

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      
      {/* HEADER SECTION */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.border} mb-10`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Room Status <span className="text-[#c9a84c]">Map</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-1`}>
            Live Room Status • Click to Update
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${theme.border} ${theme.card}`}>
            <Search size={16} className="text-[#c9a84c]" />
            <input 
              type="text" 
              placeholder="Search Room..." 
              className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-widest w-32"
            />
          </div>
          <button className="px-6 py-2 rounded-xl bg-[#c9a84c] text-black font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[#c9a84c]/20">
            <Filter size={16} className="inline mr-2" /> Filter
          </button>
        </div>
      </div>

      {/* LEGEND SECTION */}
      <div className={`${theme.card} border ${theme.border} p-4 rounded-2xl mb-8 flex flex-wrap gap-6 items-center justify-center`}>
        {Object.entries(statusColors).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-sm ${value.bg.replace('/5', '')} border ${value.border}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textMain}`}>{key}</span>
          </div>
        ))}
      </div>

      {/* ROOM GRID */}
      <div className={`${theme.card} border ${theme.border} p-10 rounded-[2.5rem] ${theme.shadow}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
          {rooms.map((room) => (
            <button 
              key={room.id}
              className={`relative p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-105 group ${statusColors[room.status].border} ${statusColors[room.status].bg}`}
            >
              {/* Room Number */}
              <div className="text-center space-y-1">
                <h4 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain} group-hover:text-[#c9a84c]`}>
                  {room.id}
                </h4>
                <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>
                  {room.type}
                </p>
              </div>

              {/* Status Badge */}
              <div className={`mt-4 py-1.5 rounded-lg border ${statusColors[room.status].border} bg-black/20`}>
                <span className={`text-[9px] font-black uppercase tracking-widest ${statusColors[room.status].text}`}>
                  {statusColors[room.status].label}
                </span>
              </div>

              {/* Decorative Corner Accent */}
              <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity border-[#c9a84c]`} />
            </button>
          ))}
        </div>
      </div>

      {/* FOOTER INFO */}
      <div className="mt-10 flex flex-col md:flex-row gap-6">
        <div className={`flex-1 p-6 rounded-2xl border ${theme.border} bg-[#c9a84c]/5 flex items-center gap-4 text-left`}>
            <div className="p-3 rounded-xl bg-[#c9a84c] text-black">
                <Clock size={20} strokeWidth={3} />
            </div>
            <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMain}`}>Last Sync</p>
                <p className={`text-[12px] font-bold ${theme.textSub}`}>March 20, 2026 - 03:54 AM</p>
            </div>
        </div>
        <div className={`flex-1 p-6 rounded-2xl border ${theme.border} bg-white/5 flex items-center gap-4 text-left`}>
            <div className="p-3 rounded-xl bg-emerald-500 text-black">
                <CheckCircle2 size={20} strokeWidth={3} />
            </div>
            <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMain}`}>Cleaning Efficiency</p>
                <p className={`text-[12px] font-bold ${theme.textSub}`}>98.2% Optimal</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RoomStatusMap;