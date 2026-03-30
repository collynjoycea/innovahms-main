import React, { useState, useEffect } from 'react';
import { Briefcase, AlertCircle, Clock, CheckCircle, Users, Filter, Download, RefreshCcw } from 'lucide-react';

const Housekeeping = () => {
  const [housekeepingData, setHousekeepingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalRooms: 0,
    cleanedToday: 0,
    pending: 0,
    inProgress: 0
  });
  const [activeFilter, setActiveFilter] = useState('all');

  const getOwnerId = () => {
    const ownerData = JSON.parse(localStorage.getItem('ownerSession')) || {};
    return ownerData?.id || 1;
  };

  const fetchHousekeepingData = async () => {
    try {
      setLoading(true);
      const ownerId = getOwnerId();
      // Replace with your actual API endpoint
      const response = await fetch(`/api/housekeeping?owner_id=${ownerId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch housekeeping data');
      }
      
      const data = await response.json();
      setHousekeepingData(data.items || []);
      setSummary(data.summary || {
        totalRooms: 0,
        cleanedToday: 0,
        pending: 0,
        inProgress: 0
      });
    } catch (error) {
      console.error('Error fetching housekeeping data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeepingData();
    const interval = setInterval(fetchHousekeepingData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = housekeepingData.filter(item => {
    if (activeFilter === 'all') return true;
    return item.status === activeFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading housekeeping data...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Housekeeping Management</h1>
            <p className="text-gray-400">Monitor cleaning schedules and room status</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchHousekeepingData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RefreshCcw size={18} />
              Refresh
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Rooms</span>
              <Briefcase className="text-blue-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-white">{summary.totalRooms}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Cleaned Today</span>
              <CheckCircle className="text-green-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-white">{summary.cleanedToday}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">In Progress</span>
              <Clock className="text-yellow-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-white">{summary.inProgress}</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Pending</span>
              <AlertCircle className="text-red-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-white">{summary.pending}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-4 py-2 rounded-lg transition ${
                activeFilter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`px-4 py-2 rounded-lg transition ${
                activeFilter === 'in_progress'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-4 py-2 rounded-lg transition ${
                activeFilter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {filteredData.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>No housekeeping data available</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Room</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Assigned To</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Last Updated</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-750 transition">
                    <td className="px-6 py-4 text-sm text-white">{item.room || '--'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === 'completed'
                            ? 'bg-green-900 text-green-200'
                            : item.status === 'in_progress'
                            ? 'bg-yellow-900 text-yellow-200'
                            : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {item.status || '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{item.assignedTo || '--'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{item.lastUpdated || '--'}</td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-400 hover:text-blue-300 transition">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Housekeeping;
