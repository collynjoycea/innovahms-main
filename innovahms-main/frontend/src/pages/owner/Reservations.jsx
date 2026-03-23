import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle, Clock, AlertCircle, MoreHorizontal, 
  Filter, Download, User, MessageSquare, ListTodo, Search, ChevronRight
} from 'lucide-react';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [stats, setStats] = useState({ totalReservations: 0, todayCheckins: 0, availableRooms: 0, todayCheckouts: 0 });
  const [systemEvents, setSystemEvents] = useState([]);
  const [selectedRes, setSelectedRes] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // New state for Card filtering

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [resList, resStats, resEvents] = await Promise.all([
        axios.get('/api/owner/reservations'),
        axios.get('/api/owner/reservations-stats'),
        axios.get('/api/owner/system-events').catch(() => ({ data: [
          { id: 1, type: 'sms', title: 'Twilio: SMS Sent', desc: 'Check-in link sent to customer', time: '2 mins ago' },
          { id: 2, type: 'task', title: 'Task Assigned', desc: "Room 202 marked 'Dirty'.", time: 'Just now' }
        ]}))
      ]);

      setReservations(resList.data);
      setFilteredReservations(resList.data);
      setStats(resStats.data);
      setSystemEvents(resEvents.data);
      if (resList.data.length > 0) setSelectedRes(resList.data[0]);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data", err);
      setLoading(false);
    }
  };

  // Logic for Search, Payment, and Status Card Filter
  useEffect(() => {
    let results = reservations.filter(res => 
      res.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res.roomNo && res.roomNo.toString().includes(searchTerm))
    );

    if (paymentFilter !== 'All') {
      results = results.filter(res => res.payment === paymentFilter);
    }

    if (statusFilter !== 'All') {
      results = results.filter(res => res.status === statusFilter);
    }

    setFilteredReservations(results);
  }, [searchTerm, paymentFilter, statusFilter, reservations]);

  const handleCheckIn = async (id) => {
    try {
      await axios.patch(`/api/owner/reservations/${id}/status`, { status: 'Checked-in' });
      alert("Guest Checked-in!");
      fetchData(); 
    } catch (err) {
      alert("Failed to check-in");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Customer Name,Room,Stay Dates,Status,Payment\n"];
    const rows = filteredReservations.map(r => 
      `${r.customerName},${r.roomNo},${r.stayDates},${r.status},${r.payment}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reservations_Export.csv`;
    a.click();
  };

  if (loading) return <div className="p-10 font-bold text-center text-blue-600 uppercase tracking-widest text-xs">INNOVA-HMS LOADING...</div>;

  return (
    <div className="p-6 bg-[#F8F9FA] min-h-screen font-sans">
      {/* Header Cards - Now Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Total Reservations" 
          value={stats.totalReservations} 
          change="+12.5%" 
          onClick={() => { setStatusFilter('All'); setPaymentFilter('All'); }}
          isActive={statusFilter === 'All'}
        />
        <StatCard 
          title="Today's Check-ins" 
          value={stats.todayCheckins} 
          badge={`${stats.todayCheckins} pending`} 
          onClick={() => setStatusFilter('Pending')}
          isActive={statusFilter === 'Pending'}
        />
        <StatCard 
          title="Available Rooms" 
          value={stats.availableRooms} 
          subtext="82% Occupancy" 
          highlight 
          onClick={() => setStatusFilter('Checked-in')}
          isActive={statusFilter === 'Checked-in'}
        />
        <StatCard 
          title="Today's Check-outs" 
          value={stats.todayCheckouts} 
          badge="Live" 
          onClick={() => setStatusFilter('Confirmed')} // Adjust logic based on your checkout status label
          isActive={statusFilter === 'Confirmed'}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {statusFilter === 'All' ? 'Active Reservations' : `${statusFilter} Guests`}
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search guest or room..." 
                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {/* Manual Reset Filter Button */}
                {(statusFilter !== 'All' || paymentFilter !== 'All' || searchTerm !== '') && (
                    <button 
                        onClick={() => { setStatusFilter('All'); setPaymentFilter('All'); setSearchTerm(''); }}
                        className="text-[10px] font-bold text-blue-600 hover:underline px-2"
                    >
                        Reset Filters
                    </button>
                )}
                <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-lg px-3">
                  <Filter size={14} className="text-gray-400 mr-2" />
                  <select 
                    className="bg-transparent text-sm font-bold text-gray-600 outline-none py-2 cursor-pointer"
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                  >
                    <option value="All">All Payments</option>
                    <option value="Full Paid">Paid</option>
                    <option value="Partial">Partially Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
                <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-bold border rounded-lg hover:bg-gray-50 transition-colors">
                  <Download size={14}/> Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] font-bold text-gray-400 uppercase border-b tracking-wider">
                    <th className="pb-4 text-left">Customer Name</th>
                    <th className="pb-4 text-left">Room No.</th>
                    <th className="pb-4 text-left">Stay Dates</th>
                    <th className="pb-4 text-left">Status</th>
                    <th className="pb-4 text-left">Payment</th>
                    <th className="pb-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredReservations.map((res) => (
                    <tr 
                      key={res.id} 
                      className={`hover:bg-blue-50/40 cursor-pointer transition-all ${selectedRes?.id === res.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedRes(res)}
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center font-bold rounded-full w-9 h-9 text-xs ${res.customerType === 'VIP / Platinum' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {res.customerName[0]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-700">{res.customerName}</div>
                            <div className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                              {res.customerType || 'Standard'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-sm font-bold text-gray-600">{res.roomNo || 'TBD'}</div>
                        <div className={`w-2 h-2 rounded-full mt-1 ${res.status === 'Checked-in' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-gray-300'}`}></div>
                      </td>
                      <td className="py-4">
                        <div className="text-xs font-bold text-gray-600">{res.stayDates}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{res.nights} Nights</div>
                      </td>
                      <td className="py-4"><StatusBadge status={res.status} /></td>
                      <td className="py-4"><PaymentStatus status={res.payment} /></td>
                      <td className="py-4 text-right">
                        <div className="flex items-center gap-2">
                          {res.status === 'Pending' && (
                            <button onClick={(e) => { e.stopPropagation(); handleCheckIn(res.id); }} className="text-[9px] bg-blue-600 text-white px-3 py-1 rounded-md font-black hover:bg-blue-700 transition-colors uppercase">CHECK-IN</button>
                          )}
                          <MoreHorizontal className="text-gray-300 hover:text-gray-600" size={18} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredReservations.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest italic">No matching reservations found</div>
              )}
            </div>
          </div>
          
          {/* Smart-Assign Section - Same as before */}
          <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl relative overflow-hidden">
             <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-yellow-100 rounded-lg text-yellow-600"><ListTodo size={18}/></div>
                <h3 className="font-bold text-gray-800 tracking-tight">Smart-Assign™ Engine</h3>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold bg-black text-white px-2 py-1 rounded tracking-tighter uppercase">AI <span className="text-gray-400">HMS</span></span>
             </div>
             <p className="text-xs text-gray-500 mb-6 font-medium">Auto-prioritizing room assignments for VIP arrivals.</p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                   <p className="text-[9px] font-bold text-yellow-600 uppercase tracking-widest mb-1">Queue Priority</p>
                   <p className="text-xs font-bold text-gray-700">1. {selectedRes?.customerType === 'VIP / Platinum' ? selectedRes.customerName : 'Scanning...'}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Housekeeping Trigger</p>
                   <p className="text-xs font-bold text-gray-700">Sent: {new Date().getHours()}:30 AM</p>
                </div>
                <button onClick={() => window.location.href = '/settings/logic'} className="flex items-center justify-center p-4 border border-dashed border-gray-200 rounded-xl hover:bg-gray-50 group">
                   <span className="text-xs font-bold text-gray-400 group-hover:text-gray-600 flex items-center gap-1">View Logic <ChevronRight size={14}/></span>
                </button>
             </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          {selectedRes && (
            <div className="overflow-hidden bg-white border border-gray-100 shadow-md rounded-2xl">
              <div className="bg-[#1A202C] p-8 text-center relative">
                <p className="text-[10px] text-yellow-500 font-black tracking-[0.2em] uppercase mb-6">Selected Profile</p>
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-800 border-4 border-yellow-500/10 rounded-full flex items-center justify-center">
                   <User size={45} className="text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight uppercase">{selectedRes.customerName}</h3>
                <p className="text-[10px] text-gray-400 font-medium italic mt-1">{selectedRes.customerType} Member</p>
              </div>
              <div className="p-6 space-y-6 text-sm">
                <div>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Last Visit</p>
                  <p className="font-bold text-gray-700 uppercase leading-tight">August 2025,<br/>Presidential Suite</p>
                </div>
                <button className="w-full py-3 text-[11px] font-black border border-gray-200 rounded-xl hover:bg-gray-50 uppercase tracking-widest transition-all">
                  View Full History
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">System Events</p>
             {systemEvents.map(event => (
               <EventCard 
                key={event.id}
                icon={event.type === 'sms' ? <MessageSquare size={14} className="text-blue-500"/> : <Clock size={14} className="text-orange-500"/>}
                title={event.title}
                desc={event.desc}
                time={event.time}
                color={event.type === 'sms' ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}
               />
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const StatCard = ({ title, value, change, badge, subtext, highlight, onClick, isActive }) => (
  <div 
    onClick={onClick}
    className={`p-5 bg-white border rounded-2xl transition-all cursor-pointer hover:shadow-md active:scale-95 ${
      isActive ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-md' : 'border-gray-100'
    } ${highlight && !isActive ? 'border-l-4 border-l-yellow-500' : ''}`}
  >
    <div className="flex justify-between items-start mb-3">
      <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{title}</p>
      {badge && <span className="bg-orange-50 text-orange-500 text-[9px] px-2 py-0.5 rounded-md font-bold border border-orange-100">{badge}</span>}
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-black text-gray-800 leading-none tracking-tighter">{value}</span>
      {change && <span className="text-[11px] font-bold text-green-500 mb-0.5">{change} ↑</span>}
    </div>
    {subtext && <p className="text-[10px] text-gray-400 mt-2 font-bold italic tracking-tight">{subtext}</p>}
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = {
    'Checked-in': 'bg-green-100 text-green-600 border-green-200',
    'Pending': 'bg-orange-100 text-orange-600 border-orange-200',
    'Confirmed': 'bg-blue-100 text-blue-600 border-blue-200',
    'Cancelled': 'bg-red-100 text-red-600 border-red-200'
  };
  return <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
};

const PaymentStatus = ({ status }) => {
  const colors = {
    'Full Paid': 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]',
    'Partial': 'bg-orange-500',
    'Unpaid': 'bg-red-500',
    'Refunded': 'bg-gray-400'
  }
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-300'}`}></div>
      <span className="text-[11px] font-bold text-gray-700">{status === 'Full Paid' ? 'Paid' : status}</span>
    </div>
  );
};

const EventCard = ({ icon, title, desc, time, color }) => (
  <div className={`flex gap-3 p-4 rounded-xl border ${color} shadow-sm transition-transform hover:scale-[1.02]`}>
    <div className="mt-0.5">{icon}</div>
    <div>
      <h5 className="text-[11px] font-black text-gray-800 leading-tight uppercase tracking-tight">{title}</h5>
      <p className="text-[10px] text-gray-500 mt-1 font-medium leading-tight">{desc}</p>
      <span className="text-[9px] text-gray-300 mt-2 block font-bold uppercase tracking-widest">{time}</span>
    </div>
  </div>
);

export default Reservations;
