import React, { useState, useEffect } from 'react';
import { Bell, Search, Filter, Send, Users, Settings, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function AdminNotifications({ isDarkMode }) {
  const [notifications, setNotifications] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    user_type: 'owner',
    type_key: '',
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchNotifications();
    fetchTypes();
  }, []);

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
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification)
      });
      const data = await response.json();
      if (response.ok) {
        setShowCreateForm(false);
        setNewNotification({ user_type: 'owner', type_key: '', title: '', message: '' });
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'HIGH': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'NORMAL': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (notification) => {
    if (notification.email_sent && notification.sms_sent && notification.push_sent) {
      return <CheckCircle size={16} className="text-green-500" />;
    } else if (notification.email_sent || notification.sms_sent || notification.push_sent) {
      return <Clock size={16} className="text-yellow-500" />;
    } else {
      return <XCircle size={16} className="text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9a84c]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Notification Management
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage system notifications for all users
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] text-white rounded-lg hover:bg-[#c9a84c]/90 transition-colors"
        >
          <Send size={16} />
          Send Notification
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-blue-500" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total</span>
          </div>
          <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {notifications.length}
          </p>
        </div>
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Delivered</span>
          </div>
          <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {notifications.filter(n => n.email_sent || n.sms_sent || n.push_sent).length}
          </p>
        </div>
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-yellow-500" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Pending</span>
          </div>
          <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {notifications.filter(n => !n.email_sent && !n.sms_sent && !n.push_sent).length}
          </p>
        </div>
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Unread</span>
          </div>
          <p className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {notifications.filter(n => !n.is_read).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center border rounded-lg px-3 py-2 flex-1 ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-white border-gray-200'}`}>
          <Search size={16} className="text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 bg-transparent border-none focus:outline-none ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={`px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-[#14130f] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
        >
          <option value="all">All Types</option>
          {types.map(type => (
            <option key={type.type_key} value={type.name.toLowerCase()}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notifications List */}
      <div className={`border rounded-lg overflow-hidden ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${isDarkMode ? 'border-white/10 bg-[#0d0c0a]' : 'border-gray-200 bg-gray-50'}`}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Status
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  User
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Type
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Title
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Priority
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-200'}`}>
              {filteredNotifications.map((notification) => (
                <tr key={notification.id} className={`hover:bg-gray-50 dark:hover:bg-white/5`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(notification)}
                      <span className={`text-xs ${notification.is_read ? 'text-green-600' : 'text-yellow-600'}`}>
                        {notification.is_read ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {notification.user_name || `${notification.user_type} #${notification.user_id}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {notification.type_name || 'System'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs mt-1 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Notification Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md p-6 rounded-lg border ${isDarkMode ? 'bg-[#14130f] border-white/10' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Send Notification
            </h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  User Type
                </label>
                <select
                  value={newNotification.user_type}
                  onChange={(e) => setNewNotification({...newNotification, user_type: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-[#0d0c0a] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
                >
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Notification Type
                </label>
                <select
                  value={newNotification.type_key}
                  onChange={(e) => setNewNotification({...newNotification, type_key: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-[#0d0c0a] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
                >
                  <option value="">Select type...</option>
                  {types.map(type => (
                    <option key={type.type_key} value={type.type_key}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Title
                </label>
                <input
                  type="text"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-[#0d0c0a] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
                  placeholder="Notification title"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Message
                </label>
                <textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-[#0d0c0a] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}
                  placeholder="Notification message"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className={`flex-1 px-4 py-2 border rounded-lg ${isDarkMode ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={createNotification}
                className="flex-1 px-4 py-2 bg-[#c9a84c] text-white rounded-lg hover:bg-[#c9a84c]/90"
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