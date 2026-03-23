import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, Globe, AlertCircle, Landmark, Sparkles } from 'lucide-react';

const InputField = ({ label, type, icon, placeholder, value, onChange, isFocused, onFocus, onBlur, children }) => (
  <div className="group relative">
    <div className="flex justify-between items-center mb-1.5 px-1">
      <label className={`text-[9px] font-black tracking-[0.2em] uppercase transition-colors duration-300 ${isFocused ? 'text-[#bf9b30]' : 'text-black/40'}`}>
        {label}
      </label>
    </div>
    
    <div className={`relative rounded-xl border transition-all duration-500 overflow-hidden ${
      isFocused 
      ? 'border-[#bf9b30] bg-white shadow-[0_15px_30px_rgba(191,155,48,0.1)]' 
      : 'border-black/[0.05] bg-black/[0.02]'
    }`}>
      <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${isFocused ? 'text-[#bf9b30] scale-110' : 'text-black/20'}`}>
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full py-4.5 pl-12 pr-12 bg-transparent border-none outline-none text-[#1a1208] text-sm font-bold placeholder:text-black/10 transition-all"
      />
      {children}
    </div>
  </div>
);

const OWNER_SESSION_KEY = 'ownerSession';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { 
    setLoaded(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  useEffect(() => {
    const storedSession = localStorage.getItem(OWNER_SESSION_KEY);
    if (storedSession) navigate('/owner');
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFeedback('');

    if (!formData.email || !formData.password) {
      setFeedback('Entry Denied: Credentials Required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify({
          ...data.owner,
          loginTime: new Date().toISOString()
        }));
        // Update Header
        window.dispatchEvent(new Event("userUpdated"));
        navigate('/owner');
      } else {
        setFeedback(data.error || 'Authentication Failed');
      }
    } catch (error) {
      setFeedback('Cloud Link Interrupted');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex font-sans overflow-hidden bg-[#faf9f6] fixed inset-0">
      
      {/* LEFT PANEL - BRANDING (PREMIUM IVORY & GOLD) */}
      <div className="hidden lg:flex flex-col justify-center w-[45%] relative p-20 bg-[linear-gradient(160deg,#fffef9_0%,#fdf8ec_50%,#faf6e8_100%)] overflow-hidden">
        {/* Decorative Grid & Blur */}
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(191,155,48,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(191,155,48,0.1)_1px,transparent_1px)] bg-[length:30px_30px]" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-[#bf9b30]/10 rounded-full blur-[120px]" />
        
        <div className={`z-10 transition-all duration-1000 transform ${loaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
          <div className="flex items-center gap-3 mb-12">
            <div className="p-2.5 bg-white shadow-xl rounded-xl border border-[#bf9b30]/20">
               <Landmark className="text-[#bf9b30]" size={22} />
            </div>
            <span className="text-[#9a7a20] font-black tracking-[0.4em] text-[10px] uppercase">Property Owner</span>
          </div>

          <h1 className="text-6xl font-light leading-[1.1] text-[#1a1208] font-serif tracking-tighter mb-8">
            The Pinnacle of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9a7a20] via-[#c8a227] to-[#9a7a20] italic font-normal">
              Hospitality.
            </span>
          </h1>
          
          <div className="h-[2px] w-24 bg-gradient-to-r from-[#bf9b30] to-transparent mb-10" />
          
          <p className="text-[13px] leading-relaxed text-black/50 max-w-[340px] font-medium tracking-wide italic">
            "Your vision, our architecture. Manage your legacy with unprecedented precision."
          </p>
        </div>

        <div className="absolute bottom-10 left-20 flex items-center gap-3 text-[#bf9b30]/30">
            <Sparkles size={14} />
            <span className="text-[9px] font-black tracking-widest uppercase">Premium Owner Access 2026</span>
        </div>
      </div>

      {/* RIGHT PANEL - LOGIN FORM */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24 relative bg-white">
        <div className={`w-full max-w-[400px] transition-all duration-1000 delay-300 ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          
          <div className="mb-12">
            <h2 className="text-3xl font-light text-[#1a1208] font-serif mb-3 italic">Owner Access</h2>
            <div className="flex items-center gap-3">
               <div className="h-[1px] w-12 bg-[#bf9b30]/40" />
               <p className="text-[10px] text-black/40 font-black uppercase tracking-[0.3em]">Verify Your Identity</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <InputField 
              label="Corporate Email" 
              type="email" 
              placeholder="owner@hotel-legacy.com"
              icon={<User size={18} />}
              value={formData.email}
              isFocused={focused === 'email'}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />

            <InputField 
              label="Security Key" 
              type={showPassword ? 'text' : 'password'} 
              placeholder="••••••••••••"
              icon={<Lock size={18} />}
              value={formData.password}
              isFocused={focused === 'pass'}
              onFocus={() => setFocused('pass')}
              onBlur={() => setFocused(null)}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            >
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-black/20 hover:text-[#bf9b30] transition-all"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </InputField>

            {feedback && (
              <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-wider bg-red-50 p-4 rounded-xl border border-red-100 italic">
                <AlertCircle size={16} />
                {feedback}
              </div>
            )}

            <div className="pt-4">
                <button
                type="submit"
                disabled={isSubmitting}
                className={`group relative w-full py-5 rounded-xl bg-[#1a1208] text-white shadow-2xl overflow-hidden transition-all duration-500 active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                >
                <div className="absolute inset-0 bg-gradient-to-r from-[#bf9b30] via-[#d4af37] to-[#bf9b30] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                <span className="relative z-10 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] group-hover:text-white transition-colors duration-500">
                    {isSubmitting ? 'Verifying...' : 'Establish Connection'}
                    <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-500" />
                </span>
                </button>
            </div>
          </form>

          <div className="mt-16 text-center">
            <button 
              onClick={() => navigate('/')}
              className="group inline-flex items-center gap-2.5 text-[10px] font-black text-black/20 uppercase tracking-[0.2em] hover:text-[#bf9b30] transition-all"
            >
              <Globe size={13} className="group-hover:rotate-180 transition-transform duration-1000" /> 
              Back to Public Web
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;