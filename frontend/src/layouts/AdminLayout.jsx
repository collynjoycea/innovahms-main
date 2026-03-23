import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet
import AdminSidebar from '../components/AdminSidebar'; 
import AdminHeader from '../components/AdminHeader';

const AdminLayout = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#09090b]' : 'bg-gray-50'}`}>
      <AdminSidebar isDarkMode={isDarkMode} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ isDarkMode }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;