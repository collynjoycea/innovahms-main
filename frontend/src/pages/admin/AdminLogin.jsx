import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, Globe, AlertCircle, ShieldCheck, Cpu } from 'lucide-react';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import { isValidEmail, normalizeEmail } from '../../utils/authValidation';

const InputField = ({ label, type, icon, placeholder, value, onChange, isFocused, onFocus, onBlur, children }) => (
  <div className="group relative">
    <div className="flex justify-between items-center mb-2 px-1">
      <label className={`text-[10px] font-black tracking-[0.2em] uppercase transition-colors duration-300 ${isFocused ? 'text-[#c9a84c]' : 'text-black/40'}`}>
        {label}
      </label>
      {isFocused && <span className="text-[9px] text-[#c9a84c] animate-pulse uppercase font-bold tracking-tighter">System Listening...</span>}
    </div>
    
    <div className={`relative rounded-2xl border-2 transition-all duration-500 overflow-hidden ${
      isFocused 
      ? 'border-[#c9a84c] bg-white shadow-[0_20px_40px_rgba(201,168,76,0.12)]' 
      : 'border-black/[0.03] bg-black/[0.02] hover:border-black/10'
    }`}>
      <span className={`absolute left-5 top-1/2 -translate-y-1/2 transition-all duration-300 ${isFocused ? 'text-[#c9a84c] scale-110' : 'text-black/20'}`}>
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full py-5 pl-14 pr-12 bg-transparent border-none outline-none text-[#1a1208] text-sm font-bold placeholder:text-black/10 transition-all"
      />
      {children}
    </div>
  </div>
);

const AdminLogin = () => {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setLoaded(true); }, []);

  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') navigate('/admin');
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFeedback('');

    const normalizedEmail = normalizeEmail(formData.email);
    if (!isValidEmail(normalizedEmail)) {
      setFeedback('Enter a valid admin email address');
      return;
    }
    if (!formData.password) {
      setFeedback('Invalid Entry: Credentials Required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email: normalizedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminSession', 'true');
        localStorage.setItem('adminData', JSON.stringify({
          ...data.admin,
          loginTime: new Date().toISOString()
        }));
        window.dispatchEvent(new Event("userUpdated"));
        navigate('/admin');
      } else {
        setFeedback(data.error || 'Identity Verification Failed');
      }
    } catch (error) {
      setFeedback('Link Failure: Cannot reach main server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans overflow-hidden bg-[#faf9f6]">
      
      {/* LEFT PANEL - BRANDING (PREMIUM DARK MODE) */}
      <div className="hidden lg:flex flex-col justify-center w-[40%] relative p-20 bg-[#0a0a0a] overflow-hidden">
        {/* Animated Background Grids */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#c9a84c]/10 rounded-full blur-[120px]" />
        
        <div className={`z-10 transition-all duration-1000 transform ${loaded ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
          <div className="flex items-center gap-3 mb-16">
            <div className="p-2 bg-[#c9a84c] rounded-lg shadow-[0_0_20px_rgba(201,168,76,0.5)]">
               <ShieldCheck className="text-black" size={24} />
            </div>
            <span className="text-white font-black tracking-[0.4em] text-xs uppercase">Innova Admin</span>
          </div>

          <h1 className="text-7xl font-black leading-[1.1] text-white tracking-tighter">
            ELEVATING<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] to-[#f3d382]">CONTROL.</span>
          </h1>
          
          <div className="h-1 w-20 bg-[#c9a84c] mt-10 mb-8 rounded-full" />
          
          <p className="text-sm leading-relaxed text-white/40 max-w-[320px] font-medium tracking-wide">
            Access the central intelligence of your hospitality network. Real-time analytics and global configuration starts here.
          </p>
        </div>

        {/* Decorative Element */}
        <div className="absolute bottom-10 left-20 flex items-center gap-4 text-white/20">
            <Cpu size={16} />
            <span className="text-[10px] font-black tracking-widest uppercase">System Version 3.0.1 - Caloocan Node</span>
        </div>
      </div>

      {/* RIGHT PANEL - LOGIN FORM */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24 relative bg-white">
        {/* Subtle grid pattern for the background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />
        
        <div className={`w-full max-w-[420px] transition-all duration-1000 delay-300 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          
          <div className="mb-14 text-center lg:text-left">
            <h2 className="text-4xl font-black text-[#1a1208] uppercase tracking-tighter mb-3">Administrator</h2>
            <div className="flex items-center justify-center lg:justify-start gap-3">
               <div className="h-[2px] w-8 bg-[#c9a84c]" />
               <p className="text-[11px] text-black/40 font-black uppercase tracking-[0.3em]">Identification Protocol</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <InputField 
              label="System Identifier" 
              type="email" 
              placeholder="admin@innovahms.com"
              icon={<User size={20} />}
              value={formData.email}
              isFocused={focused === 'email'}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />

            <InputField 
              label="Secure Access Key" 
              type={showPassword ? 'text' : 'password'} 
              placeholder="••••••••••••"
              icon={<Lock size={20} />}
              value={formData.password}
              isFocused={focused === 'pass'}
              onFocus={() => setFocused('pass')}
              onBlur={() => setFocused(null)}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            >
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-black/20 hover:text-[#c9a84c] transition-all"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </InputField>

            <div className="flex justify-end -mt-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-[10px] font-black uppercase tracking-[0.24em] text-black/35 transition hover:text-[#c9a84c]"
              >
                Forgot Password
              </button>
            </div>

            {feedback && (
              <div className="flex items-center gap-3 text-red-600 font-bold text-[11px] uppercase tracking-wider bg-red-50 p-4 rounded-2xl border border-red-100 animate-bounce">
                <AlertCircle size={18} />
                {feedback}
              </div>
            )}

            <div className="pt-2">
                <button
                type="submit"
                disabled={isSubmitting}
                className={`group relative w-full py-6 rounded-2xl bg-[#1a1208] text-white shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-[#c9a84c]/20 active:scale-[0.97] ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                >
                <div className="absolute inset-0 bg-gradient-to-r from-[#c9a84c] to-[#f3d382] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                <span className="relative z-10 flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[0.4em] group-hover:text-black transition-colors duration-500">
                    {isSubmitting ? 'Verifying Node...' : 'Establish Connection'}
                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-500" />
                </span>
                </button>
            </div>
          </form>

          <div className="mt-16 pt-8 border-t border-black/[0.05] text-center">
            <button 
              onClick={() => navigate('/')}
              className="group inline-flex items-center gap-3 text-[10px] font-black text-black/30 uppercase tracking-[0.25em] hover:text-[#c9a84c] transition-all"
            >
              <Globe size={14} className="group-hover:rotate-180 transition-transform duration-700" /> 
              Exit to Public Terminal
            </button>
          </div>
        </div>
      </div>
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        userType="admin"
        title="Admin Password Reset"
        initialEmail={formData.email}
      />
    </div>
  );
};

export default AdminLogin;
