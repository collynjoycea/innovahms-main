import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import HrPayrollStaffSidebar from '../components/HrPayrollStaffSidebar'; 
import HrPayrollStaffHeader from '../components/HrPayrollStaffHeader';   

const HrPayrollStaffLayout = () => {
  // 1. DEFAULT TO LIGHT MODE (false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('hrDarkMode');
    // Pinipilit nating mag-false (Light) kung walang nahanap na preference
    return saved !== null ? JSON.parse(saved) : false; 
  });

  // 2. Effect para i-apply ang theme sa HTML tag
  useEffect(() => {
    localStorage.setItem('hrDarkMode', JSON.stringify(isDarkMode));
    
    // Ina-apply ang 'dark' class sa root element para sa Tailwind dark: utilities
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${isDarkMode ? 'bg-[#050505]' : 'bg-zinc-50'}`}>
      
      {/* LEFT: SIDEBAR */}
      <HrPayrollStaffSidebar isDarkMode={isDarkMode} />

      {/* RIGHT: MAIN CONTENT AREA */}
      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* TOP: HEADER */}
        <HrPayrollStaffHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

        {/* BOTTOM: SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* DITO LALABAS ANG MGA PAGES (Dashboard, Employees, etc.) */}
            {/* Ipinapasa ang isDarkMode bilang array para sa consistency */}
            <Outlet context={[isDarkMode]} /> 

          </div>
        </main>
      </div>

      {/* Custom Global Styles for Scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { 
          background: ${isDarkMode ? '#18181b' : '#e4e4e7'}; 
          border-radius: 20px; 
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #b3903c; }
      `}} />
    </div>
  );
};

export default HrPayrollStaffLayout;