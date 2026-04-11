import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Building2, ChevronDown, CreditCard, LogOut, MapPin, Moon, Sun, X } from 'lucide-react';

const emptyOwnerState = {
  id: null,
  fullName: 'Hotel Owner',
  hotelName: 'Subscription Required',
  subscriptionActive: false,
  hasHotel: false,
  profileImage: '',
};

const parseNotificationDate = (dateString) => {
  if (dateString instanceof Date) {
    return Number.isNaN(dateString.getTime()) ? null : dateString;
  }

  if (typeof dateString === 'number') {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(dateString || '').trim();
  if (!raw) return null;

  const flaskGmtMatch = raw.match(
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/
  );
  if (flaskGmtMatch) {
    const [, day, monthLabel, year, hour, minute, second] = flaskGmtMatch;
    const monthIndex = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    }[monthLabel];

    const localDate = new Date(
      Number(year),
      monthIndex,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      0
    );

    if (!Number.isNaN(localDate.getTime())) {
      return localDate;
    }
  }

  const directDate = new Date(raw);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const normalizedDate = new Date(normalized);
  if (!Number.isNaN(normalizedDate.getTime())) {
    return normalizedDate;
  }

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/
  );
  if (!match) return null;

  const [, year, month, day, hour = '00', minute = '00', second = '00', fraction = '0'] = match;
  const milliseconds = Number(fraction.slice(0, 3).padEnd(3, '0'));
  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    milliseconds
  );

  return Number.isNaN(localDate.getTime()) ? null : localDate;
};

