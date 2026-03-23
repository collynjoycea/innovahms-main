import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, User, Bell, Search, ChevronDown, UserCircle, Clock, PackageSearch } from 'lucide-react';
import ShiftClockWidget from './ShiftClockWidget';
import useStaffSession from '../hooks/useStaffSession';

const InventoryHeader = ({ isDarkMode, toggleTheme }) => {
  const { firstName, lastName, role } = useStaffSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('staffSession');
    localStorage.removeItem('staffUser');
    window.dispatchEvent(new Event('staffSessionChanged'));
    navigate('/staff/login');
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

  return (
    <header className={`h-20 border-b flex items-center justify-between px-10 sticky top-0 z-40 transition-all duration-300 
      ${isDarkMode ? 'bg-[#0d0c0a] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
      
      {/* LEFT: TITLE & SUBTITLE */}
      <div className="flex flex-col text-left">
        <h2 className={`text-xl font-bold tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {location.pathname.includes('dashboard') ? 'Inventory Dashboard' : 'Inventory Management'}
        </h2>
        <p className={`text-[10px] font-medium tracking-widest mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          SUPPLY CHAIN <span className="text-[#b3903c]">OPERATIONS</span> · {currentDate}
        </p>
      </div>

      {/* CENTER: SEARCH (Tailored for Inventory) */}
      <div className={`hidden lg:flex items-center border rounded-xl px-4 py-2.5 w-80 transition-all
        ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <PackageSearch size={16} className="text-gray-500" />
        <input 
          type="text" 
          placeholder="Search items, SKU, or suppliers..." 
          className={`bg-transparent border-none text-sm ml-3 focus:outline-none w-full ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} 
        />
      </div>

      {/* RIGHT: ACTIONS */}
      <div className="flex items-center gap-3">
        
        <div className={`flex items-center gap-1 mr-2 border-r pr-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
          {/* THEME TOGGLE */}
          <button 
            onClick={toggleTheme} 
            className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-[#b3903c]' : 'hover:bg-gray-100 text-gray-500 hover:text-[#b3903c]'}`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {/* NOTIFICATIONS */}
          <button className={`p-2.5 rounded-xl relative ${isDarkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <Bell size={18} />
            <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-600 rounded-full border ${isDarkMode ? 'border-[#0d0c0a]' : 'border-white'}`} />
          </button>
        </div>

        {/* PROFILE DROPDOWN */}
        <ShiftClockWidget isDarkMode={isDarkMode} />

        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)} 
            className={`flex items-center gap-3 p-1.5 pr-3 rounded-2xl transition-all duration-300 
              ${showProfileMenu ? (isDarkMode ? 'bg-white/10' : 'bg-gray-100') : 'hover:bg-white/5'}`}
          >
            <div className="w-9 h-9 rounded-xl border border-[#b3903c]/30 p-0.5 bg-gradient-to-tr from-[#b3903c]/20 to-transparent">
              <div className={`w-full h-full rounded-lg flex items-center justify-center text-[#b3903c] ${isDarkMode ? 'bg-[#14130f]' : 'bg-white shadow-sm'}`}>
                <User size={18} />
              </div>
            </div>
            <div className="text-left hidden sm:block">
              <p className={`text-xs font-bold uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Staff'}</p>
              <p className="text-[9px] font-bold text-[#b3903c]/60 tracking-widest mt-1">{role || 'INVENTORY DEPT'}</p>
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* DROPDOWN MENU */}
          {showProfileMenu && (
            <div className={`absolute right-0 mt-3 w-56 border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in duration-200 
              ${isDarkMode ? 'bg-[#14130f] border-white/10 text-gray-300' : 'bg-white border-gray-100 text-gray-700'}`}>
              
              <div className={`px-3 py-2 border-b mb-1 ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Management Actions</p>
              </div>
              
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#b3903c]/10 hover:text-[#b3903c] text-xs transition-all">
                <UserCircle size={16} /> View Inventory Profile
              </button>

              <button 
                onClick={handleLogout} 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500 text-xs transition-all font-bold"
              >
                <LogOut size={16} /> Logout System
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default InventoryHeader;