import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, MapPin, Building2 } from 'lucide-react';

const OwnerHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [ownerInfo, setOwnerInfo] = useState({
    fullName: 'Hotel Owner',
    hotelName: 'Property Management'
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('ownerSession'); 
    
    if (sessionData) {
      try {
        const parsedData = JSON.parse(sessionData);
        if (parsedData) {
          setOwnerInfo({
            fullName: `${parsedData.firstName} ${parsedData.lastName}`,
            hotelName: parsedData.hotelName || 'Innova Property'
          });
        }
      } catch (error) {
        console.error("Error parsing owner session:", error);
      }
    }
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/owner' },
    { name: 'Rooms', path: '/owner/rooms' },
    { name: 'Reservations', path: '/owner/reservations' },
    { name: 'Customers', path: '/owner/customers' },
    { name: 'Housekeeping', path: '/owner/housekeeping' },
    { name: 'Inventory', path: '/owner/inventory' },
    { name: 'Staff', path: '/owner/staff' },
    { name: 'Reports', path: '/owner/reports' },
    { name: 'Reviews', path: '/owner/reviews' },
  ];

  const currentItem = navItems.find(item => item.path === location.pathname);
  const pageTitle = currentItem ? currentItem.name : "Property Management";

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ownerSession');
    navigate('/owner/login');
  };

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-10 sticky top-0 z-40">
      
      {/* Left Side: Premium Hotel Branding */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Decorative Vertical Brand Bar */}
          <div className="shrink-0 w-1 h-10 bg-gradient-to-b from-[#bf9b30] to-[#8e7223] rounded-full opacity-80" />

          <div className="flex flex-col min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-[0.3em] text-[#bf9b30] uppercase whitespace-nowrap">
                Management Portal
              </span>
            </div>
            
            <h2 
              className="text-xl md:text-2xl font-bold tracking-tight mt-0.5 font-serif truncate"
              title={ownerInfo.hotelName}
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">
                {ownerInfo.hotelName}
              </span>
            </h2>
          </div>
        </div>

      {/* Right Side: Profile Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(prev => !prev)}
          className="flex items-center gap-3 pl-6 border-l border-black/10 hover:opacity-80 transition-opacity"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 tracking-tight capitalize">{ownerInfo.fullName}</p>
            <p className="text-[9px] font-bold text-[#bf9b30] uppercase tracking-widest opacity-80">Verified Owner</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-[#bf9b30]/20 p-0.5 bg-gradient-to-tr from-[#bf9b30]/10 to-transparent">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#bf9b30] shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>
          <ChevronDown size={14} className={`text-black/40 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-3 w-64 bg-white border border-black/5 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in duration-200">
            <div className="px-3 py-2.5 border-b border-black/5 mb-1">
              <p className="text-xs font-bold text-slate-800 capitalize">{ownerInfo.fullName}</p>
              <p className="text-[10px] text-[#bf9b30] font-bold uppercase tracking-widest">{ownerInfo.hotelName}</p>
            </div>
            <button
              onClick={() => { setShowMenu(false); navigate('/owner/rooms'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#bf9b30]/10 hover:text-[#bf9b30] text-xs text-slate-700 transition-all"
            >
              <Building2 size={15} /> Manage Rooms
            </button>
            <button
              onClick={() => { setShowMenu(false); navigate('/owner/staff'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#bf9b30]/10 hover:text-[#bf9b30] text-xs text-slate-700 transition-all"
            >
              <MapPin size={15} /> Hotel Location
            </button>
            <div className="border-t border-black/5 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 text-xs font-bold transition-all"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default OwnerHeader;