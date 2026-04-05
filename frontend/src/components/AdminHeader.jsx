import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, User, Bell, Search, Settings, Shield, UserCircle, ChevronDown, X } from 'lucide-react';

const AdminHeader = ({ isDarkMode, toggleTheme }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/admin/notifications?limit=10');
        const data = await response.json();
        if (response.ok) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.notifications?.filter(n => !n.is_read).length || 0);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Isara ang dropdown kapag nag-click sa labas
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowProfileMenu(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setShowNotifications(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    navigate('/admin/login');
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <header className={`h-20 border-b flex items-center justify-between px-10 sticky top-0 z-40 transition-all duration-300 
      ${isDarkMode ? 'bg-[#0d0c0a] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
      
      {/* LEFT: TITLE */}
      <div className="flex flex-col text-left">
        <h2 className={`text-xl font-bold tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {location.pathname === '/admin' ? 'Dashboard' : 'Management Portal'}
        </h2>
        <p className={`text-[10px] font-medium tracking-widest mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          SYSTEM <span className="text-[#bf9b30]">STABLE</span>
        </p>
      </div>

      {/* CENTER: SEARCH */}
      <div className={`hidden lg:flex items-center border rounded-xl px-4 py-2.5 w-80 transition-all
        ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <Search size={16} className="text-gray-500" />
        <input 
          type="text" 
          placeholder="Search components..." 
          className={`bg-transparent border-none text-sm ml-3 focus:outline-none w-full ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} 
        />
      </div>

      {/* RIGHT: ACTIONS */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1 mr-2 border-r pr-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
          {/* THEME TOGGLE */}
          <button 
            onClick={toggleTheme} 
            className={`p-2.5 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-[#c9a84c]' : 'hover:bg-gray-100 text-gray-500 hover:text-[#c9a84c]'}`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {/* NOTIFICATIONS */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2.5 rounded-xl relative transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-[#c9a84c]' : 'hover:bg-gray-100 text-gray-500 hover:text-[#c9a84c]'}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#0d0c0a] flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </span>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN */}
            {showNotifications && (
              <div className={`absolute right-0 mt-3 w-96 border rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200 
                ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-white border-gray-100'}`}>
                
                <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Notifications</p>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`px-4 py-3 border-b cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-white/5 ${
                          !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        } ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notification.priority === 'HIGH' || notification.priority === 'CRITICAL' 
                              ? 'bg-red-500' 
                              : notification.priority === 'NORMAL' 
                                ? 'bg-yellow-500' 
                                : 'bg-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {notifications.length > 0 && (
                  <div className={`px-4 py-3 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                    <button className="w-full text-center text-sm text-[#c9a84c] hover:text-[#c9a84c]/80 font-medium">
                      View All Notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PROFILE DROPDOWN */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)} 
            className={`flex items-center gap-3 p-1.5 pr-3 rounded-2xl transition-all duration-300 ${showProfileMenu ? (isDarkMode ? 'bg-white/10' : 'bg-gray-100') : 'hover:bg-white/5'}`}
          >
            <div className="w-9 h-9 rounded-xl border border-[#c9a84c]/30 p-0.5 bg-gradient-to-tr from-[#c9a84c]/20 to-transparent">
              <div className={`w-full h-full rounded-lg flex items-center justify-center text-[#c9a84c] ${isDarkMode ? 'bg-[#14130f]' : 'bg-white shadow-sm'}`}>
                <User size={18} />
              </div>
            </div>
            <div className="text-left hidden sm:block">
              <p className={`text-xs font-bold uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Alex Mendoza</p>
              <p className="text-[9px] font-bold text-[#c9a84c]/60 tracking-widest mt-1">ADMIN</p>
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* DROPDOWN MENU - IBINALIK ANG MGA SETTINGS */}
          {showProfileMenu && (
            <div className={`absolute right-0 mt-3 w-56 border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in duration-200 
              ${isDarkMode ? 'bg-[#14130f] border-white/10 text-gray-300' : 'bg-white border-gray-100 text-gray-700'}`}>
              
              <div className={`px-3 py-2 border-b mb-1 ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Account Actions</p>
              </div>
              
              <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#c9a84c]/10 hover:text-[#c9a84c] text-xs transition-all`}>
                <UserCircle size={16} /> My Profile
              </button>

              <button 
                onClick={handleLogout} 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500 text-xs transition-all font-bold"
              >
                <LogOut size={16} /> Logout System
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;