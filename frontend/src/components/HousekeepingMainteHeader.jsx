import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, LogOut, Moon, Sun, Hammer, ChevronDown, ClipboardList } from 'lucide-react';
import ShiftClockWidget from './ShiftClockWidget';
import useStaffSession from '../hooks/useStaffSession';
import StaffNotificationBell from './StaffNotificationBell';

const HousekeepingMainteHeader = ({ isDarkMode, toggleTheme }) => {
  const { firstName, lastName, role } = useStaffSession();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('staffSession');
    localStorage.removeItem('staffUser');
    window.dispatchEvent(new Event('staffSessionChanged'));
    navigate('/staff/login');
  };

  const theme = {
    bg:       isDarkMode ? 'bg-[#050505]/80' : 'bg-white/80',
    textMain: isDarkMode ? 'text-white'      : 'text-zinc-900',
    textSub:  isDarkMode ? 'text-zinc-500'   : 'text-zinc-400',
    border:   isDarkMode ? 'border-zinc-900' : 'border-zinc-200',
    input:    isDarkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-zinc-100 border-zinc-200',
    dropdown: isDarkMode ? 'bg-[#0d0c0a] border-white/10' : 'bg-white border-gray-100',
    gold: '#b3903c',
  };

  const displayName = `${firstName || ''} ${lastName || ''}`.trim() || 'Staff';
  const initials = `${firstName?.[0] || 'S'}${lastName?.[0] || ''}`;

  return (
    <header className={`sticky top-0 z-50 w-full h-20 border-b backdrop-blur-xl transition-all duration-300 ${theme.bg} ${theme.border}`}>
      <div className="h-full px-8 flex items-center justify-between">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-[#b3903c]/10 border border-[#b3903c]/20">
            <Hammer size={20} color={theme.gold} />
          </div>
          <div>
            <h1 className={`text-sm font-black uppercase tracking-[0.2em] italic ${theme.textMain}`}>
              Operations <span className="text-[#b3903c]">Hub</span>
            </h1>
            <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest`}>
              Housekeeping & Maintenance · {new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* CENTER */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group transition-all">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[#b3903c]" size={16} color={isDarkMode ? '#3f3f46' : '#a1a1aa'} />
            <input type="text" placeholder="Search tasks, rooms, or inventory..."
              className={`w-full h-11 pl-12 pr-4 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all outline-none focus:ring-1 focus:ring-[#b3903c]/30 ${theme.input} ${theme.textMain} placeholder:text-zinc-600`} />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${theme.border} ${theme.input}`}>
            {isDarkMode ? <Sun size={18} color={theme.gold} /> : <Moon size={18} color={theme.gold} />}
          </button>
          <StaffNotificationBell isDarkMode={isDarkMode} />
          <div className={`h-8 w-[1px] mx-1 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-200'}`} />

          <ShiftClockWidget isDarkMode={isDarkMode} />

          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`flex items-center gap-3 pl-2 p-1.5 rounded-2xl transition-all ${showProfileMenu ? (isDarkMode ? 'bg-white/5' : 'bg-gray-100') : 'hover:bg-white/5'}`}>
              <div className="text-right hidden sm:block">
                <h2 className={`text-[11px] font-black uppercase tracking-tight ${theme.textMain}`}>{displayName}</h2>
                <p className="text-[#b3903c] text-[8px] font-black uppercase tracking-[0.2em] italic">{role || 'Housekeeping'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-[#b3903c]/30 flex items-center justify-center overflow-hidden hover:border-[#b3903c] transition-all">
                <div className={`w-full h-full flex items-center justify-center font-black text-xs transition-all ${showProfileMenu ? 'bg-[#b3903c] text-black' : 'bg-[#b3903c]/10 text-[#b3903c]'}`}>
                  {initials}
                </div>
              </div>
              <ChevronDown size={14} className={`${theme.textSub} transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>
            {showProfileMenu && (
              <div className={`absolute right-0 mt-3 w-56 border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in duration-200 ${theme.dropdown}`}>
                <div className={`px-3 py-2 border-b mb-1 ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Operational Actions</p>
                </div>
                <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#b3903c]/10 hover:text-[#b3903c] text-xs transition-all ${theme.textMain}`}>
                  <ClipboardList size={16} /> My Task Logs
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500 text-xs transition-all font-bold">
                  <LogOut size={16} /> Logout Portal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HousekeepingMainteHeader;
