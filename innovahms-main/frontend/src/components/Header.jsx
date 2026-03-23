import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { User, LogOut, Settings, ChevronDown, Building2, Users } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const [isSignupDropdownOpen, setIsSignupDropdownOpen] = useState(false);
  
  const navigate = useNavigate();

  const loadUser = () => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("userUpdated", loadUser);
    return () => window.removeEventListener("userUpdated", loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setIsUserDropdownOpen(false);
    navigate("/");
  };

  const closeAll = () => {
    setIsLoginDropdownOpen(false);
    setIsSignupDropdownOpen(false);
    setIsUserDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-innova-gold/70 bg-innova-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* Left: Logo */}
        <Link to="/" className="relative flex items-center group">
          <img src="/images/logo.png" alt="Logo" className="h-10 w-auto scale-125 origin-left" />
          <div className="h-8 w-32 sm:w-40"></div>
        </Link>

        {/* Center: Main Links */}
    
<nav className="hidden absolute left-1/2 -translate-x-1/2 lg:flex items-center gap-6 text-sm font-medium text-[#bf9b30]">
  <Link to="/" onClick={closeAll} className="px-2 py-1 rounded-full hover:bg-black hover:text-white transition-all">
    Home
  </Link>
  <Link to="/features" onClick={closeAll} className="px-2 py-1 rounded-full hover:bg-black hover:text-white transition-all">
    Features
  </Link>
  <Link to="/about" onClick={closeAll} className="px-2 py-1 rounded-full hover:bg-black hover:text-white transition-all">
    About Us
  </Link>
  
  {/* DYNAMIC LINK: Dashboard if user exists, Contact if Guest */}
  {user ? (
    <>
      <Link to="/dashboard" onClick={closeAll} className="px-2 py-1 rounded-full hover:bg-black hover:text-white transition-all">
        Dashboard
      </Link>
      <Link to="/innova-suites" onClick={closeAll} className="px-2 py-1 rounded-full hover:bg-black hover:text-white transition-all">
        Innova Suites
      </Link>
    </>
    

  ) : (
    <Link to="/vision-suites" onClick={closeAll} className="px-2 py-1 rounded-full hover:bg-black hover:text-white transition-all">
      Vision Suites
    </Link>
    
  )}
</nav>

        {/* Right: Auth Buttons OR User Dropdown */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-innova-gold/50 bg-white px-4 py-2 text-sm font-semibold text-[#bf9b30] shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-innova-gold text-white">
                  <User size={14} />
                </div>
                <span>{user.firstName}</span>
                <ChevronDown size={14} className={`transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5">
                  <Link 
                    to="/profile" 
                    onClick={closeAll}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#bf9b30]"
                  >
                    <Settings size={16} /> Profile Settings
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              
              {/* Login Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => { setIsLoginDropdownOpen(!isLoginDropdownOpen); setIsSignupDropdownOpen(false); }}
                  className="flex items-center gap-1 text-sm font-medium text-[#bf9b30] border border-[#bf9b30] rounded-[50px] px-4 py-1.5 transition-all hover:bg-[#bf9b30] hover:text-white"
                >
                  Login <ChevronDown size={14} />
                </button>
                {isLoginDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5">
                    <Link to="/login" onClick={closeAll} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                      <Users size={16} className="text-innova-gold" /> Login as Customer
                    </Link>
                    {/* Updated path to /owner/login */}
                    <Link to="/owner/login" onClick={closeAll} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100">
                      <Building2 size={16} className="text-innova-gold" /> Login as Hotel Owner
                    </Link>
                  </div>
                )}
              </div>

              {/* Signup Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => { setIsSignupDropdownOpen(!isSignupDropdownOpen); setIsLoginDropdownOpen(false); }}
                  className="flex items-center gap-1 rounded-[50px] bg-innova-gold px-4 py-1.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  Sign Up <ChevronDown size={14} />
                </button>
                {isSignupDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5">
                    <Link to="/signup" onClick={closeAll} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                      <Users size={16} className="text-innova-gold" /> Signup as Customer
                    </Link>
                    <Link to="/signup/owner" onClick={closeAll} className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100">
                      <Building2 size={16} className="text-innova-gold" /> Signup as Hotel Owner
                    </Link>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </header>
  );
}
