import React, { useState, useEffect } from 'react';
import { 
  Users, Timer, Star, Plus, Search, 
  Filter, Download, AlertCircle, CheckCircle2, X, Upload, Briefcase, Mail, User
} from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

const Staff = () => {
  const [staffData, setStaffData] = useState([]);
  const [analytics, setAnalytics] = useState({
    activeCount: 0,
    totalCount: 0,
    avgCleaningSpeed: '0m',
    avgRating: 0,
    payrollProjection: 0,
    baseSalary: 0,
    bonuses: 0,
    tardinessCount: 0,
    overtimeHours: 0,
    cleaningProgress: [] 
  });
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Adding Staff
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'Housekeeping',
    salary: ''
  });

  const ownerId = JSON.parse(localStorage.getItem('ownerUser'))?.id || 1;
  const resolvedOwnerId = JSON.parse(localStorage.getItem('ownerSession'))?.id || ownerId;

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/owner/staff/${resolvedOwnerId}`);
      setStaffData(res.data.staff || []);
      setAnalytics(res.data.analytics || {
        activeCount: 0,
        totalCount: 0,
        avgCleaningSpeed: '0m',
        avgRating: 0,
        payrollProjection: 0,
        baseSalary: 0,
        bonuses: 0,
        tardinessCount: 0,
        overtimeHours: 0,
        cleaningProgress: []
      });
      setLoading(false);
    } catch (err) {
      console.error("Error fetching staff data:", err);
      setLoading(false);
    }
  };

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

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/owner/staff/${resolvedOwnerId}`, {
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        salary: newStaff.salary
      });
      Swal.fire({
        title: 'Success!',
        text: 'New staff member has been added.',
        icon: 'success',
        confirmButtonColor: '#bf9b30',
        borderRadius: '2rem'
      });
      setIsAddModalOpen(false);
      setNewStaff({ name: '', email: '', role: 'Housekeeping', salary: '' });
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Failed',
        text: 'Unable to save staff member.',
        icon: 'error',
        confirmButtonColor: '#bf9b30',
        borderRadius: '2rem'
      });
    }
  };

  const handleGeneratePayslips = async () => {
    Swal.fire({
      title: 'Generate Payslips?',
      text: "This will process digital payslips for the current cycle and notify staff.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#bf9b30',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, Generate',
      cancelButtonText: 'Cancel',
      background: '#fafaf9',
      borderRadius: '2rem',
      customClass: {
        title: 'font-black text-slate-800',
        popup: 'rounded-[2.5rem] shadow-2xl border border-slate-100',
        confirmButton: 'rounded-xl px-6 py-3 font-bold',
        cancelButton: 'rounded-xl px-6 py-3 font-bold'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Processing...',
          html: 'Generating payroll data and sending emails.',
          timer: 2000,
          timerProgressBar: true,
          didOpen: () => { Swal.showLoading() }
        }).then(() => {
          Swal.fire({
            title: 'Success!',
            text: 'Payslips have been generated and sent to staff emails.',
            icon: 'success',
            confirmButtonColor: '#bf9b30',
            borderRadius: '2rem'
          });
        });
      }
    });
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafaf9] dark:bg-transparent">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#bf9b30]"></div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#fafaf9] p-8 font-sans text-slate-800 dark:bg-transparent dark:text-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-[#bf9b30] tracking-tight">Staff Management</h1>
          <p className="mt-1 text-slate-400 dark:text-slate-500">Monitor performance, attendance, and payroll operations.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-[#bf9b30] text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-[#bf9b30]/20 active:scale-95"
        >
          <Plus size={20} /> Add New Staff
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard label="Active Staff Today" val={`${analytics.activeCount} / ${analytics.totalCount}`} sub="Attendance" color="text-green-500" bg="bg-green-50" />
        <StatCard label="Avg Cleaning Speed" val={analytics.avgCleaningSpeed || '0m'} sub="Efficiency" isBadge />
        <StatCard label="Guest Rating Avg" val={`${analytics.avgRating?.toFixed(1) || '0.0'} / 5.0`} sub="Performance" subColor="text-blue-500" subBg="bg-blue-50" />
        <StatCard label="Payroll Projection" val={`PHP ${analytics.payrollProjection?.toLocaleString() || '0'}`} sub="Current Cycle" borderLeft />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Staff Directory */}
        <div className="lg:col-span-2 rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black flex items-center gap-2">
              <Users className="text-[#bf9b30]" size={24} /> Staff Directory
            </h3>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search staff..." className="w-64 rounded-xl border-none bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#bf9b30]/20 dark:bg-[#0d1118] dark:text-slate-200 dark:placeholder:text-slate-500" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:border-white/10 dark:text-slate-500">
                  <th className="pb-4">Employee ID</th>
                  <th className="pb-4">Full Name</th>
                  <th className="pb-4">Role</th>
                  <th className="pb-4">Performance</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/10">
                {staffData.length > 0 ? staffData.map((staff) => (
                  <tr key={staff.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.03]">
                    <td className="py-4 text-xs font-bold text-slate-400 dark:text-slate-500">#EMP-{staff.id}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden text-[#bf9b30] flex items-center justify-center font-bold">
                          {staff.image ? <img src={staff.image} alt="" /> : staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{staff.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{staff.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm font-medium text-slate-600 dark:text-slate-300">{staff.role}</td>
                    <td className="py-4 text-sm font-bold text-[#bf9b30]">
                      <div className="flex items-center gap-1">{staff.rating || '0.0'} <Star size={12} fill="currentColor" /></div>
                    </td>
                    <td className="py-4"><StatusBadge status={staff.status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="mt-4 rounded-3xl border-2 border-dashed border-slate-50 py-10 text-center text-sm italic text-slate-400 dark:border-white/10 dark:text-slate-500">No staff records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Today's Duty Roster */}
        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
          <h3 className="mb-8 text-xl font-black text-slate-900 dark:text-white">Today's Duty Roster</h3>
          <div className="space-y-8">
            <ShiftBlock label="Morning Shift" time="06:00 - 14:00" count={analytics.morningShiftCount || 0} active={new Date().getHours() >= 6 && new Date().getHours() < 14} />
            <ShiftBlock label="Afternoon Shift" time="14:00 - 22:00" count={analytics.afternoonShiftCount || 0} active={new Date().getHours() >= 14 && new Date().getHours() < 22} />
            <ShiftBlock label="Night Shift" time="22:00 - 06:00" count={analytics.nightShiftCount || 0} active={new Date().getHours() >= 22 || new Date().getHours() < 6} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cleaning Progress */}
        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Cleaning Operations Progress</h3>
            <span className="animate-pulse rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">Live Tracking</span>
          </div>
          <div className="space-y-6">
            {analytics.cleaningProgress?.length > 0 ? analytics.cleaningProgress.map((wing, idx) => (
              <ProgressBar key={idx} label={wing.name} progress={wing.percentage} />
            )) : (
              <div className="rounded-3xl border-2 border-dashed border-slate-50 py-10 text-center text-xs italic text-slate-400 dark:border-white/10 dark:text-slate-500">Waiting for real-time task data...</div>
            )}
          </div>
        </div>

        {/* Financial & Payroll Summary */}
        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none">
          <h3 className="mb-8 text-xl font-black text-slate-900 dark:text-white">Financial & Payroll Summary</h3>
          <div className="space-y-4 mb-8">
            <AlertItem icon={<AlertCircle className="text-red-500" size={16}/>} label={`${analytics.tardinessCount || 0} Tardiness Recorded`} action="Review" color="bg-red-50 text-red-600" />
            <AlertItem icon={<Timer className="text-orange-500" size={16}/>} label={`${analytics.overtimeHours || 0}h Overtime Logged`} action="Details" color="bg-orange-50 text-orange-600" />
          </div>
          <div className="space-y-3 border-t border-slate-50 pt-6 dark:border-white/10">
            <div className="flex justify-between text-sm"><span className="text-slate-400 dark:text-slate-500">Base Salary:</span><span className="font-black text-slate-700 dark:text-slate-200">PHP {analytics.baseSalary?.toLocaleString() || '0.00'}</span></div>
            <div className="flex items-center justify-between pt-2"><span className="text-lg font-black dark:text-white">Estimated Total:</span><span className="text-2xl font-black text-[#bf9b30]">PHP {analytics.payrollProjection?.toLocaleString() || '0.00'}</span></div>
          </div>
          <button onClick={handleGeneratePayslips} className="w-full mt-8 bg-[#bf9b30] text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-[#bf9b30]/20 hover:bg-black transition-all active:scale-[0.98]">
            Generate Current Cycle Payslips
          </button>
        </div>
      </div>

      {/* --- ADD STAFF MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg overflow-hidden rounded-[3rem] border border-white bg-[#fafaf9] shadow-2xl animate-in zoom-in-95 duration-300 dark:border-white/10 dark:bg-[#11151d] dark:text-slate-100">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Add New Staff</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Personnel Onboarding</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full bg-white p-3 text-slate-400 shadow-sm transition-colors hover:text-red-500 dark:bg-[#0d1118]"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddStaffSubmit} className="space-y-5">
                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bf9b30]" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Abby Conda"
                      className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl shadow-sm text-sm focus:ring-2 focus:ring-[#bf9b30]/20 outline-none"
                      onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bf9b30]" size={18} />
                    <input 
                      required
                      type="email" 
                      placeholder="abby@innova.com"
                      className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl shadow-sm text-sm focus:ring-2 focus:ring-[#bf9b30]/20 outline-none"
                      onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bf9b30]" size={18} />
                      <select 
                        className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl shadow-sm text-sm focus:ring-2 focus:ring-[#bf9b30]/20 outline-none appearance-none cursor-pointer"
                        onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                      >
                        <option>Housekeeping</option>
                        <option>Maintenance</option>
                        <option>Front Desk</option>
                        <option>Manager</option>
                      </select>
                    </div>
                  </div>

                  {/* Salary Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Monthly Salary</label>
                    <div className="relative font-bold text-sm">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#bf9b30]">₱</span>
                      <input 
                        required
                        type="number" 
                        placeholder="0.00"
                        className="w-full pl-10 pr-6 py-4 bg-white border-none rounded-2xl shadow-sm text-sm focus:ring-2 focus:ring-[#bf9b30]/20 outline-none"
                        onChange={(e) => setNewStaff({...newStaff, salary: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  className="w-full bg-[#bf9b30] text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-[#bf9b30]/20 hover:bg-black transition-all mt-4 active:scale-95"
                >
                  Confirm Registration
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MINIMALIST SUB-COMPONENTS ---
const StatCard = ({ label, val, sub, isBadge, subColor, subBg, borderLeft }) => (
  <div className={`relative rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#11151d] dark:shadow-none ${borderLeft ? 'border-l-4 border-l-[#bf9b30]' : ''}`}>
    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
    <h2 className="mb-2 text-3xl font-black dark:text-white">{val}</h2>
    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${isBadge ? 'bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300' : `${subColor || 'text-green-600'} ${subBg || 'bg-green-50'} dark:bg-white/10`}`}>{sub}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    'On Shift': 'bg-green-50 text-green-500',
    'Delayed': 'bg-orange-50 text-orange-500',
    'default': 'bg-slate-50 text-slate-400'
  };
  return <span className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase ${styles[status] || styles.default}`}>{status || 'Offline'}</span>;
};

const ShiftBlock = ({ label, time, count, active }) => (
  <div className={`relative border-l-2 pl-6 transition-all ${active ? 'border-[#bf9b30]' : 'border-slate-100 dark:border-white/10'}`}>
    <p className={`mb-1 text-[10px] font-black uppercase tracking-widest ${active ? 'text-[#bf9b30]' : 'text-slate-400 dark:text-slate-500'}`}>{label} ({time}) {active && "| NOW"}</p>
    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{count} Staff Members</p>
  </div>
);

const ProgressBar = ({ label, progress }) => (
  <div>
    <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500"><span>{label}</span><span>{progress}%</span></div>
    <div className="h-1.5 w-full overflow-hidden rounded-full border border-slate-50 bg-slate-100 shadow-inner dark:border-white/10 dark:bg-[#0d1118]">
      <div className="h-full bg-[#bf9b30] transition-all duration-1000" style={{ width: `${progress}%` }} />
    </div>
  </div>
);

const AlertItem = ({ icon, label, action, color }) => (
  <div className={`flex justify-between items-center p-4 rounded-2xl ${color}`}>
    <div className="flex items-center gap-3">{icon}<span className="text-xs font-black uppercase tracking-tight">{label}</span></div>
    <button className="text-[10px] font-black underline uppercase tracking-widest hover:text-black dark:hover:text-white">{action}</button>
  </div>
);

export default Staff;
