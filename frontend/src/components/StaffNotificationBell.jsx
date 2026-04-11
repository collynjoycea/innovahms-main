import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import useStaffSession from "../hooks/useStaffSession";

const formatTimeAgo = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Just now";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${Math.max(diff, 1)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
};

const StaffNotificationBell = ({ isDarkMode = false, className = "" }) => {
  const { staffId } = useStaffSession();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  useEffect(() => {
    if (!staffId) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    let active = true;
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/staff/notifications/${staffId}?limit=10`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !active) return;
        const nextNotifications = data.notifications || [];
        setNotifications(nextNotifications);
        setUnreadCount(data.unread_count ?? nextNotifications.filter((item) => !item.is_read).length);
      } catch {
        // keep stale UI state when polling fails
      }
    };

    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [staffId]);

  const markAsRead = async (notificationId) => {
    if (!staffId) return;
    try {
      const response = await fetch(`/api/staff/notifications/${staffId}/${notificationId}/read`, {
        method: "PATCH",
      });
      if (!response.ok) return;
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item))
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      // ignore transient mark-as-read failures
    }
  };

  const theme = useMemo(
    () => ({
      button: isDarkMode
        ? "border-white/10 bg-[#14130f] text-gray-400 hover:text-[#b3903c] hover:bg-white/5"
        : "border-gray-200 bg-white text-gray-500 hover:text-[#b3903c] hover:bg-gray-100",
      panel: isDarkMode ? "border-white/10 bg-[#14130f] text-white" : "border-gray-200 bg-white text-slate-900",
      item: isDarkMode ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-slate-50",
      muted: isDarkMode ? "text-slate-400" : "text-slate-500",
    }),
    [isDarkMode]
  );

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative rounded-xl border p-2.5 transition-all ${theme.button}`}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={`absolute right-0 z-50 mt-3 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-2xl ${theme.panel}`}>
          <div className={`flex items-center justify-between border-b px-4 py-3 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
            <p className="text-sm font-black">Notifications</p>
            <button type="button" onClick={() => setOpen(false)} className={`rounded-lg p-1 ${theme.muted}`}>
              <X size={15} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className={`px-4 py-8 text-center text-sm ${theme.muted}`}>No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markAsRead(notification.id)}
                  className={`w-full border-b px-4 py-3 text-left transition-colors ${theme.item} ${
                    notification.is_read ? "" : isDarkMode ? "bg-[#1b1812]" : "bg-amber-50/60"
                  }`}
                >
                  <p className="text-sm font-bold">{notification.title}</p>
                  <p className={`mt-1 text-xs leading-relaxed ${theme.muted}`}>{notification.message}</p>
                  <p className={`mt-2 text-[11px] ${theme.muted}`}>{formatTimeAgo(notification.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StaffNotificationBell;
