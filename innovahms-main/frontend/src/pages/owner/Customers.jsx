import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Star, AlertCircle, TrendingUp, Search, 
  ChevronRight, MessageSquare, Award, BarChart3, 
  Download, Mail, Smartphone, X 
} from 'lucide-react';
import axios from 'axios';

const Customers = () => {
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSegment, setActiveSegment] = useState('ALL'); 
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [behaviorFilter, setBehaviorFilter] = useState('monthly');

    const fetchGuests = async () => {
        try {
            const res = await axios.get('/api/guests');
            setGuests(res.data || []);
        } catch (err) {
            console.error("Error fetching guests:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuests();
        const interval = setInterval(fetchGuests, 15000);
        const onFocus = () => fetchGuests();
        window.addEventListener('focus', onFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    const filteredGuests = useMemo(() => {
        return guests.filter(guest => {
            const guestName = guest.name?.toLowerCase() || '';
            const guestId = guest.customer_id?.toLowerCase() || '';
            const searchLower = searchTerm.toLowerCase();

            const matchesSearch = guestName.includes(searchLower) || guestId.includes(searchLower);
            
            // Logic for 'ACV' card to show all but filter only if specific segments are clicked
            const matchesSegment = activeSegment === 'ALL' || activeSegment === 'ACV' || guest.segment === activeSegment;
            
            return matchesSearch && matchesSegment;
        });
    }, [guests, searchTerm, activeSegment]);

    const stats = useMemo(() => {
        const totalRevenue = guests.reduce((acc, curr) => acc + (Number(curr.total_spent) || 0), 0);
        return {
            vip: guests.filter(g => g.segment === 'VIP').length,
            standard: guests.filter(g => g.segment === 'STANDARD').length,
            risk: guests.filter(g => g.segment === 'RISK').length,
            avgValue: guests.length > 0 ? totalRevenue / guests.length : 0
        };
    }, [guests]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
            <div className="w-12 h-12 border-4 border-[#bf9b30] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFCFB] p-8 font-sans text-slate-800">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Customer CRM & Insights</h1>
                    <p className="text-slate-400 font-medium mt-1 uppercase text-[10px] tracking-[0.2em]">Deep profile analysis and behavioral segmentation</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 bg-white hover:shadow-lg hover:border-[#bf9b30]/30 transition-all active:scale-95">
                    <Download size={18}/> Export Report
                </button>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                {[
                    { label: 'VIP / PREMIUM', val: stats.vip, color: 'border-yellow-400', icon: <Star size={16}/>, type: 'VIP' },
                    { label: 'STANDARD', val: stats.standard, color: 'border-slate-200', icon: <Users size={16}/>, type: 'STANDARD' },
                    { label: 'AT RISK', val: stats.risk, color: 'border-red-400', icon: <AlertCircle size={16}/>, type: 'RISK' },
                    { label: 'AVG. CUSTOMER VALUE', val: `₱${Math.round(stats.avgValue).toLocaleString()}`, color: 'border-[#bf9b30]', icon: <TrendingUp size={16}/>, type: 'ACV' }
                ].map((card, i) => (
                    <div 
                        key={i} 
                        onClick={() => setActiveSegment(card.type)}
                        className={`bg-white p-8 rounded-[35px] border-b-4 ${card.color} shadow-sm cursor-pointer transition-all duration-300 ${activeSegment === card.type ? 'ring-2 ring-[#bf9b30] -translate-y-2 shadow-xl' : 'hover:-translate-y-1 hover:shadow-md'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{card.label}</span>
                            <div className={`${activeSegment === card.type ? 'text-[#bf9b30]' : 'text-slate-300'}`}>{card.icon}</div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900">{card.val}</h2>
                    </div>
                ))}
            </div>

            {/* ANALYTICS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2 bg-white p-10 rounded-[45px] shadow-sm border border-slate-50">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black">Behavioral Analytics</h3>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {['weekly', 'monthly', 'yearly'].map((f) => (
                                <button 
                                    key={f}
                                    onClick={() => setBehaviorFilter(f)}
                                    className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${behaviorFilter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-[30px] border-2 border-dashed border-slate-100 text-slate-300">
                        <div className="text-center">
                            <BarChart3 className="mx-auto mb-2 opacity-20" size={40}/>
                            <p className="text-[10px] font-black uppercase tracking-widest">Processing {behaviorFilter} trends...</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[45px] shadow-sm border border-slate-50">
                    <h3 className="text-xl font-black mb-8">Loyalty & Rewards</h3>
                    <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                        <Award size={48} className="mb-2 opacity-20"/>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Rewards Pending</p>
                    </div>
                </div>
            </div>

            {/* MAIN DATA TABLE */}
            <div className="bg-white rounded-[45px] shadow-sm border border-slate-50 overflow-hidden mb-12">
                <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-6 bg-white">
                    <div>
                        <h3 className="text-2xl font-black">
                            {activeSegment === 'ALL' ? 'Customer Directory' : `${activeSegment} Analysis`}
                        </h3>
                        <p className="text-[10px] font-black text-[#bf9b30] mt-1 uppercase tracking-widest">
                            Showing {filteredGuests.length} curated profiles
                        </p>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#bf9b30] transition-colors" size={18}/>
                        <input 
                            type="text" placeholder="Search name or ID..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl w-full md:w-80 text-sm font-bold outline-none focus:ring-2 focus:ring-[#bf9b30]/20 transition-all"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="p-8">Customer</th>
                                {activeSegment === 'VIP' && (
                                    <><th className="py-8">Stays</th><th className="py-8">Revenue</th><th className="py-8">Pref. Room</th><th className="py-8">Points</th></>
                                )}
                                {activeSegment === 'STANDARD' && (
                                    <><th className="py-8">Frequency</th><th className="py-8">Avg Spend</th><th className="py-8">Contact</th><th className="py-8">Status</th></>
                                )}
                                {activeSegment === 'RISK' && (
                                    <><th className="py-8">Cancel %</th><th className="py-8">No-Show</th><th className="py-8">Payment Log</th><th className="py-8">Risk Score</th></>
                                )}
                                {activeSegment === 'ACV' && (
                                    <><th className="py-8">LTV</th><th className="py-8">Avg Trans.</th><th className="py-8">Retention</th><th className="py-8">CAC</th></>
                                )}
                                {activeSegment === 'ALL' && (
                                    <><th className="py-8">Visit History</th><th className="py-8">Segment</th><th className="py-8">Requests</th></>
                                )}
                                <th className="p-8 text-right">Profile</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredGuests.map((guest) => (
                                <tr key={guest.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="p-8">
                                        <div className="font-black text-slate-800">{guest.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 tracking-tighter">#{guest.customer_id}</div>
                                    </td>
                                    
                                    {activeSegment === 'VIP' && (
                                        <>
                                            <td className="text-sm font-bold">{guest.total_bookings || 0} stays</td>
                                            <td className="text-sm font-bold text-green-600">₱{Number(guest.total_spent).toLocaleString()}</td>
                                            <td className="text-sm text-slate-500 font-medium">{guest.preferred_room || 'N/A'}</td>
                                            <td className="text-sm font-black text-[#bf9b30]">{guest.points || 0} pts</td>
                                        </>
                                    )}

                                    {activeSegment === 'STANDARD' && (
                                        <>
                                            <td className="text-sm font-bold">{guest.frequency || '1-2x/year'}</td>
                                            <td className="text-sm font-bold">₱{Number(guest.avg_spend).toLocaleString()}</td>
                                            <td className="text-xs text-slate-400 font-medium leading-relaxed">{guest.email}<br/>{guest.phone}</td>
                                            <td><span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-md">ACTIVE</span></td>
                                        </>
                                    )}

                                    {activeSegment === 'RISK' && (
                                        <>
                                            <td className="text-sm font-bold text-red-500">{guest.cancel_rate || 0}%</td>
                                            <td className="text-sm font-bold">{guest.no_show_count || 0} sessions</td>
                                            <td className="text-xs text-slate-500 font-medium">{guest.payment_issue || 'Clear'}</td>
                                            <td><span className="text-sm font-black text-red-600">{guest.risk_score || 0}/100</span></td>
                                        </>
                                    )}

                                    {activeSegment === 'ACV' && (
                                        <>
                                            <td className="text-sm font-black text-[#bf9b30]">₱{Number(guest.clv || 0).toLocaleString()}</td>
                                            <td className="text-sm font-bold">₱{Number(guest.avg_trans || 0).toLocaleString()}</td>
                                            <td className="text-sm font-medium">{guest.retention || 'Stable'}</td>
                                            <td className="text-sm text-slate-400 font-medium">₱{guest.cac || 0}</td>
                                        </>
                                    )}

                                    {activeSegment === 'ALL' && (
                                        <>
                                            <td className="text-xs font-bold text-slate-600">{guest.last_visit || 'N/A'}</td>
                                            <td><span className="text-[10px] font-black px-3 py-1 bg-slate-100 rounded-lg">{guest.segment}</span></td>
                                            <td className="text-xs italic text-slate-400 max-w-[200px] truncate">"{guest.special_requests || 'No specific preferences'}"</td>
                                        </>
                                    )}

                                    <td className="p-8 text-right">
                                        <button 
                                            onClick={() => setSelectedGuest(guest)} 
                                            className="text-[#bf9b30] font-black text-[10px] uppercase tracking-widest hover:text-slate-900 flex items-center gap-1 ml-auto transition-colors"
                                        >
                                            Details <ChevronRight size={14}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {selectedGuest && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button onClick={() => setSelectedGuest(null)} className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full transition-colors">
                            <X size={20} className="text-slate-400 hover:text-slate-900"/>
                        </button>
                        <div className="w-20 h-20 bg-[#FDFCFB] border border-slate-100 rounded-3xl flex items-center justify-center text-[#bf9b30] mb-6">
                            <Users size={32}/>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedGuest.name}</h2>
                        <p className="text-slate-400 font-black text-[10px] tracking-widest uppercase mb-8">Ref ID: {selectedGuest.customer_id}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-6 bg-[#FDFCFB] border border-slate-50 rounded-[25px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Revenue Contribution</p>
                                <p className="text-2xl font-black text-[#bf9b30]">₱{Number(selectedGuest.total_spent || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-6 bg-[#FDFCFB] border border-slate-50 rounded-[25px]">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Market Segment</p>
                                <p className="text-2xl font-black text-slate-900 uppercase">{selectedGuest.segment}</p>
                            </div>
                        </div>
                        <button className="w-full py-5 bg-[#bf9b30] text-white rounded-2xl font-black shadow-lg shadow-[#bf9b30]/20 hover:bg-slate-900 transition-all active:scale-[0.98]">
                            INITIATE DIRECT OUTREACH
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