const formatTimeAgo = (dateString, nowValue = Date.now()) => {
  const date = parseNotificationDate(dateString);
  if (!date) return 'Just now';

  const diffInSeconds = Math.floor((nowValue - date.getTime()) / 1000);

  if (diffInSeconds < 0) {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (diffInSeconds < 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const OwnerHeader = ({ isDarkMode = false, toggleTheme }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [ownerInfo, setOwnerInfo] = useState(emptyOwnerState);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clockTick, setClockTick] = useState(() => Date.now());

  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const syncOwner = () => {
      const sessionData = localStorage.getItem('ownerSession');
      if (!sessionData) {
        setOwnerInfo(emptyOwnerState);
        return;
      }

      try {
        const parsedData = JSON.parse(sessionData);
        if (parsedData) {
          setOwnerInfo({
            id: parsedData.id || null,
            fullName: `${parsedData.firstName || ''} ${parsedData.lastName || ''}`.trim() || 'Hotel Owner',
            hotelName: parsedData.hotelName || (parsedData.subscriptionActive ? 'Hotel Setup Required' : 'Subscription Required'),
            subscriptionActive: Boolean(parsedData.subscriptionActive),
            hasHotel: Boolean(parsedData.hasHotel),
            profileImage: parsedData.profileImage || '',
          });
          return;
        }
      } catch (error) {
        console.error('Error parsing owner session:', error);
      }

      setOwnerInfo(emptyOwnerState);
    };

    syncOwner();
    window.addEventListener('ownerSessionUpdated', syncOwner);
    return () => window.removeEventListener('ownerSessionUpdated', syncOwner);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setShowNotifications(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockTick(Date.now());
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ownerInfo.id) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/owner/notifications/${ownerInfo.id}?limit=10`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !mounted) return;
        const nextNotifications = data.notifications || [];
        setNotifications(nextNotifications);
        setUnreadCount(data.unread_count ?? nextNotifications.filter((item) => !item.is_read).length);
      } catch (error) {
        if (mounted) console.error('Error fetching owner notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [ownerInfo.id]);

  const handleLogout = () => {
    localStorage.removeItem('ownerSession');
    navigate('/owner/login');
  };

  const markAsRead = async (notificationId) => {
    if (!ownerInfo.id) return;

    try {
      const response = await fetch(`/api/owner/notifications/${ownerInfo.id}/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (!response.ok) return;

      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking owner notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!ownerInfo.id || unreadCount <= 0) return;

    setNotifications((prev) => prev.map((item) => (item.is_read ? item : { ...item, is_read: true })));
    setUnreadCount(0);

    try {
      const response = await fetch(`/api/owner/notifications/${ownerInfo.id}/read-all`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error marking all owner notifications as read:', error);
    }
  };

  const handleNotificationToggle = () => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (next) {
        void markAllAsRead();
      }
      return next;
    });
  };

  return (
    <header className={`sticky top-0 z-40 flex h-20 items-center justify-between border-b px-10 backdrop-blur-md transition-colors duration-300 ${isDarkMode ? 'border-white/10 bg-[#0b0f16]/85' : 'border-black/5 bg-white/80'}`}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#bf9b30] to-[#8e7223] opacity-80" />

        <div className="flex min-w-0 flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.3em] text-[#bf9b30]">
              Management Portal
            </span>
          </div>

          <h2 className="mt-0.5 truncate font-serif text-xl font-bold tracking-tight md:text-2xl" title={ownerInfo.hotelName}>
            <span className={`bg-clip-text text-transparent ${isDarkMode ? 'bg-gradient-to-r from-white via-slate-300 to-white' : 'bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900'}`}>
              {ownerInfo.hotelName}
            </span>
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleTheme}
          className={`rounded-2xl border px-3 py-3 transition-all ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-200 hover:text-[#f5d37e]' : 'border-black/5 bg-white text-slate-600 hover:text-[#bf9b30]'}`}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={handleNotificationToggle}
            className={`relative rounded-2xl border px-3 py-3 shadow-sm transition-all ${isDarkMode ? 'border-white/10 bg-white/5 text-slate-300 hover:border-[#bf9b30]/30 hover:text-[#f5d37e]' : 'border-black/5 bg-white text-slate-600 hover:border-[#bf9b30]/30 hover:text-[#bf9b30]'}`}
            title="Owner notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifications ? (
            <div className={`absolute right-0 mt-3 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-2xl ${isDarkMode ? 'border-white/10 bg-[#121824]' : 'border-black/5 bg-white'}`}>
              <div className={`flex items-center justify-between border-b px-4 py-3 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Notifications</p>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className={`rounded-lg p-1 transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={30} className={`mx-auto mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      className={`w-full border-b px-4 py-3 text-left transition-colors ${
                        isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-black/5 hover:bg-slate-50'
                      } ${
                        notification.is_read ? (isDarkMode ? 'bg-[#121824]' : 'bg-white') : (isDarkMode ? 'bg-[#191405]' : 'bg-amber-50/60')
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                            notification.priority === 'HIGH' || notification.priority === 'CRITICAL'
                              ? 'bg-red-500'
                              : notification.priority === 'NORMAL'
                                ? 'bg-[#bf9b30]'
                                : 'bg-slate-300'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold leading-snug break-words ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {notification.title}
                          </p>
                          <p className={`mt-1 whitespace-normal break-words text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {notification.message}
                          </p>
                          <p className={`mt-1 text-[11px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {formatTimeAgo(notification.created_at, clockTick)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className={`flex items-center gap-3 border-l pl-6 transition-opacity hover:opacity-80 ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}
          >
            <div className="hidden text-right sm:block">
              <p className={`text-xs font-bold capitalize tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{ownerInfo.fullName}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#bf9b30] opacity-80">
                {ownerInfo.subscriptionActive ? 'Verified Owner' : 'Subscription Required'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full border border-[#bf9b30]/20 bg-gradient-to-tr from-[#bf9b30]/10 to-transparent p-0.5">
              <div className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[#bf9b30] shadow-sm ${isDarkMode ? 'bg-[#11151d]' : 'bg-white'}`}>
                {ownerInfo.profileImage ? (
                  <img src={ownerInfo.profileImage} alt={ownerInfo.fullName} className="h-full w-full object-cover" />
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                )}
              </div>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isDarkMode ? 'text-white/40' : 'text-black/40'} ${showMenu ? 'rotate-180' : ''}`} />
          </button>

          {showMenu ? (
            <div className={`absolute right-0 z-50 mt-3 w-64 rounded-2xl border p-2 shadow-2xl animate-in fade-in zoom-in duration-200 ${isDarkMode ? 'border-white/10 bg-[#121824]' : 'border-black/5 bg-white'}`}>
              <div className={`mb-1 border-b px-3 py-2.5 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                <p className={`text-xs font-bold capitalize ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{ownerInfo.fullName}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#bf9b30]">{ownerInfo.hotelName}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  navigate('/owner/profile');
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-xs transition-all hover:bg-[#bf9b30]/10 hover:text-[#bf9b30] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
              >
                <span className="flex items-center gap-3">
                  <Building2 size={15} /> My Profile
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  navigate('/owner/subscription');
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-xs transition-all hover:bg-[#bf9b30]/10 hover:text-[#bf9b30] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
              >
                <span className="flex items-center gap-3">
                  <CreditCard size={15} /> Manage Subscription
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  navigate('/owner/rooms');
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-xs transition-all hover:bg-[#bf9b30]/10 hover:text-[#bf9b30] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
              >
                <span className="flex items-center gap-3">
                  {ownerInfo.hasHotel ? <Building2 size={15} /> : <MapPin size={15} />}
                  {ownerInfo.hasHotel ? 'Manage Rooms' : 'View Property'}
                </span>
              </button>

              <div className={`mt-1 border-t pt-1 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-500 transition-all hover:bg-red-50"
                >
                  <span className="flex items-center gap-3">
                    <LogOut size={15} /> Sign Out
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default OwnerHeader;
