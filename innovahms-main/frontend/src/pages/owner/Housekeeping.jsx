import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Clock, Plus, ClipboardCheck, X, ArrowLeft, Info } from 'lucide-react';
import axios from 'axios';

const Housekeeping = () => {
    const [data, setData] = useState({ rooms: [], tasks: [] });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'total', 'pending', 'urgent', 'available'

    const [formData, setFormData] = useState({
        room_id: '',
        priority: 'Routine',
        staff_name: '',
        special_instructions: ''
    });

    const getOwnerId = () => {
        const ownerData = JSON.parse(localStorage.getItem('ownerSession'));
        return ownerData?.id || 1;
    };

    const fetchHousekeeping = async () => {
        try {
            const ownerId = getOwnerId();
            const res = await axios.get(`/api/housekeeping?owner_id=${ownerId}`);
            setData(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching data", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHousekeeping();
        const interval = setInterval(fetchHousekeeping, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkClean = async (taskId, roomId) => {
        try {
            await axios.post('/api/housekeeping/complete', {
                room_id: roomId,
                task_id: taskId
            });
            fetchHousekeeping();
            alert("Room marked as clean!");
        } catch (err) {
            console.error(err);
            alert("Failed to update status.");
        }
    };

    const handleAssignTask = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/housekeeping/tasks', formData);
            setIsModalOpen(false);
            setFormData({ room_id: '', priority: 'Routine', staff_name: '', special_instructions: '' });
            fetchHousekeeping();
        } catch (err) {
            console.error(err);
            alert("Error assigning task.");
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#bf9b30]"></div>
        </div>
    );

    // --- Sub-Components para sa Table Views ---

    const TableHeader = ({ title, onBack }) => (
        <div className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-3xl font-black text-[#bf9b30]">{title}</h2>
        </div>
    );

    const renderTableView = () => {
        switch (currentView) {
            case 'total':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <TableHeader title="Master Room List" onBack={() => setCurrentView('dashboard')} />
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="p-6">Room & Type</th>
                                        <th className="p-6">Floor</th>
                                        <th className="p-6">Occupancy</th>
                                        <th className="p-6">Housekeeping</th>
                                        <th className="p-6">Amenities</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.rooms.map(room => (
                                        <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-6 font-bold">Room {room.room_number} <span className="block text-xs text-slate-400 font-medium">{room.room_type}</span></td>
                                            <td className="p-6">Floor {room.floor_level || '1'}</td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${room.occupancy === 'Occupied' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {room.occupancy || 'Vacant'}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <span className={`flex items-center gap-1 font-bold ${room.status === 'Available' ? 'text-green-500' : 'text-red-500'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${room.status === 'Available' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    {room.status}
                                                </span>
                                            </td>
                                            <td className="p-6 text-xs text-slate-400 font-medium italic">Standard Set, Mini-bar</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'pending':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <TableHeader title="Pending Tasks Queue" onBack={() => setCurrentView('dashboard')} />
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="p-6">Task Description</th>
                                        <th className="p-6">Room</th>
                                        <th className="p-6">Assigned Staff</th>
                                        <th className="p-6">Priority</th>
                                        <th className="p-6">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.tasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-6 font-bold">{task.description || 'Full Cleaning'}</td>
                                            <td className="p-6 font-black">Room {task.room_number}</td>
                                            <td className="p-6 text-slate-600">{task.staff_name || 'Unassigned'}</td>
                                            <td className="p-6 font-bold text-slate-400 uppercase text-[10px]">{task.priority}</td>
                                            <td className="p-6">
                                                <button onClick={() => handleMarkClean(task.id, task.room_id)} className="text-[#bf9b30] font-black text-xs hover:underline">COMPLETE</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
           case 'urgent':
    const urgentTasks = data.tasks.filter(t => t.priority?.toLowerCase() === 'urgent');
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TableHeader title="Urgent: Priority Attention" onBack={() => setCurrentView('dashboard')} />
            
            {urgentTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {urgentTasks.map(task => (
                        <div key={task.id} className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] relative overflow-hidden">
                            {/* Alert Timer / Badge */}
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-red-500 text-white text-[10px] px-3 py-1 rounded-full font-black animate-pulse">
                                    CRITICAL
                                </span>
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>
                            
                            <h3 className="text-2xl font-black text-red-600 mb-1">Room {task.room_number}</h3>
                            <p className="text-xs font-bold text-red-400 uppercase mb-4">Reason: {task.priority_reason || "Immediate Cleaning Required"}</p>
                            
                            <div className="bg-white p-4 rounded-2xl mb-6">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Special Instructions:</p>
                                <p className="text-sm text-slate-700 font-medium">{task.special_instructions || "No specific instructions."}</p>
                            </div>

                            <button 
                                onClick={() => handleMarkClean(task.id, task.room_id)} 
                                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg shadow-red-200"
                            >
                                RESOLVE IMMEDIATELY
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <CheckCircle size={48} className="text-green-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700">All Clear!</h3>
                    <p className="text-slate-400 text-sm">No urgent housekeeping requests at the moment.</p>
                </div>
            )}
        </div>
    );
            
            case 'available':
                const availableRooms = data.rooms.filter(r => r.status === 'Available');
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <TableHeader title="Available & Inspected" onBack={() => setCurrentView('dashboard')} />
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="p-6">Room Number</th>
                                        <th className="p-6">Ready Status</th>
                                        <th className="p-6">Last Cleaned</th>
                                        <th className="p-6">Inspected By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {availableRooms.map(room => (
                                        <tr key={room.id} className="hover:bg-green-50 transition-colors">
                                            <td className="p-6 font-black text-lg">Room {room.room_number}</td>
                                            <td className="p-6 text-green-500 font-bold uppercase text-xs flex items-center gap-2">
                                                <CheckCircle size={16} /> Inspected & Ready
                                            </td>
                                            <td className="p-6 text-slate-400 text-sm">Today, 10:45 AM</td>
                                            <td className="p-6 font-medium text-slate-700">Admin Supervisor</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-white p-8 text-slate-800 relative">
            {currentView === 'dashboard' ? (
                <>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-4xl font-extrabold text-[#bf9b30] tracking-tight">Housekeeping Operations</h1>
                            <p className="text-slate-400 mt-1">Real-time room status and priority cleaning queue.</p>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-[#bf9b30] text-white px-6 py-2.5 rounded-full font-bold hover:bg-black transition-all shadow-lg"
                        >
                            <Plus size={20} /> New Cleaning Task
                        </button>
                    </div>

                    {/* Stats Overview with Clickable Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        {[
                            { id: 'total', label: 'Total Rooms', val: data.rooms.length, sub: 'Master List', color: 'border-slate-100 hover:border-slate-300' },
                            { id: 'pending', label: 'Pending Tasks', val: data.tasks.length, sub: 'Needs Attention', color: 'border-red-100 text-red-500 hover:bg-red-50' },
                            { id: 'urgent', label: 'Urgent', val: data.tasks.filter(t => t.priority === 'Urgent').length, sub: 'Critical Queue', color: 'border-orange-100 text-orange-500 hover:bg-orange-50' },
                            { id: 'available', label: 'Available', val: data.rooms.filter(r => r.status === 'Available').length, sub: 'Ready to Sell', color: 'border-green-100 text-green-500 hover:bg-green-50' },
                        ].map((stat, i) => (
                            <div 
                                key={i} 
                                onClick={() => setCurrentView(stat.id)}
                                className={`bg-white border-2 ${stat.color} p-6 rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600">{stat.label}</p>
                                    <Info size={14} className="text-slate-200" />
                                </div>
                                <h2 className="text-3xl font-black mt-2">{stat.val}</h2>
                                <p className="text-xs mt-1 font-medium">{stat.sub}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Status Map */}
                        <div className="lg:col-span-2 bg-slate-50/50 border border-slate-100 p-8 rounded-[40px]">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-700 mb-8">
                                <ClipboardCheck className="text-[#bf9b30]" /> Smart Status Map
                            </h3>
                            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                {data.rooms.map((room) => (
                                    <div key={room.id} className={`aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all 
                                        ${room.status === 'Cleaning' ? 'border-red-200 bg-red-50 text-red-500 animate-pulse' : 
                                          room.status === 'Available' ? 'border-green-100 bg-white text-green-500' : 'border-blue-100 bg-blue-50 text-blue-500'}`}>
                                        <span className="text-sm font-black">{room.room_number}</span>
                                        { room.status === 'Available' ? <CheckCircle size={14} className="mt-1" /> : <Clock size={14} className="mt-1" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick AI Priority Queue (Summary Side) */}
                        <div className="bg-white border-2 border-[#bf9b30]/10 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-slate-800">
                                <Clock className="text-[#bf9b30]" /> Live Queue
                            </h3>
                            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                                {data.tasks.slice(0, 5).map((task) => (
                                    <div key={task.id} className="relative pl-6 border-l-4 border-[#bf9b30]/30">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-black text-slate-800">Room {task.room_number}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{task.priority}</p>
                                            </div>
                                            <button onClick={() => handleMarkClean(task.id, task.room_id)} className="bg-slate-100 p-1.5 rounded-lg hover:bg-[#bf9b30] hover:text-white transition-all">
                                                <CheckCircle size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {data.tasks.length > 5 && (
                                    <button onClick={() => setCurrentView('pending')} className="w-full py-3 text-xs font-bold text-slate-400 hover:text-[#bf9b30]">View all tasks...</button>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                renderTableView()
            )}

            {/* NEW CLEANING TASK MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-[#bf9b30] flex items-center gap-2">
                                <Plus className="bg-[#bf9b30]/10 p-1 rounded-lg" /> New Task
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-black transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAssignTask} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Room Number</label>
                                <select 
                                    className="w-full p-3 rounded-xl border-2 border-slate-50 bg-slate-50 focus:border-[#bf9b30] outline-none transition-all"
                                    onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                                    required
                                >
                                    <option value="">Select Room</option>
                                    {data.rooms.map(r => (
                                        <option key={r.id} value={r.id}>Room {r.room_number}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Priority Level</label>
                                <div className="flex gap-2">
                                    {['Routine', 'High', 'Urgent'].map(p => (
                                        <button 
                                            key={p}
                                            type="button"
                                            onClick={() => setFormData({...formData, priority: p})}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${formData.priority === p ? 'bg-[#bf9b30] text-white shadow-md' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Staff Assignment</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter staff name"
                                    className="w-full p-3 rounded-xl border-2 border-slate-50 bg-slate-50 focus:border-[#bf9b30] outline-none transition-all"
                                    onChange={(e) => setFormData({...formData, staff_name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Special Instructions</label>
                                <textarea 
                                    rows="3"
                                    className="w-full p-3 rounded-xl border-2 border-slate-50 bg-slate-50 focus:border-[#bf9b30] outline-none transition-all"
                                    placeholder="e.g. Extra towels needed..."
                                    onChange={(e) => setFormData({...formData, special_instructions: e.target.value})}
                                ></textarea>
                            </div>

                            <button type="submit" className="w-full bg-[#bf9b30] text-white py-4 rounded-2xl font-black shadow-lg hover:bg-black transition-all mt-4">Assign Task</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Housekeeping;
