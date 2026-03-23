import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Lock, Key, Eye, EyeOff, ArrowRight, 
  ShieldCheck, Globe, Briefcase, Quote, AlertCircle 
} from "lucide-react";

const StaffLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", hotelCode: "" });

  const staffQuotes = [
    { text: "Hospitality is making your guests feel like they are at home, even if they wish they were.", author: "Innova Core" },
    { text: "The magic is in the details. Excellence is not a skill, it's an attitude.", author: "Management" },
    { text: "Great service is the invisible architecture of a memorable stay.", author: "Team Lead" }
  ];

  useEffect(() => {
    setIsLoaded(true);
    document.body.style.overflow = 'hidden';
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % staffQuotes.length);
    }, 5000);
    return () => { 
      document.body.style.overflow = 'auto';
      clearInterval(interval);
    };
  }, []);

  // --- LOGIC HANDLERS ---
  const handleVerifyCode = () => {
    if (formData.hotelCode === "INNOVAHMS-1") {
      setIsVerified(true);
      setError("");
    } else {
      setError("Invalid Hotel Access Code.");
      setIsVerified(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!isVerified) {
      setError("Please verify your Hotel Owner Code first.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          hotelCode: formData.hotelCode
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const rawRole = result.staff.role;
        const role = rawRole.toLowerCase();

        localStorage.setItem("staffSession", "true");
        localStorage.setItem("staffUser", JSON.stringify(result.staff));
        window.dispatchEvent(new Event('staffSessionChanged'));

        if (role.includes("manager")) {
          navigate("/manager/dashboard");
        } else if (role.includes("inventory")) {
          navigate("/inventory/dashboard");
        } else if (role.includes("housekeeping") || role.includes("maintenance")) {
          navigate("/housekeeping/dashboard");
        } else if (role.includes("hr") || role.includes("payroll")) {
          localStorage.setItem("hrSession", "true");
          navigate("/hr/dashboard");
        } else {
          navigate("/staff/dashboard");
        }
      } else {
        setError(result.message || "Login failed");
      }
    } catch (error) {
      setError("Server connection error. Ensure Flask is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#f3f4f6] font-sans pt-24 pb-10 px-6 overflow-hidden fixed inset-0">
      
      {/* BACKGROUND DECOR */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-[30%] h-[30%] bg-[#bf9b30]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[30%] h-[30%] bg-slate-200 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.3] bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" />
      </div>

      {/* MAIN CONTAINER */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex w-full max-w-4xl h-[550px] overflow-hidden rounded-[28px] border border-white bg-white/70 shadow-[0_30px_70px_rgba(0,0,0,0.08)] backdrop-blur-2xl"
      >
        
        {/* LEFT PANEL: QUOTES & BRANDING */}
        <div className="hidden lg:flex flex-col justify-between w-[40%] p-10 bg-[#1e293b] relative">
          <div className="z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-2 bg-[#bf9b30] rounded-lg">
                <Briefcase className="text-white" size={16} />
              </div>
              <span className="text-white font-black tracking-[0.4em] text-[8px] uppercase opacity-50">Staff Node</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={quoteIndex}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="min-h-[140px]"
              >
                <h1 className="text-2xl font-medium text-white leading-snug italic font-serif">
                  "{staffQuotes[quoteIndex].text}"
                </h1>
                <p className="mt-4 text-[#bf9b30] font-bold text-[9px] uppercase tracking-[0.5em]">
                  — {staffQuotes[quoteIndex].author}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="z-10 flex items-center gap-3 opacity-20">
            <ShieldCheck size={12} className="text-white" />
            <span className="text-[7px] font-black text-white tracking-[0.3em] uppercase">Secured Terminal</span>
          </div>
        </div>

        {/* RIGHT PANEL: FORM */}
        <div className="flex-1 bg-white/40 flex flex-col items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-[320px]">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl font-black text-[#1e293b] tracking-tighter uppercase">Internal <span className="text-[#bf9b30]">Access</span></h2>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 italic">Identity Verification Required</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 ml-1 tracking-widest">Employee Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    type="email"
                    required
                    className="w-full py-2.5 pl-10 pr-4 bg-white/50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:border-[#bf9b30] focus:ring-4 focus:ring-[#bf9b30]/5 transition-all"
                    placeholder="staff@innovahms.com"
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 ml-1 tracking-widest">Security Key</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full py-2.5 pl-10 pr-12 bg-white/50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:border-[#bf9b30] focus:ring-4 focus:ring-[#bf9b30]/5 transition-all"
                    placeholder="••••••••"
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Hotel Code Verification Section */}
              <div className={`p-4 rounded-2xl border transition-all ${isVerified ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50/80 border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Key size={12} className={isVerified ? 'text-emerald-500' : 'text-[#bf9b30]'} />
                  <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Hotel Affiliation Code</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none focus:border-[#bf9b30]"
                    placeholder="CODE-XXXX"
                    value={formData.hotelCode}
                    onChange={(e) => setFormData({...formData, hotelCode: e.target.value.toUpperCase()})}
                  />
                  <button 
                    type="button" 
                    onClick={handleVerifyCode} 
                    className={`px-3 rounded-lg text-[8px] font-black uppercase transition-all ${isVerified ? 'bg-emerald-500 text-white' : 'bg-[#1e293b] text-white hover:bg-black'}`}
                  >
                    {isVerified ? 'Verified' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600"
                >
                  <AlertCircle size={14} />
                  <span className="text-[9px] font-bold uppercase">{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#bf9b30] hover:bg-[#a68628] disabled:bg-slate-300 text-white rounded-xl shadow-lg shadow-[#bf9b30]/20 transition-all text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95"
              >
                {isLoading ? "Validating..." : "Initialize Shift"} <ArrowRight size={14} />
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-2">
              <button onClick={() => navigate('/')} className="flex items-center justify-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] hover:text-[#bf9b30] transition-colors">
                <Globe size={12} /> Public Terminal
              </button>
              <div className="text-center text-[8px] text-slate-300 font-bold uppercase tracking-widest">
                No account? <Link to="/staff/signup" className="text-[#bf9b30] hover:underline">Request Access</Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffLogin;