import React from 'react';
import { Sun, Moon } from 'lucide-react';

const AdminHeader = ({ isDarkMode, toggleTheme }) => {
  return (
    <header className={`h-20 border-b flex items-center justify-between px-10 sticky top-0 z-40 transition-all duration-300 
      ${isDarkMode ? 'bg-[#163C34] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
      
      {/* LEFT: TITLE */}
      <div className="flex flex-col text-left">
        <h2 className={`text-xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Welcome <span className="text-[#2FA084]">Admin</span>
        </h2>
      </div>

      {/* RIGHT: THEME TOGGLE ONLY */}
      <button 
        onClick={toggleTheme} 
        className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-[#2FA084]' : 'hover:bg-gray-100 text-gray-500 hover:text-[#2FA084]'}`}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
};

export default AdminHeader;
