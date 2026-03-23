import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BarChart3, TrendingUp, Cpu, 
  DollarSign, Percent, BadgePercent, Users2, 
  Star, ClipboardCheck, FileText, Settings, LogOut,
  ShieldCheck, Activity, Clock
} from 'lucide-react';

const HotelManagerSidebar = ({ isDarkMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [time, setTime] = useState(new Date());

  // Network Status & Clock Monitor (Standard HMS Logic)
  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      clearInterval(timer);
    };
  }, []);

  const menuSections = [
    {
      title: "EXECUTIVE OVERVIEW",
      items: [
        { name: "Executive Dashboard", path: "/manager/dashboard", icon: <LayoutDashboard /> },
        { name: "Real-time Analytics", path: "/manager/analytics", icon: <BarChart3 />, badge: "LIVE" }
      ]
    },
    {
      title: "STRATEGIC AI",
      items: [
        { name: "Prophet Forecasting", path: "/manager/forecasting", icon: <TrendingUp /> },
        { name: "Simulation Engine", path: "/manager/simulation", icon: <Cpu /> }
      ]
    },
    {
      title: "REVENUE MANAGEMENT",
      items: [
        { name: "Revenue Monitor", path: "/manager/revenue", icon: <DollarSign /> },
        { name: "Dynamic Pricing", path: "/manager/pricing", icon: <Percent /> },
        { name: "Promotions & Offers", path: "/manager/promotions", icon: <BadgePercent /> }
      ]
    },
    {
      title: "OPERATIONAL OVERSIGHT",
      items: [
        { name: "Staff Performance", path: "/manager/staff", icon: <Users2 /> },
        { name: "Guest Sentiment", path: "/manager/reviews", icon: <Star />, badge: "4.8" },
        { name: "Housekeeping Log", path: "/manager/housekeeping", icon: <ClipboardCheck /> }
      ]
    },
    {
      title: "ADMINISTRATION",
      items: [
        { name: "Executive Reports", path: "/manager/reports", icon: <FileText /> }
      ]
    }
  ];

  const bgColor = isDarkMode ? 'bg-[#09090b]' : 'bg-gray-50';
  const borderColor = isDarkMode ? 'border-[#b3903c]/20' : 'border-gray-200';
  const sectionTitleColor = isDarkMode ? 'text-gray-600' : 'text-gray-400';

  return (
    <aside className={`w-[260px] ${borderColor} border-r h-screen sticky top-0 font-sans transition-all duration-300 ${bgColor}`}>
      <div className="h-full overflow-y-auto custom-sidebar-scroll flex flex-col">
        
        {/* 1. BRAND LOGO & NETWORK STATUS */}
        <div className="px-7 py-6 flex items-center justify-between shrink-0">
          <Link to="/manager/dashboard" className="transition-transform hover:scale-105">
            <img src="/images/logo.png" alt="Innova HMS" className="h-8 w-auto object-contain" />
          </Link>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors ${isOnline ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[8px] font-black uppercase ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* 2. PROFILE MINI-CARD (EXECUTIVE MANAGER) */}
        <div className="px-4 mb-6 shrink-0">
          <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-[#b3903c]/5 border-[#b3903c]/10' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#b3903c] to-[#96772f] flex items-center justify-center text-black text-sm shadow-lg">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <div className="overflow-hidden text-left">
              <h4 className={`text-[11px] font-black uppercase tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Collyn Fernandez</h4>
              <p className="text-[8px] font-bold text-[#b3903c] uppercase tracking-widest mt-1.5 opacity-80">Hotel Manager</p>
            </div>
          </div>
        </div>

        {/* 3. NAVIGATION LINKS */}
        <div className="flex-1 px-3 space-y-6 pb-6 text-left">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className={`text-[9px] font-black tracking-[0.25em] uppercase px-4 mb-2 ${sectionTitleColor}`}>
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 relative ${
                      active 
                        ? "bg-[#b3903c]/10 text-[#b3903c]" 
                        : (isDarkMode ? "text-gray-500 hover:text-gray-200 hover:bg-white/5" : "text-gray-500 hover:text-[#b3903c] hover:bg-white")
                    }`}
                  >
                    <span className={`${active ? "text-[#b3903c]" : "text-gray-500 group-hover:text-[#b3903c]"} transition-colors`}>
                      {React.cloneElement(item.icon, { size: 18, strokeWidth: active ? 2.5 : 2 })}
                    </span>
                    <span className={`text-[11px] uppercase tracking-wide flex-1 ${active ? 'font-black' : 'font-bold'}`}>
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[18px] text-center ${active ? 'bg-[#b3903c] text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <div className="absolute left-0 w-1 h-4 bg-[#b3903c] rounded-r-full shadow-[0_0_12px_#b3903c]" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* 4. FOOTER: CLOCK & ACTIONS */}
        <div className={`p-4 border-t space-y-2 shrink-0 ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
          
          {/* DIGITAL CLOCK SECTION */}
          <div className={`flex flex-col items-center justify-center py-3 mb-2 rounded-xl border transition-all ${isDarkMode ? 'bg-[#b3903c]/5 border-[#b3903c]/10' : 'bg-zinc-100 border-zinc-200'}`}>
            <span className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
               {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>

          <Link 
            to="/manager/settings" 
            className={`flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg transition-all font-black text-[10px] uppercase tracking-[0.1em] border ${
              location.pathname === '/manager/settings' 
                ? "bg-[#b3903c] text-black border-[#b3903c] shadow-lg shadow-[#b3903c]/20" 
                : (isDarkMode ? "bg-white/5 text-[#b3903c] border-[#b3903c]/10 hover:bg-[#b3903c] hover:text-black" : "bg-gray-100 text-[#b3903c] border-gray-200 hover:bg-[#b3903c] hover:text-white")
            }`}
          >
            <Settings size={14} /> System Settings
          </Link>

          <button 
            onClick={() => navigate('/manager/login')}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all font-black text-[10px] uppercase tracking-[0.1em] border ${
              isDarkMode ? 'bg-transparent text-gray-500 border-white/5 hover:text-red-500 hover:bg-red-500/10' : 'bg-transparent text-gray-500 border-gray-200 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <LogOut size={14} /> Terminate Session
          </button>
        </div>
      </div>

      <style>{`
        .custom-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .custom-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb { 
          background: ${isDarkMode ? '#27272a' : '#e4e4e7'}; 
          border-radius: 10px; 
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #b3903c; }
      `}</style>
    </aside>
  );
};

export default HotelManagerSidebar;