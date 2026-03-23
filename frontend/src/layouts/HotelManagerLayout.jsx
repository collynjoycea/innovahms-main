import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import HotelManagerSidebar from "../components/HotelManagerSidebar";
import HotelManagerHeader from "../components/HotelManagerHeader";

const HotelManagerLayout = () => {
  // 1. Centralized Theme State - Naka-set sa 'false' para Light Mode ang default
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 2. Toggle Function para sa Dark/Light Mode
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    // 3. Main Container: Dynamic background colors (Light: #f8f9fa | Dark: #09090b)
    <div className={`flex h-screen overflow-hidden transition-all duration-500 font-sans
      ${isDarkMode ? 'bg-[#09090b] text-zinc-100' : 'bg-[#f8f9fa] text-zinc-900'}`}>
      
      {/* 4. Sidebar: Ipinapasa ang theme state */}
      <HotelManagerSidebar isDarkMode={isDarkMode} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* 5. Header: May kasamang toggle switch function */}
        <HotelManagerHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        
        {/* 6. Main Dashboard Area */}
        <main className="flex-1 overflow-y-auto custom-main-scroll scroll-smooth">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto transition-all duration-500">
            {/* 7. Outlet: Nagpapasa ng context para sa mga dashboard components */}
            <Outlet context={{ isDarkMode }} />
          </div>
        </main>

        {/* Subtle background glow effect kapag naka-Dark Mode lang */}
        {isDarkMode && (
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#b3903c]/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        )}
      </div>

      {/* 8. Global Scrollbar Logic para sa Main Content */}
      <style>{`
        .custom-main-scroll::-webkit-scrollbar { 
          width: 5px; 
        }
        .custom-main-scroll::-webkit-scrollbar-track { 
          background: transparent; 
        }
        .custom-main-scroll::-webkit-scrollbar-thumb { 
          background: ${isDarkMode ? '#27272a' : '#e4e4e7'}; 
          border-radius: 20px; 
        }
        .custom-main-scroll::-webkit-scrollbar-thumb:hover { 
          background: #b3903c; 
        }

        /* Standardized transitions */
        .theme-transition {
          transition: background-color 0.5s ease, border-color 0.5s ease, color 0.5s ease;
        }
      `}</style>
    </div>
  );
};

export default HotelManagerLayout;