import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Siguraduhing naka-install ito
import { 
  LayoutDashboard, ClipboardList, PlusCircle, 
  LogIn, LogOut, Map, ArrowLeftRight, 
  Wallet, Users, Crown, Layers, Clock
} from 'lucide-react';

const FrontDesktopSidebar = ({ isDarkMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [time, setTime] = useState(new Date());

  // --- DATABASE STATES PARA SA BADGES ---
  const [counts, setCounts] = useState({
    all: 0,
    checkIn: 0,
    checkOut: 0
  });

  // 1. Fetch Counts from Database
  const fetchBadgeCounts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/reservations');
      const data = response.data;

      setCounts({
        // Bilang ng lahat ng active/confirmed reservations
        all: data.filter(res => res.status === 'CONFIRMED' || res.status === 'CHECKED_IN').length,
        // Bilang ng mga CONFIRMED na (Waiting for Check-In)
        checkIn: data.filter(res => res.status === 'CONFIRMED').length,
        // Bilang ng mga CHECKED_IN na (Waiting for Check-Out)
        checkOut: data.filter(res => res.status === 'CHECKED_IN').length
      });
    } catch (error) {
      console.error("Error fetching sidebar badges:", error);
    }
  };

  // 2. Network Status, Clock, and Initial Fetch
  useEffect(() => {
    fetchBadgeCounts();
    // Refresh counts every 30 seconds para laging updated ang sidebar
    const countInterval = setInterval(fetchBadgeCounts, 30000);

    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      clearInterval(timer);
      clearInterval(countInterval);
    };
  }, []);

  // --- DYNAMIC MENU SECTIONS ---
  const menuSections = [
    {
      title: "OVERVIEW",
      items: [{ name: "Dashboard", path: "/staff/dashboard", icon: <LayoutDashboard /> }]
    },
    {
      title: "RESERVATIONS",
      items: [
        // Gagamitin ang counts.all
        { name: "All Reservations", path: "/staff/reservations", icon: <ClipboardList />, badge: counts.all > 0 ? counts.all : null },
      ]
    },
    {
      title: "CHECK-IN / OUT",
      items: [
        // Gagamitin ang counts.checkIn at counts.checkOut
        { name: "Check-In Queue", path: "/staff/check-in", icon: <LogIn />, badge: counts.checkIn > 0 ? counts.checkIn : null },
        { name: "Check-Out Queue", path: "/staff/check-out", icon: <LogOut />, badge: counts.checkOut > 0 ? counts.checkOut : null }
      ]
    },
    {
      title: "ROOM MANAGEMENT",
      items: [
        { name: "Room Map & Assign", path: "/staff/room-map", icon: <Map /> },
        { name: "Extend / Transfer", path: "/staff/extend-stay", icon: <ArrowLeftRight /> }
      ]
    },
    {
      title: "GUEST CRM",
      items: [
        { name: "Guest Profiles", path: "/staff/guest-profiles", icon: <Users /> },
        { name: "Loyalty & Points", path: "/staff/loyalty", icon: <Crown /> }
      ]
    }
  ];

  const bgColor = isDarkMode ? 'bg-[#09090b]' : 'bg-gray-50';
  const borderColor = isDarkMode ? 'border-[#b3903c]/20' : 'border-gray-200';
  const sectionTitleColor = isDarkMode ? 'text-gray-600' : 'text-gray-400';

  return (
    <aside className={`w-[260px] ${borderColor} border-r h-screen sticky top-0 font-sans transition-all duration-300 ${bgColor}`}>
      <div className="h-full overflow-y-auto custom-sidebar-scroll flex flex-col text-left">
        
        {/* BRAND LOGO & NETWORK STATUS */}
        <div className="px-7 py-6 flex items-center justify-between shrink-0">
          <Link to="/staff/dashboard" className="transition-transform hover:scale-105 text-left">
            <img src="/images/logo.png" alt="Innova HMS" className="h-8 w-auto object-contain" />
          </Link>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors ${isOnline ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-[8px] font-black uppercase ${isOnline ? 'text-emerald-600' : 'text-red-600'}`}>
              {isOnline ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* PROFILE MINI-CARD */}
        <div className="px-4 mb-6 shrink-0">
          <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-[#b3903c]/5 border-[#b3903c]/10' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#b3903c] to-[#96772f] flex items-center justify-center text-black text-sm shadow-lg">
              <span className="font-black">CF</span>
            </div>
            <div className="overflow-hidden">
              <h4 className={`text-[11px] font-black uppercase tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Collyn Fernandez</h4>
              <p className="text-[8px] font-bold text-[#b3903c] uppercase tracking-widest mt-1.5 opacity-80">Front Desk Staff</p>
            </div>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="flex-1 px-3 space-y-6 pb-6">
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

        {/* FOOTER: DIGITAL CLOCK & LOGOUT */}
        <div className={`p-4 border-t space-y-3 shrink-0 ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
          <div className={`flex flex-col items-center justify-center py-4 rounded-xl border transition-all ${isDarkMode ? 'bg-[#b3903c]/5 border-[#b3903c]/10' : 'bg-zinc-100 border-zinc-200'}`}>
            <div className="flex items-center gap-2 mb-1 opacity-60">
               <Clock size={12} className="text-[#b3903c]" />
               <span className="text-[9px] font-black uppercase tracking-widest text-[#b3903c]">Current Time</span>
            </div>
            <span className={`text-2xl font-black tracking-tighter ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
               {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
            <span className={`text-[10px] font-bold mt-1 opacity-50 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
               {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button 
            onClick={() => navigate('/staff/login')}
            className={`w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg transition-all font-black text-[10px] uppercase tracking-[0.1em] border ${
              isDarkMode 
                ? 'bg-transparent text-gray-500 border-white/5 hover:text-red-500 hover:bg-red-500/10' 
                : 'bg-transparent text-gray-500 border-gray-200 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <LogOut size={14} /> End Shift & Logout
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

export default FrontDesktopSidebar;