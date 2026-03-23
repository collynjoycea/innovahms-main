import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import FrontDesktopSidebar from "../components/FrontDesktopSidebar";
import FrontDesktopHeader from "../components/FrontDesktopHeader";

const FrontDesktopLayout = () => {
  // 1. DEFAULT TO LIGHT MODE (false)
  // Sinusuri muna kung may saved preference, kung wala, false (Light Mode) ang gagamitin.
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('frontDesktopDarkMode');
    return saved ? JSON.parse(saved) : false; 
  });

  // 2. EFFECT PARA SA PERSISTENCE AT ROOT CLASS
  useEffect(() => {
    localStorage.setItem('frontDesktopDarkMode', JSON.stringify(isDarkMode));
    
    // Ina-apply ang 'dark' class sa <html> element para sa Tailwind dark: variants
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-300 
      ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      
      {/* Fixed Sidebar */}
      <FrontDesktopSidebar isDarkMode={isDarkMode} />

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Fixed Header */}
        <FrontDesktopHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-main-scroll">
          <div className="max-w-[1600px] mx-auto w-full">
             <Outlet context={{ isDarkMode }} />
          </div>
        </main>
      </div>

      {/* Custom Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-main-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-main-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-main-scroll::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#27272a' : '#e4e4e7'};
          border-radius: 10px;
        }
        .custom-main-scroll::-webkit-scrollbar-thumb:hover {
          background: #b3903c;
        }
      `}} />
    </div>
  );
};

export default FrontDesktopLayout;