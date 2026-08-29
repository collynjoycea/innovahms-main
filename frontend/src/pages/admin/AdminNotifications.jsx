import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, Search, Send, Users, CheckCircle, XCircle, Clock, AlertTriangle, X } from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

export default function AdminNotifications() {
  const { isDarkMode } = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [newNotification, setNewNotification] = useState({
    user_type: 'owner',
    user_id: '',
    type_key: '',
    title: '',
    message: ''
  });

  const theme = {
    bg: isDarkMode ? 'bg-[#0F2B25]' : 'bg-[#EEEEEE]',
    card: isDarkMode ? 'bg-[#163C34]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    inputBg: isDarkMode ? 'bg-white/5' : 'bg-gray-50',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  useEffect(() => {
    fetchNotifications();
    fetchTypes();
  }, []);

  useEffect(() => {
    if (!showCreateForm) return;
    fetchRecipients(newNotification.user_type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateForm, newNotification.user_type]);

  const fetchRecipients = async (userType) => {
    setLoadingRecipients(true);
    setNewNotification((prev) => ({ ...prev, user_id: '' }));
    try {
      const endpointByType = {
        owner: '/api/admin/owners',
        customer: '/api/admin/customers',
        staff: '/api/admin/staff',
      };
      const listKeyByType = { owner: 'owners', customer: 'customers', staff: 'staff' };
      const endpoint = endpointByType[userType];
      if (!endpoint) { setRecipients([]); setLoadingRecipients(false); return; }

      const response = await fetch(endpoint);
      const data = await response.json();
      const list = data[listKeyByType[userType]] || [];
      setRecipients(list.map(p => ({
        id: p.id,
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || `#${p.id}`,
      })));
    } catch (error) {
      console.error('Error fetching recipients:', error);
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications');
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await fetch('/api/admin/notifications/types');
      const data = await response.json();
      if (response.ok) {
        setTypes(data.types || []);
      }
    } catch (error) {
      console.error('Error fetching types:', error);
    }
  };

  const createNotification = async () => {
    if (!newNotification.user_id) {
      alert('Please select a recipient.');
      return;
    }
    if (!newNotification.type_key) {
      alert('Please select a notification type.');
      return;
    }
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      alert('Please fill in the title and message.');
      return;
    }
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification)
      });
      const data = await response.json();
      if (response.ok) {
        setShowCreateForm(false);
        setNewNotification({ user_type: 'owner', user_id: '', type_key: '', title: '', message: '' });
        fetchNotifications();
      } else {
        alert(data.error || 'Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Failed to create notification');
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
                         n.message.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || n.type_name?.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesType;
  });

  const { paged, page, totalPages, setPage } = usePagination(filteredNotifications);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'NORMAL': return 'text-[#2FA084] bg-[#2FA084]/10 border-[#2FA084]/20';
      default: return `${theme.textSub} bg-gray-500/10 border-gray-500/20`;
    }
  };

  const getStatusIcon = (notification) => {
    if (notification.email_sent && notification.sms_sent && notification.push_sent) {
      return <CheckCircle size={14} className="text-[#2FA084]" />;
    } else if (notification.email_sent || notification.sms_sent || notification.push_sent) {
      return <Clock size={14} className="text-orange-500" />;
    }
    return <XCircle size={14} className="text-red-500" />;
  };

  const total = notifications.length;
  const delivered = notifications.filter(n => n.email_sent || n.sms_sent || n.push_sent).length;
  const pending = notifications.filter(n => !n.email_sent && !n.sms_sent && !n.push_sent).length;
  const unread = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className="w-10 h-10 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-8 min-h-screen transition-all duration-500 ${theme.bg}`}>
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Notification <span className="text-[#2FA084]">Management</span>
          </h1>
          <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest mt-1`}>
            Manage system notifications for all users
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#2FA084] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#2FA084]/20 hover:scale-105 active:scale-95 transition-all mt-4 md:mt-0"
        >
          <Send size={14} strokeWidth={3} /> Send Notification
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total', value: total, icon: <Bell size={20} /> },
          { label: 'Delivered', value: delivered, icon: <CheckCircle size={20} />, color: 'text-[#2FA084]' },
          { label: 'Pending', value: pending, icon: <Clock size={20} />, color: 'text-orange-500' },
          { label: 'Unread', value: unread, icon: <AlertTriangle size={20} />, color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} transition-all`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 border ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} ${stat.color || 'text-[#2FA084]'}`}>
              {stat.icon}
            </div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} mb-1`}>{stat.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${theme.textMain}`}>{stat.value}</h2>
          </div>
        ))}
      </div>

      {/* NOTIFICATIONS TABLE */}
      <div className={`rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} overflow-hidden`}>
        <div className={`p-5 border-b ${theme.border} flex flex-col md:flex-row justify-between items-center gap-4 ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2FA084]" />
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Activity</h3>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${theme.border} ${theme.inputBg} w-full md:w-64`}>
              <Search size={14} className="text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`bg-transparent border-none outline-none text-[10px] font-bold uppercase w-full ${theme.textMain} placeholder:text-gray-500`}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`px-3 py-2.5 rounded-xl border ${theme.border} ${theme.inputBg} text-[10px] font-bold uppercase ${theme.textMain} outline-none shrink-0`}
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type.type_key} value={type.name.toLowerCase()}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub} border-b ${theme.border}`}>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Created</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.border}`}>
              {paged.map((notification) => (
                <tr key={notification.id} className="hover:bg-[#2FA084]/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(notification)}
                      <span className={`text-[9px] font-black uppercase ${notification.is_read ? 'text-[#2FA084]' : 'text-orange-500'}`}>
                        {notification.is_read ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-[#2FA084]" />
                      <span className={`text-[11px] font-black ${theme.textMain}`}>
                        {notification.user_name || `${notification.user_type} #${notification.user_id}`}
                      </span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-[10px] font-bold uppercase ${theme.textSub}`}>
                    {notification.type_name || 'System'}
                  </td>
                  <td className="px-6 py-4 max-w-[240px]">
                    <p className={`text-[11px] font-bold ${theme.textMain}`}>{notification.title}</p>
                    <p className={`text-[10px] mt-0.5 line-clamp-2 ${theme.textSub}`}>{notification.message}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-[8px] font-black uppercase rounded border ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-[10px] font-bold ${theme.textSub}`}>
                    {new Date(notification.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredNotifications.length === 0 && (
                <tr><td colSpan={6} className={`px-6 py-10 text-center text-[11px] ${theme.textSub}`}>No notifications found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filteredNotifications.length} isDarkMode={isDarkMode} />
      </div>

      {/* CREATE NOTIFICATION MODAL */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateForm(false)}>
          <div
            className={`w-full max-w-md p-6 rounded-2xl border ${theme.border} ${isDarkMode ? 'bg-[#163C34]' : 'bg-white'} ${theme.shadow}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-black uppercase tracking-tight ${theme.textMain}`}>Send Notification</h3>
              <button onClick={() => setShowCreateForm(false)} className={`${theme.textSub} hover:text-red-500 transition-colors`}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${theme.textSub}`}>User Type</label>
                <select
                  value={newNotification.user_type}
                  onChange={(e) => setNewNotification({ ...newNotification, user_type: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-lg border ${theme.border} ${theme.inputBg} text-[11px] font-bold ${theme.textMain} outline-none focus:border-[#2FA084]`}
                >
                  <option value="owner">Owner</option>
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div>
                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${theme.textSub}`}>Recipient</label>
                <select
                  value={newNotification.user_id}
                  onChange={(e) => setNewNotification({ ...newNotification, user_id: e.target.value })}
                  disabled={loadingRecipients}
                  className={`w-full px-3 py-2.5 rounded-lg border ${theme.border} ${theme.inputBg} text-[11px] font-bold ${theme.textMain} outline-none focus:border-[#2FA084] ${loadingRecipients ? 'opacity-60 cursor-wait' : ''}`}
                >
                  <option value="">{loadingRecipients ? 'Loading...' : 'Select recipient...'}</option>
                  {recipients.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {!loadingRecipients && recipients.length === 0 && (
                  <p className="mt-1.5 text-[9px] font-bold text-orange-500 uppercase">No {newNotification.user_type}s found.</p>
                )}
              </div>

              <div>
                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${theme.textSub}`}>Notification Type</label>
                <select
                  value={newNotification.type_key}
                  onChange={(e) => setNewNotification({ ...newNotification, type_key: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-lg border ${theme.border} ${theme.inputBg} text-[11px] font-bold ${theme.textMain} outline-none focus:border-[#2FA084]`}
                >
                  <option value="">Select type...</option>
                  {types.map(type => (
                    <option key={type.type_key} value={type.type_key}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${theme.textSub}`}>Title</label>
                <input
                  type="text"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-lg border ${theme.border} ${theme.inputBg} text-[11px] font-bold ${theme.textMain} outline-none focus:border-[#2FA084]`}
                  placeholder="Notification title"
                />
              </div>

              <div>
                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1.5 ${theme.textSub}`}>Message</label>
                <textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2.5 rounded-lg border ${theme.border} ${theme.inputBg} text-[11px] font-bold ${theme.textMain} outline-none focus:border-[#2FA084]`}
                  placeholder="Notification message"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className={`flex-1 px-4 py-2.5 rounded-lg border ${theme.border} ${theme.textSub} text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all`}
              >
                Cancel
              </button>
              <button
                onClick={createNotification}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#2FA084] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
