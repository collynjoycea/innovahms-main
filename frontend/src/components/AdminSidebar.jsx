import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Settings as SettingsIcon, History, LogOut, 
  Users, Laptop, FileBarChart, ShieldCheck, Globe, Star, 
  Hotel, Zap, UserCheck, IdCard, KeyRound
} from 'lucide-react';

const parseStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('adminData') || '{}');
  } catch {
    return {};
  }
};

const AdminSidebar = ({ isDarkMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [expanded, setExpanded] = useState(false);
  const [admin, setAdmin] = useState(parseStoredAdmin());

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    const refreshAdmin = () => setAdmin(parseStoredAdmin());
    window.addEventListener('userUpdated', refreshAdmin);
    return () => window.removeEventListener('userUpdated', refreshAdmin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  const menuSections = [
    {
      title: "Overview",
      items: [
        { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard /> },
        { name: 'Reports & Analytics', path: '/admin/reports', icon: <FileBarChart /> },
        { name: 'Guest Reviews', path: '/admin/reviews', icon: <Star />, badge: "NEW" }
      ]
    },
    {
      title: "Management",
      items: [
        { name: 'Hotel Owners', path: '/admin/owners', icon: <Hotel /> },
        { name: 'Staff', path: '/admin/staff', icon: <IdCard /> },
        { name: 'Customers', path: '/admin/customers', icon: <UserCheck /> },
        { name: 'Member Packages', path: '/admin/packages', icon: <ShieldCheck /> },
      ]
    },
    {
      title: "Administration",
      items: [
        { name: 'System Logs', path: '/admin/logs', icon: <History /> },
        { name: 'Notifications', path: '/admin/notifications', icon: <Zap /> }
      ]
    }
  ];

  // Background shifts with mode: vibrant gradient in light mode, deep solid green
  // (matching the header) in dark mode. Text/labels are black in light mode
  // (per request) while dark mode keeps the light-on-green treatment.
  const bgClass = isDarkMode ? 'bg-[#163C34]' : 'bg-gradient-to-b from-[#1F6F5F] to-[#2FA084]';

  const t = isDarkMode ? {
    border: 'border-white/10',
    sectionTitle: 'text-[#9FC2B6]',
    divider: 'bg-white/10',
    navInactive: 'text-[#B9D6CC] hover:text-white hover:bg-white/10',
    navActive: 'bg-white/15 text-white',
    iconInactive: 'text-[#9FC2B6] group-hover:text-[#6FCF97]',
    iconActive: 'text-[#6FCF97]',
    activeBar: 'bg-[#6FCF97] shadow-[0_0_12px_#6FCF97]',
    profileCard: 'bg-white/5 border-white/10 hover:bg-white/10',
    profileCardActive: 'bg-white/15 border-white/20',
    profileName: 'text-white',
    profileRole: 'text-[#6FCF97]',
    onlineBadge: 'border-[#6FCF97] bg-[#6FCF97] text-[#0A2E24]',
    offlineBadge: 'border-red-400/30 bg-red-400/10 text-red-300',
    settingsInactive: 'bg-white/5 text-[#6FCF97] border-white/10 hover:bg-[#6FCF97] hover:text-[#173F35]',
    settingsActive: 'bg-[#6FCF97] text-[#173F35] border-[#6FCF97] shadow-lg shadow-[#6FCF97]/20',
    logout: 'text-[#B9D6CC] border-white/10 hover:text-red-300 hover:bg-red-500/10',
    scrollThumb: '#2FA084',
    scrollThumbHover: '#6FCF97',
  } : {
    border: 'border-black/10',
    sectionTitle: 'text-black/60',
    divider: 'bg-black/10',
    navInactive: 'text-black/70 hover:text-black hover:bg-white/20',
    navActive: 'bg-white/25 text-black',
    iconInactive: 'text-black/60 group-hover:text-[#173F35]',
    iconActive: 'text-[#173F35]',
    activeBar: 'bg-black shadow-[0_0_12px_rgba(0,0,0,0.4)]',
    profileCard: 'bg-white/15 border-black/10 hover:bg-white/25',
    profileCardActive: 'bg-white/30 border-black/20',
    profileName: 'text-black',
    profileRole: 'text-black/70',
    onlineBadge: 'border-[#2FA084] bg-[#6FCF97] text-[#0A2E24]',
    offlineBadge: 'border-red-700/30 bg-red-700/10 text-red-800',
    settingsInactive: 'bg-white/15 text-black border-black/10 hover:bg-black hover:text-white',
    settingsActive: 'bg-black text-white border-black shadow-lg shadow-black/20',
    logout: 'text-black/70 border-black/10 hover:text-red-700 hover:bg-red-700/10',
    scrollThumb: '#173F35',
    scrollThumbHover: '#0F2B25',
  };

  const adminName = admin?.name || 'Admin';
  const adminInitials = adminName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`${expanded ? 'w-[260px]' : 'w-[76px]'} border-r ${t.border} h-screen flex-shrink-0 font-sans transition-all duration-300 ease-in-out ${bgClass} overflow-hidden`}
    >
      <div className="h-full overflow-y-auto overflow-x-hidden custom-sidebar-scroll flex flex-col">
        
        {/* 1. BRAND LOGO & NETWORK STATUS */}
        <div className={`py-6 flex items-center shrink-0 ${expanded ? 'px-7 justify-between' : 'px-0 justify-center'}`}>
          <Link to="/admin" className={`transition-transform hover:scale-105 shrink-0 flex items-center overflow-hidden ${expanded ? 'gap-2' : 'mx-auto'}`}>
            <img src="/images/logo-icon.png?v=2" alt="Innova HMS" className="w-8 h-8 object-contain shrink-0" />
            {expanded && (
              <span className={`text-sm font-black tracking-tight uppercase whitespace-nowrap overflow-hidden transition-all duration-200 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                INNOVA-<span className="text-[#6FCF97]">HMS</span>
              </span>
            )}
          </Link>
          {expanded && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-200 overflow-hidden whitespace-nowrap shrink-0 ml-2 ${isOnline ? t.onlineBadge : t.offlineBadge}`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-[#0A2E24] animate-pulse' : 'bg-red-400'}`} />
              <span className="text-[8px] font-black uppercase">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>

        {/* 2. PROFILE MINI-CARD (links to the My Profile page) */}
        <div className={`mb-6 shrink-0 ${expanded ? 'px-4' : 'px-0 flex justify-center'}`}>
          <Link
            to="/admin/profile"
            className={
              expanded
                ? `w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    location.pathname === '/admin/profile' ? t.profileCardActive : t.profileCard
                  }`
                : 'flex items-center justify-center'
            }
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6FCF97] to-[#2FA084] flex items-center justify-center text-[#173F35] text-sm shadow-lg shrink-0 overflow-hidden">
              {admin?.profileImage ? (
                <img src={admin.profileImage} alt={adminName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black">{adminInitials || 'AD'}</span>
              )}
            </div>
            <div className={`overflow-hidden text-left whitespace-nowrap transition-all duration-200 ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              <h4 className={`text-[11px] font-black uppercase tracking-tight leading-none ${t.profileName}`}>{adminName}</h4>
              <p className={`text-[8px] font-bold uppercase tracking-widest mt-1.5 opacity-90 ${t.profileRole}`}>Admin</p>
            </div>
          </Link>
        </div>

        {/* 3. NAVIGATION LINKS */}
        <div className={`flex-1 space-y-6 pb-6 text-left ${expanded ? 'px-3' : 'px-2'}`}>
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className={`text-[9px] font-black tracking-[0.25em] uppercase mb-2 whitespace-nowrap overflow-hidden transition-all duration-200 ${t.sectionTitle} ${expanded ? 'opacity-100 h-auto px-4' : 'opacity-0 h-0 px-0'}`}>
                {section.title}
              </p>
              {!expanded && <div className={`h-px mx-3 mb-2 ${t.divider}`} />}
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={!expanded ? item.name : undefined}
                    className={`group flex items-center py-2.5 rounded-lg transition-all duration-200 relative ${expanded ? 'gap-3 px-4' : 'justify-center px-0'} ${
                      active ? t.navActive : t.navInactive
                    }`}
                  >
                    <span className={`shrink-0 transition-colors ${active ? t.iconActive : t.iconInactive}`}>
                      {React.cloneElement(item.icon, { size: 18, strokeWidth: active ? 2.5 : 2 })}
                    </span>
                    {expanded && (
                      <span className={`text-[11px] uppercase tracking-wide whitespace-nowrap overflow-hidden transition-all duration-200 flex-1 ${active ? 'font-black' : 'font-bold'}`}>
                        {item.name}
                      </span>
                    )}
                    {item.badge && expanded && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#6FCF97] text-[#173F35] shrink-0">
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <div className={`absolute left-0 w-1 h-4 rounded-r-full ${t.activeBar}`} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* 4. FOOTER ACTIONS */}
        <div className={`p-4 space-y-2 shrink-0 ${expanded ? `border-t ${t.border}` : ''} ${expanded ? '' : 'px-2'}`}>
          <Link 
            to="/admin/settings" 
            title={!expanded ? 'Settings' : undefined}
            className={
              expanded
                ? `flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg transition-all font-black text-[10px] uppercase tracking-[0.1em] border ${
                    location.pathname === '/admin/settings' ? t.settingsActive : t.settingsInactive
                  }`
                : `flex items-center justify-center py-2.5 rounded-lg transition-all ${
                    location.pathname === '/admin/settings' ? t.settingsActive : `bg-transparent border-transparent ${t.iconInactive}`
                  }`
            }
          >
            <SettingsIcon size={14} className="shrink-0" />
            {expanded && <span className="whitespace-nowrap overflow-hidden transition-all duration-200">Settings</span>}
          </Link>
          <button
            onClick={handleLogout}
            title={!expanded ? 'Logout' : undefined}
            className={
              expanded
                ? `w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all font-black text-[10px] uppercase tracking-[0.1em] border bg-transparent ${t.logout}`
                : `w-full flex items-center justify-center py-2.5 rounded-lg transition-all bg-transparent border-transparent ${t.iconInactive}`
            }
          >
            <LogOut size={14} className="shrink-0" />
            {expanded && <span className="whitespace-nowrap overflow-hidden transition-all duration-200">Logout</span>}
          </button>
        </div>
      </div>

      <style>{`
        .custom-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .custom-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb { 
          background: ${t.scrollThumb}; 
          border-radius: 10px; 
        }
        .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: ${t.scrollThumbHover}; }
      `}</style>
    </aside>
  );
};

export default AdminSidebar;
