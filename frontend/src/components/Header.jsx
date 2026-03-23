import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  User, LogOut, Settings, ChevronDown,
  Sun, Moon, Building2, Users, ShieldCheck,
  Briefcase, Crown, LayoutDashboard
} from "lucide-react";

const NAV_LINKS = [
  { name: "Suites",       id: "suites" },
  { name: "Rooms",        id: "rooms" },
  { name: "Hotels",       id: "hotels" },
  { name: "Promotions",   id: "promotions" },
  { name: "Reviews",      id: "guest-reviews" },
  { name: "AI Concierge", id: "ai-concierge" },
];

export default function Header() {
  const [user, setUser]                           = useState(null);
  const [membershipSummary, setMembershipSummary] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [openDrop, setOpenDrop]                   = useState(null); // "user" | "login" | "signup" | null
  const [isDarkMode, setIsDarkMode]               = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dropRef  = useRef(null);

  const closeAll = () => setOpenDrop(null);
  const toggle   = (name) => setOpenDrop((prev) => (prev === name ? null : name));

  // ── CLICK OUTSIDE ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) closeAll();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── CLOSE ON ROUTE CHANGE ──────────────────────────────────────────────────
  useEffect(() => { closeAll(); }, [location.pathname, location.search]);

  // ── THEME ──────────────────────────────────────────────────────────────────
  const syncTheme = (theme) => {
    const dark = theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    setIsDarkMode(dark);
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    syncTheme(saved || (prefersDark ? "dark" : "light"));

    const onStorage = (e) => { if (!e.key || e.key === "theme") syncTheme(localStorage.getItem("theme") || "light"); };
    const onCustom  = (e) => syncTheme(e?.detail?.theme || localStorage.getItem("theme") || "light");
    window.addEventListener("storage", onStorage);
    window.addEventListener("themeChanged", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("themeChanged", onCustom);
    };
  }, []);

  const toggleTheme = () => {
    const next = isDarkMode ? "light" : "dark";
    localStorage.setItem("theme", next);
    syncTheme(next);
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: next } }));
  };

  // ── USER ───────────────────────────────────────────────────────────────────
  const loadUser = () => {
    const staff    = localStorage.getItem("staffUser");
    const customer = localStorage.getItem("user");
    try {
      if (staff) {
        const p = JSON.parse(staff);
        const n = p?.user && typeof p.user === "object" ? p.user : p;
        setUser({ ...n, displayName: n.firstName || n.first_name || n.name || "Staff", isStaff: true, role: n.role || "Staff" });
      } else if (customer) {
        const p = JSON.parse(customer);
        const n = p?.user && typeof p.user === "object" ? p.user : p;
        setUser({ ...n, displayName: n.firstName || n.first_name || n.name || "User", isStaff: false });
      } else {
        setUser(null);
      }
    } catch { setUser(null); }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("userUpdated", loadUser);
    window.addEventListener("storage", loadUser);
    return () => {
      window.removeEventListener("userUpdated", loadUser);
      window.removeEventListener("storage", loadUser);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user || user.isStaff) { setMembershipSummary(null); return; }
      const rawId = user.id || user.customer_id || user.user_id;
      if (!rawId) { setMembershipSummary(null); return; }
      try {
        setMembershipLoading(true);
        const res  = await fetch(`/api/innova/summary/${String(rawId).split(":")[0]}`);
        const data = await res.json().catch(() => ({}));
        if (mounted && res.ok) setMembershipSummary(data);
      } catch { if (mounted) setMembershipSummary(null); }
      finally  { if (mounted) setMembershipLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [user]);

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    ["user","customerSession","staffUser","staffSession","hrSession","adminSession","ownerSession"]
      .forEach((k) => localStorage.removeItem(k));
    setUser(null);
    closeAll();
    window.dispatchEvent(new Event("userUpdated"));
    navigate("/");
  };

  // ── LOGO ───────────────────────────────────────────────────────────────────
  const handleLogoClick = (e) => {
    e.preventDefault();
    closeAll();
    if (location.pathname !== "/" || location.hash) navigate("/");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 120);
  };

  // ── SCROLL TO SECTION ──────────────────────────────────────────────────────
  const scrollTo = (id) => {
    closeAll();
    if (location.pathname !== "/") { navigate(`/#${id}`); return; }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── NAV HELPER ─────────────────────────────────────────────────────────────
  const go = (path) => { closeAll(); navigate(path); };

  const tier   = membershipSummary?.tier   || "STANDARD";
  const points = Number(membershipSummary?.points || 0);

  return (
    <header className={`fixed top-0 left-0 right-0 z-[1000] w-full border-b transition-colors duration-300 ${
      isDarkMode
        ? 'border-white/10 bg-zinc-950/90 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.05)]'
        : 'border-[#c9a84c]/20 bg-white/90 backdrop-blur-md shadow-sm'
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 gap-4" ref={dropRef}>

        {/* LOGO */}
        <Link to="/" onClick={handleLogoClick} className="flex-shrink-0">
          <img src="/images/logo.png" alt="Innova HMS" className="h-10 w-auto scale-125 origin-left" />
        </Link>

        {/* NAV */}
        <nav className={`hidden lg:flex items-center gap-1 rounded-full border px-1 py-1 transition-colors duration-300 ${
          isDarkMode ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-zinc-100/50'
        }`}>
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollTo(link.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                isDarkMode
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  : 'text-zinc-600 hover:bg-white hover:text-[#c9a84c]'
              }`}
            >
              {link.name}
            </button>
          ))}
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-3 flex-shrink-0">

          {/* THEME */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-all hover:scale-105 active:scale-95 ${
              isDarkMode
                ? 'border-[#bf9b30]/40 bg-zinc-800 text-[#bf9b30] hover:bg-zinc-700'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-[#bf9b30]'
            }`}
          >
            {isDarkMode ? <Sun size={16} strokeWidth={2.5} /> : <Moon size={16} strokeWidth={2.5} />}
          </button>

          <div className={`h-7 w-px ${isDarkMode ? 'bg-white/10' : 'bg-zinc-200'}`} />

          {/* ── LOGGED IN ── */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggle("user")}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-white shadow-md transition-all ${
                  user.isStaff
                    ? "bg-[#b3903c] hover:bg-[#96772f]"
                    : "bg-zinc-900 hover:bg-zinc-700 dark:bg-[#c9a84c] dark:hover:bg-[#a68a3e]"
                }`}
              >
                <div className="h-6 w-6 rounded-full border border-white/20 bg-white/20 flex items-center justify-center">
                  {user.isStaff ? <Briefcase size={11} /> : <User size={11} />}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user.displayName}{user.isStaff ? ` (${user.role})` : ""}
                </span>
                <ChevronDown size={13} className={`transition-transform ${openDrop === "user" ? "rotate-180" : ""}`} />
              </button>

              {openDrop === "user" && (
                <div className={`absolute right-0 mt-3 w-64 origin-top-right rounded-2xl border shadow-2xl z-[1001] overflow-hidden ${
                  isDarkMode ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'
                }`}>

                  {/* MEMBERSHIP BADGE — customer only */}
                  {!user.isStaff && (
                    <button
                      type="button"
                      onClick={() => go("/offers?view=privileged")}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#bf9b30]/10 to-[#f5e6b0]/20 dark:from-[#bf9b30]/15 dark:to-transparent border-b border-[#bf9b30]/20 hover:from-[#bf9b30]/20 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#bf9b30]/20 flex items-center justify-center flex-shrink-0">
                        <Crown size={14} className="text-[#bf9b30]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#bf9b30]">
                          {membershipLoading ? "Syncing..." : `${tier} Member`}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {membershipLoading ? "—" : `${points.toLocaleString()} pts · View Privileges`}
                        </p>
                      </div>
                      <ChevronDown size={12} className="-rotate-90 text-zinc-400 flex-shrink-0" />
                    </button>
                  )}

                  <div className="p-2">
                    <p className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {user.isStaff ? "Staff Portal" : "My Account"}
                    </p>

                    {user.isStaff ? (
                      <button
                        type="button"
                        onClick={() => go("/staff/profile")}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          isDarkMode ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Settings size={16} className="text-zinc-400" /> Profile Settings
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => go("/customer/dashboard")}
                          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                            isDarkMode ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <LayoutDashboard size={16} className="text-zinc-400" /> Dashboard
                        </button>
                        <button
                          type="button"
                          onClick={() => go("/profile")}
                          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                            isDarkMode ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <Settings size={16} className="text-zinc-400" /> Profile Settings
                        </button>
                        <button
                          type="button"
                          onClick={() => go("/rewards")}
                          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                            isDarkMode ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <Crown size={16} className="text-zinc-400" /> Membership & Rewards
                        </button>
                      </>
                    )}

                    <div className={`my-1.5 h-px ${isDarkMode ? 'bg-white/5' : 'bg-zinc-100'}`} />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={16} /> Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>

          ) : (
            /* ── NOT LOGGED IN ── */
            <div className="flex items-center gap-2">

              {/* LOGIN */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggle("login")}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-[#c9a84c] hover:text-[#a68a3e] dark:text-white transition-colors"
                >
                  Login <ChevronDown size={13} className={`transition-transform ${openDrop === "login" ? "rotate-180" : ""}`} />
                </button>
                {openDrop === "login" && (
                  <div className={`absolute right-0 mt-3 w-60 origin-top-right rounded-2xl border p-2 shadow-2xl z-[1001] ${
                    isDarkMode ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'
                  }`}>
                    {[
                      { to: "/login",       icon: <Users size={16} className="text-[#c9a84c]" />,      label: "Login as Customer" },
                      { to: "/owner/login", icon: <Building2 size={16} className="text-[#c9a84c]" />,  label: "Login as Hotel Owner" },
                      { to: "/staff/login", icon: <Briefcase size={16} className="text-[#c9a84c]" />,  label: "Login as Hotel Staff" },
                      { to: "/admin/login", icon: <ShieldCheck size={16} className="text-[#c9a84c]" />, label: "Super Admin" },
                    ].map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={closeAll}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          isDarkMode ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {item.icon} {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* REGISTER */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggle("signup")}
                  className="flex items-center gap-1 rounded-full bg-[#c9a84c] px-5 py-2 text-sm font-bold text-white shadow-lg shadow-[#c9a84c]/30 transition-all hover:scale-105 hover:bg-[#a68a3e]"
                >
                  Register <ChevronDown size={13} className={`transition-transform ${openDrop === "signup" ? "rotate-180" : ""}`} />
                </button>
                {openDrop === "signup" && (
                  <div className="absolute right-0 mt-3 w-60 origin-top-right rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl z-[1001] dark:border-white/10 dark:bg-zinc-900">
                    {[
                      { to: "/signup",       icon: <Users size={16} className="text-[#c9a84c]" />,     label: "Signup as Customer" },
                      { to: "/owner/signup", icon: <Building2 size={16} className="text-[#c9a84c]" />, label: "Signup as Owner" },
                      { to: "/staff/signup", icon: <Briefcase size={16} className="text-[#c9a84c]" />, label: "Sign as Staff" },
                    ].map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={closeAll}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5 transition-colors"
                      >
                        {item.icon} {item.label}
                      </Link>
                    ))}
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
