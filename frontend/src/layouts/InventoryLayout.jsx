import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import InventorySidebar from "../components/InventorySidebar"; 
import InventoryHeader from "../components/InventoryHeader";

const InventoryLayout = () => {
  // 1. DEFAULT TO LIGHT MODE (false)
  // Kinukuha ang saved preference; kung wala pa, light mode ang default.
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('inventoryDarkMode');
    return saved ? JSON.parse(saved) : false; 
  });

  // 2. EFFECT PARA SA PERSISTENCE AT DARK CLASS
  useEffect(() => {
    localStorage.setItem('inventoryDarkMode', JSON.stringify(isDarkMode));
    
    // Ina-apply ang 'dark' class sa root element para sa Tailwind dark: variants
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
    // 4. Dynamic background layout - transition duration adjusted para swabe ang pagpalit
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 
      ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      
      {/* 5. Sidebar */}
      <InventorySidebar isDarkMode={isDarkMode} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* 6. Header */}
        <InventoryHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        
        <main className="flex-1 overflow-y-auto scrollbar-thin custom-inventory-scroll">
          {/* 7. Outlet - Ipinapasa ang context para sa mga tables at cards sa loob */}
          <div className="p-6 md:p-8">
            <div className="max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
              <Outlet context={{ isDarkMode }} />
            </div>
          </div>
        </main>
      </div>

      {/* 8. Custom Scrollbar Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-inventory-scroll::-webkit-scrollbar { width: 5px; }
        .custom-inventory-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-inventory-scroll::-webkit-scrollbar-thumb { 
          background: ${isDarkMode ? '#1a1a1a' : '#e4e4e7'}; 
          border-radius: 20px; 
        }
        .custom-inventory-scroll::-webkit-scrollbar-thumb:hover { 
          background: #b3903c; 
        }
      `}} />
    </div>
  );
};

export default InventoryLayout;