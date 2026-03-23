import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const OwnerSidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/owner', icon: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22" /></> },
    { name: 'Rooms', path: '/owner/rooms', icon: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></> },
    { name: 'Reservations', path: '/owner/reservations', icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
    { name: 'Customers', path: '/owner/customers', icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></> },
    { name: 'Housekeeping', path: '/owner/housekeeping', icon: <><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></> },
    { name: 'Inventory', path: '/owner/inventory', icon: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></> },
    { name: 'Staff', path: '/owner/staff', icon: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></> },
    { name: 'Reports', path: '/owner/reports', icon: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> },
    { name: 'Reviews', path: '/owner/reviews', icon: <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-11.7 8.38 8.38 0 013.8.9L21 3z"/></> },
  ];

  return (
    <aside className="w-72 bg-[#faf9f6] border-r border-black/5 flex flex-col h-screen sticky top-0 overflow-hidden">
      {/* Brand Header */}
      <div className="px-8 pt-8 pb-4">
        <img src="/images/logo.png" alt="Innova Logo" className="w-full max-w-[160px] drop-shadow-sm" />
        <div className="mt-4 h-px bg-gradient-to-r from-[#bf9b30]/40 to-transparent w-full" />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-6 space-y-1.5 overflow-hidden">
        <p className="text-[10px] font-bold tracking-[0.2em] text-black/60 uppercase mb-2 px-2">Owner Portal</p>
        
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative ${
                active 
                  ? "bg-white text-[#9a7a20] shadow-[0_10px_20px_rgba(191,155,48,0.08)] ring-1 ring-[#bf9b30]/15" 
                  : "text-black/70 hover:text-[#bf9b30] hover:bg-white/60"
              }`}
            >
              <svg 
                className={`w-5 h-5 transition-colors ${active ? "text-[#bf9b30]" : "text-black/80 group-hover:text-[#bf9b30]"}`} 
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                {item.icon}
              </svg>
              <span className={`text-[13px] tracking-wide ${active ? "font-bold" : "font-semibold"}`}>
                {item.name}
              </span>
              
              {active && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#bf9b30] shadow-[0_0_8px_rgba(191,155,48,0.6)]" />
              )}
            </Link>
          );
        })}
      </nav>
      
      <div className="h-6" />
    </aside>
  );
};

export default OwnerSidebar;