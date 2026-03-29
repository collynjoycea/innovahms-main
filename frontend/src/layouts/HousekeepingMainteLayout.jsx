import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import HousekeepingMainteSidebar from "../components/HousekeepingMainteSidebar";
import HousekeepingMainteHeader from "../components/HousekeepingMainteHeader";

const HousekeepingMainteLayout = () => {
  // 1. DEFAULT TO LIGHT MODE (false)
  // Sinusuri ang saved preference; kung wala, false (Light Mode) ang fallback.
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('housekeepingDarkMode');
    return saved ? JSON.parse(saved) : false; 
  });

  // 2. EFFECT PARA SA PERSISTENCE AT TAILWIND DARK CLASS
  useEffect(() => {
    localStorage.setItem('housekeepingDarkMode', JSON.stringify(isDarkMode));
    
    // Ina-apply ang 'dark' class sa root <html> element
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 3. Toggle Function
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    // 4. Dynamic background layout
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 
      ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      
      {/* 5. Sidebar: Ipinapasa ang isDarkMode */}
      <HousekeepingMainteSidebar isDarkMode={isDarkMode} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* 6. Header: May Toggle Button at Profile */}
        <HousekeepingMainteHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        
        <main className="flex-1 overflow-y-auto scrollbar-thin custom-housekeeping-scroll">
          <Outlet context={{ isDarkMode }} />
        </main>
      </div>

      {/* 8. Custom Scrollbar Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-housekeeping-scroll::-webkit-scrollbar { width: 5px; }
        .custom-housekeeping-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-housekeeping-scroll::-webkit-scrollbar-thumb { 
          background: ${isDarkMode ? '#1a1a1a' : '#e4e4e7'}; 
          border-radius: 20px; 
        }
        .custom-housekeeping-scroll::-webkit-scrollbar-thumb:hover { 
          background: #b3903c; 
        }
      `}} />
    </div>
  );
};

export default HousekeepingMainteLayout;