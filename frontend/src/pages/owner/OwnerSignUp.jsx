import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, Lock, Hash, ArrowRight, Building2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OwnerSignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    password: '',
    hotelCode: '',
    hotelName: '',
    hotelAddress: '',
  });

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/owner/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        const successMessage = data.createdHotel
          ? `Registration successful!\nHotel code: ${data.hotelCode}\n\nPlease log in to continue.`
          : `Registration successful!\nLinked hotel code: ${data.hotelCode}\n\nPlease log in to continue.`;
        alert(successMessage);
        navigate('/owner/login');
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (error) {
      alert('An error occurred. Please check if the server is running.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0c0a] flex items-center justify-center p-4 md:p-10 font-sans selection:bg-[#bf9b30]/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-[#14130f] rounded-3xl shadow-2xl border border-[#bf9b30]/10 overflow-hidden flex flex-col md:flex-row min-h-[600px]"
      >
        <div className="md:w-5/12 relative overflow-hidden bg-black flex flex-col justify-between p-10">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center opacity-40 grayscale-[50%]"
            style={{ backgroundImage: 'url("/images/suite-luxury.jpg")' }}
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0d0c0a] via-transparent to-transparent" />

          <div className="relative z-20">
            <h1 className="text-3xl font-black tracking-tighter text-[#e5e1d8]">
              INNOVA<span className="text-[#bf9b30]">.</span>HMS
            </h1>
          </div>

          <div className="relative z-20">
            <div className="bg-[#bf9b30]/10 backdrop-blur-md border border-[#bf9b30]/20 p-6 rounded-2xl">
              <Building2 size={32} className="text-[#bf9b30] mb-4" />
              <h2 className="text-2xl font-serif italic text-white mb-2">Partner with Excellence</h2>
              <p className="text-xs text-gray-400 leading-relaxed uppercase tracking-widest font-bold">
                Use an existing hotel code to claim a property, or leave it blank to create a new hotel and auto-generate a code.
              </p>
            </div>
          </div>
        </div>

        <div className="md:w-7/12 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">
              Create <span className="text-[#bf9b30]">Owner</span> Account
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold mt-2">
              Management Portal Access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bf9b30]/50" size={16} />
                <input
                  type="text"
                  placeholder="First Name"
                  required
                  value={formData.firstName}
                  className="w-full bg-[#0d0c0a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#bf9b30]/50 outline-none transition-all"
                  onChange={(e) => updateField('firstName', e.target.value)}
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bf9b30]/50" size={16} />
                <input
                  type="text"
                  placeholder="Last Name"
                  required
                  value={formData.lastName}
                  className="w-full bg-[#0d0c0a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#bf9b30]/50 outline-none transition-all"
                  onChange={(e) => updateField('lastName', e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bf9b30]/50" size={16} />
              <input
                type="text"
                placeholder="Hotel Code (optional)"
                className="w-full bg-[#0d0c0a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#bf9b30]/50 outline-none transition-all uppercase placeholder:normal-case"
                value={formData.hotelCode}
                onChange={(e) => updateField('hotelCode', e.target.value.toUpperCase())}
              />
              <p className="text-[9px] text-gray-600 mt-1 pl-1 font-bold uppercase tracking-widest">
                Use a code like INNOVAHMS-1 to claim an existing hotel. Leave blank to create a new one.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bf9b30]/50" size={16} />
                <input
                  type="text"
                  placeholder="Hotel Name"
                  value={formData.hotelName}
                  className="w-full bg-[#0d0c0a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#bf9b30]/50 outline-none transition-all"
                  onChange={(e) => updateField('hotelName', e.target.value)}
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bf9b30]/50" size={16} />
                <input
                  type="text"
                  placeholder="Hotel Address"
                  value={formData.hotelAddress}
                  className="w-full bg-[#0d0c0a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#bf9b30]/50 outline-none transition-all"
                  onChange={(e) => updateField('hotelAddress', e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bf9b30]/50" size={16} />
              <input
                type="email"
                placeholder="Business Email"
                required
                value={formData.email}
                className="w-full bg-[#0d0c0a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#bf9b30]/50 outline-none transition-all"
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bf9b30]/50" size={16} />
                <input
                  type="text"
                  placeholder="Contact Number"
                  required
                  value={formData.contactNumber}
                  className="w-full bg-[#0d0c0a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#bf9b30]/50 outline-none transition-all"
                  onChange={(e) => updateField('contactNumber', e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bf9b30]/50" size={16} />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={formData.password}
                  className="w-full bg-[#0d0c0a] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#bf9b30]/50 outline-none transition-all"
                  onChange={(e) => updateField('password', e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#bf9b30] text-[#0d0c0a] rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#d4ac37] active:scale-[0.98] transition-all shadow-lg shadow-[#bf9b30]/10 mt-6"
            >
              Create Owner Account <ArrowRight size={18} />
            </button>

            <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-6">
              Already a partner? <Link to="/owner/login" className="text-[#bf9b30] hover:underline">Login to Dashboard</Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
