import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const InputField = ({ label, type, icon, placeholder, value, onChange, isFocused, onFocus, onBlur, children }) => (
  <div className="group">
    <label className={`block text-[10px] font-bold tracking-[0.25em] uppercase mb-2.5 transition-colors ${isFocused ? 'text-[#9a7a20]' : 'text-black/70'}`}>
      {label}
    </label>
    <div className={`relative rounded-xl border transition-all duration-300 ${isFocused ? 'border-[#bf9b30]/60 bg-[#bf9b30]/5 shadow-[0_10px_20px_rgba(191,155,48,0.05),0_0_0_4px_rgba(191,155,48,0.04)]' : 'border-black/10 bg-white shadow-sm'}`}>
      <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isFocused ? 'text-[#bf9b30]' : 'text-black/60'}`}>
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full py-4 pl-12 pr-12 bg-transparent border-none outline-none text-[#1a1208] text-sm font-medium placeholder:text-black/30"
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFeedback('');

    if (!formData.email || !formData.password) {
      setFeedback('Email and password are required.');
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
        const ownerInfo = data?.owner || {};
        const sessionPayload = {
          id: ownerInfo.id,
          firstName: ownerInfo.firstName,
          lastName: ownerInfo.lastName,
          email: ownerInfo.email,
          hotelName: ownerInfo.hotelName, 
          lastLogin: new Date().toISOString()
      };
      
      localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify(sessionPayload));
      navigate('/owner'); 
      return;
    }
      setFeedback(data.error || 'Invalid email or password.');
    } catch (error) {
      setFeedback('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  // Check for existing session on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(OWNER_SESSION_KEY);
    if (!storedSession) return;

    try {
      const parsed = JSON.parse(storedSession);
      if (parsed?.email) {
        navigate('/owner');
      } else {
        localStorage.removeItem(OWNER_SESSION_KEY);
      }
    } catch {
      localStorage.removeItem(OWNER_SESSION_KEY);
    }
  }, [navigate]);

  const transitionClass = `transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;

  return (
    <div className="min-h-screen flex font-sans overflow-hidden bg-[#faf9f6]">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-start w-[45%] relative p-14 bg-[linear-gradient(160deg,#fffef9_0%,#fdf8ec_50%,#faf6e8_100%)]">
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute -top-[20%] -left-[20%] w-4/5 h-4/5 bg-[radial-gradient(circle,rgba(191,155,48,0.15)_0%,transparent_70%)] blur-[60px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(191,155,48,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(191,155,48,0.2)_1px,transparent_1px)] bg-[length:40px_40px]" />
        </div>

        <div className={`${transitionClass} delay-100 z-10`}>
          <div className="inline-flex items-center gap-2.5 px-4 py-2 border border-[#bf9b30]/30 rounded bg-[#bf9b30]/5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#bf9b30]" />
            <span className="text-[10px] tracking-[0.3em] text-[#9a7a20] font-bold uppercase">Secure Access</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className={`${transitionClass} delay-300 z-10`}>
            <img src="/images/logo.png" alt="Logo" className="max-w-[320px] mb-10 drop-shadow-[0_10px_20px_rgba(191,155,48,0.15)]" />
            <h1 className="text-5xl font-light leading-[1.1] text-[#1a1208] font-serif tracking-tighter">
              Innovation in every<br />
              <span className="bg-gradient-to-r from-[#9a7a20] via-[#c8a227] to-[#9a7a20] bg-clip-text text-transparent italic font-normal">
                detail.
              </span>
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-black/60 max-w-[380px] font-medium italic">
              Welcome to the INNOVA-HMS owner portal. Manage your property with intuitive automation and effortless control.
            </p>
          </div>
        </div>
        <div className="h-20" /> 
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-[#faf9f6]">
        <div className={`w-full max-w-[420px] ${transitionClass} delay-500`}>
          <div className="lg:hidden mb-10 text-center">
            <img src="/images/logo.png" className="max-w-[180px] mx-auto" alt="Logo" />
          </div>
          
          <h2 className="text-2xl font-light text-[#1a1208] font-serif mb-2">Owner Login</h2>
          <p className="text-[13px] text-black/40 font-light mb-10">Enter your credentials to access your property management dashboard.</p>
          
          <div className="h-px bg-gradient-to-r from-[#bf9b30]/40 via-[#bf9b30]/10 to-transparent mb-10" />

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <InputField 
              label="Email Address" 
              type="email" 
              placeholder="owner@property.com"
              isFocused={focused === 'email'} 
              onFocus={() => setFocused('email')} 
              onBlur={() => setFocused(null)}
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              icon={<svg className="w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            />

            <InputField 
              label="Password" 
              type={showPassword ? 'text' : 'password'} 
              placeholder="••••••••••••"
              isFocused={focused === 'pass'} 
              onFocus={() => setFocused('pass')} 
              onBlur={() => setFocused(null)}
              value={formData.password}
              onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
              icon={<svg className="w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            >
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/50 hover:text-[#bf9b30] transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg className="w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>

              {feedback && (
                <p className="absolute -bottom-6 left-0 text-red-500 text-[11px] font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {feedback}
                </p>
              )}
            </InputField>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`mt-4 w-full py-[18px] rounded-xl text-white text-[11px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 bg-[linear-gradient(135deg,#bf9b30_0%,#d4af37_50%,#bf9b30_100%)] bg-[length:200%_100%] hover:bg-[100%_0] hover:-translate-y-0.5 shadow-lg shadow-[#bf9b30]/25 transition-all duration-300 active:scale-[0.98] ${isSubmitting ? 'opacity-70 pointer-events-none' : ''}`}
            >
              Secure Login 
              <svg className="w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>

          <div className="text-center mt-8">
            <a href="/" className="text-[11px] text-black/50 font-bold tracking-wider uppercase hover:text-[#bf9b30] transition-colors">
              Return to Website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;