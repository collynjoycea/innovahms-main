import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Key, ChevronDown, UserCircle, Phone, ArrowRight } from 'lucide-react';

const StaffSignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    password: '',
    role: '',
    hotelCode: '' // Halimbawa: INNOVAHMS-1 mula sa iyong DB
  });

  const staffRoles = [
    "Hotel Manager",
    "Front Desk Operations",
    "Housekeeping & Maintenance",
    "Inventory & Supplies",
    "HR/Payroll Staff Management"
  ];

const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    // Gamitin ang 127.0.0.1 sa halip na localhost para mas stable ang connection
    const response = await fetch("http://127.0.0.1:5000/api/staff/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok) {
      alert("Staff Registration Successful!");
      navigate("/staff/login");
    } else {
      alert(result.error || "Failed to register");
    }
  } catch (error) {
    console.error("Connection Error:", error);
    alert("CORS or Network Error. Please check if Flask is running on port 5000.");
  }
};

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[550px] bg-[#111111] rounded-3xl border border-zinc-800/50 p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <h2 className="text-white text-3xl font-bold mb-2 tracking-tight">Staff <span className="text-[#b3903c] italic font-light">Registration</span></h2>
          <p className="text-zinc-500 text-sm font-light">Fill out the details below to join your hotel team.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">First Name</label>
              <input required type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white outline-none focus:border-[#b3903c]/50" onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Last Name</label>
              <input required type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white outline-none focus:border-[#b3903c]/50" onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>

          {/* Role Dropdown - Tugma sa DB CHECK (role IN (...)) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Professional Role</label>
            <div className="relative">
              <select 
                required
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-11 pr-10 text-white outline-none focus:border-[#b3903c]/50 appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-zinc-900">Select your role</option>
                {staffRoles.map(role => (
                  <option key={role} value={role} className="bg-zinc-900">{role}</option>
                ))}
              </select>
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Email & Contact Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email</label>
              <div className="relative">
                <input required type="email" placeholder="staff@hotel.com" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 text-white outline-none focus:border-[#b3903c]/50 text-sm" onChange={(e) => setFormData({...formData, email: e.target.value})} />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Contact #</label>
              <div className="relative">
                <input required type="text" placeholder="09XXXXXXXXX" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 text-white outline-none focus:border-[#b3903c]/50 text-sm" onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              </div>
            </div>
          </div>

          {/* Hotel Code - Verification Code (OBS-2026 / INNOVAHMS-1) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#b3903c] uppercase tracking-widest">Hotel Verification Code</label>
            <div className="relative">
              <input 
                required
                type="text" 
                placeholder="E.G. INNOVAHMS-1"
                className="w-full bg-[#1a160a] border border-[#b3903c]/30 rounded-xl py-3 px-4 text-white outline-none focus:border-[#b3903c] pl-11"
                onChange={(e) => setFormData({...formData, hotelCode: e.target.value.toUpperCase()})}
              />
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b3903c]/60" size={16} />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Security Password</label>
            <div className="relative">
              <input required type="password" placeholder="••••••••" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 px-4 text-white outline-none focus:border-[#b3903c]/50 pl-11" onChange={(e) => setFormData({...formData, password: e.target.value})} />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-[#b3903c] hover:bg-[#96772f] text-black font-black py-4 rounded-xl uppercase tracking-[0.2em] text-[11px] shadow-lg transition-all flex items-center justify-center gap-2 group mt-4"
          >
            
            Authenticate & Register
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="text-center mt-6">
            <p className="text-zinc-500 text-xs">
              Already part of the team? <Link to="/staff/login" className="text-[#b3903c] hover:underline">Sign In here</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffSignUp;