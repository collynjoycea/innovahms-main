import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Briefcase,
  Building2,
  ChevronDown,
  Crown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "Features", path: "/features" },
  { label: "About Us", path: "/about" },
  { label: "Privileges", path: "/privileges" },
  { label: "Vision Suites", path: "/vision-suites" },
];

export default function Header() {
  const [user, setUser] = useState(null);
  const [membershipSummary, setMembershipSummary] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [openDrop, setOpenDrop] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // State para sa search input
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const dropRef = useRef(null);

  const closeAll = () => setOpenDrop(null);
  const toggle = (name) => setOpenDrop((prev) => (prev === name ? null : name));

  useEffect(() => {
    const handler = (event) => {
      if (dropRef.current && !dropRef.current.contains(event.target)) {
        closeAll();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    closeAll();
  }, [location.pathname, location.search]);

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

    const onStorage = (event) => {
      if (!event.key || event.key === "theme") {
        syncTheme(localStorage.getItem("theme") || "light");
      }
    };
    const onCustom = (event) => syncTheme(event?.detail?.theme || localStorage.getItem("theme") || "light");

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

  useEffect(() => {
    const loadUser = () => {
      const staffRaw = localStorage.getItem("staffUser");
      const customerRaw = localStorage.getItem("user") || localStorage.getItem("customerSession");

      try {
        if (staffRaw) {
          const parsed = JSON.parse(staffRaw);
          const normalized = parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
          setUser({
            ...normalized,
            displayName: normalized.firstName || normalized.first_name || normalized.name || "Staff",
            isStaff: true,
            role: normalized.role || "Staff",
          });
          return;
        }

        if (customerRaw) {
          const parsed = JSON.parse(customerRaw);
          const normalized = parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
          setUser({
            ...normalized,
            displayName: normalized.firstName || normalized.first_name || normalized.name || "Guest",
            isStaff: false,
          });
          return;
        }

        setUser(null);
      } catch {
        setUser(null);
      }
    };

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

    const loadMembership = async () => {
      if (!user || user.isStaff) {
        setMembershipSummary(null);
        return;
      }

      const rawId = user.id || user.customer_id || user.user_id;
      if (!rawId) {
        setMembershipSummary(null);
        return;
      }

      try {
        setMembershipLoading(true);
        const response = await fetch(`/api/innova/summary/${String(rawId).split(":")[0]}`);
        const payload = await response.json().catch(() => ({}));
        if (mounted && response.ok) {
          setMembershipSummary(payload);
        }
      } catch {
        if (mounted) setMembershipSummary(null);
      } finally {
        if (mounted) setMembershipLoading(false);
      }
    };

    loadMembership();
    return () => {
      mounted = false;
    };
  }, [user]);

  const go = (path) => {
    closeAll();
    navigate(path);
  };

  const handleLogoClick = (event) => {
    event.preventDefault();
    closeAll();
    if (location.pathname !== "/" || location.hash) {
      navigate("/");
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = () => {
    ["user", "customerSession", "staffUser", "staffSession", "hrSession", "adminSession", "ownerSession"]
      .forEach((key) => localStorage.removeItem(key));
    setUser(null);
    closeAll();
    window.dispatchEvent(new Event("userUpdated"));
    navigate("/");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    closeAll();
    if (searchQuery.trim()) {
      navigate(`/vision-suites?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/vision-suites");
    }
  };

  const handleBookings = () => {
    if (user?.isStaff) {
      go("/staff/dashboard");
      return;
    }
    if (user) {
      go("/customer/bookings");
      return;
    }
    go("/login");
  };

  const isActiveRoute = (path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));
  const tier = membershipSummary?.tier || "STANDARD";
  const points = Number(membershipSummary?.points || 0);

  const surfaceClass = isDarkMode
    ? "border-white/10 bg-[#0d1412] text-[#EEEEEE] shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
    : "border-[#e2e8f0] bg-white text-[#14231e] shadow-sm";

  const navShellClass = isDarkMode
    ? "border-white/10 bg-white/5"
    : "border-[#cce3dc] bg-[#f2f8f6]";

  const inputClass = isDarkMode
    ? "border-white/10 bg-white/5 text-[#EEEEEE] placeholder:text-zinc-400 focus:border-[#2FA084]"
    : "border-[#bcdcd3] bg-white text-[#1F6F5F] placeholder:text-slate-400 focus:border-[#1F6F5F]";

  const ghostButtonClass = isDarkMode
    ? "border-white/10 bg-white/5 text-[#EEEEEE] hover:bg-white/10"
    : "border-[#bcdcd3] bg-white text-[#1F6F5F] hover:bg-[#eef7f4]";

  const iconButtonClass = isDarkMode
    ? "border-white/10 bg-white/5 text-[#EEEEEE] hover:bg-white/10"
    : "border-[#bcdcd3] bg-white text-[#1F6F5F] hover:bg-[#eef7f4]";

  const menuPanelClass = isDarkMode ? "border-white/10 bg-[#0f1a17]" : "border-[#bcdcd3] bg-white shadow-xl";

  return (
    <header className={`fixed inset-x-0 top-0 z-[1000] border-b transition-colors duration-300 ${surfaceClass}`}>
      <div className="mx-auto max-w-[1320px] px-5 py-2.5 sm:px-7" ref={dropRef}>
        <div className="flex min-h-[60px] items-center justify-between gap-4">
          <Link to="/" onClick={handleLogoClick} className="min-w-0 flex-shrink-0">
            <img src="/images/logo.png" alt="Innova HMS" className="h-9 w-auto sm:h-10" />
          </Link>

          <nav className={`hidden lg:flex items-center gap-1 rounded-full border px-1.5 py-1.5 ${navShellClass}`}>
            {NAV_LINKS.map((item) => {
              const active = isActiveRoute(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => go(item.path)}
                  className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#1F6F5F] text-white shadow-[0_8px_20px_rgba(31,111,95,0.25)]"
                      : isDarkMode
                        ? "text-[#6FCF97] hover:bg-white/8 hover:text-white"
                        : "text-[#1F6F5F] hover:bg-white hover:text-[#2FA084]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            {/* WORKING SEARCH BAR */}
            <form onSubmit={handleSearchSubmit} className="hidden lg:relative lg:flex items-center">
              <input
                type="text"
                placeholder="Find a room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-48 xl:w-56 rounded-full border py-2 pl-9 pr-4 text-sm outline-none transition-all ${inputClass}`}
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute left-3 text-[#2FA084] hover:scale-110 transition-transform"
              >
                <Search size={16} />
              </button>
            </form>

            <button
              type="button"
              onClick={handleBookings}
              className="hidden sm:inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-[#1F6F5F] px-4 py-2 text-sm font-semibold text-[#EEEEEE] shadow-[0_8px_20px_rgba(31,111,95,0.22)] transition-all hover:bg-[#2FA084] sm:px-5 sm:py-2.5"
            >
              <BookOpen size={16} />
              {user?.isStaff ? "Dashboard" : "My Bookings"}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-all ${iconButtonClass}`}
            >
              {isDarkMode ? <Sun size={17} strokeWidth={2.2} /> : <Moon size={17} strokeWidth={2.2} />}
            </button>

            {user ? (
              <div className="relative">
                {/* PROFILE BUTTON - MATCHES THEME COLOR */}
                <button
                  type="button"
                  onClick={() => toggle("user")}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-all border ${
                    user.isStaff
                      ? "bg-[#1F6F5F] text-white hover:bg-[#2FA084] border-transparent"
                      : isDarkMode
                        ? "bg-[#2FA084] text-white hover:bg-[#1F6F5F] border-transparent"
                        : "bg-[#eef7f4] text-[#1F6F5F] hover:bg-[#e1f2ec] border-[#bcdcd3]"
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-current/20 bg-white/20 shrink-0">
                    {user.profileImage
                      ? <img src={user.profileImage} alt={user.displayName} className="h-full w-full object-cover" />
                      : user.isStaff ? <Briefcase size={13} /> : <User size={13} />
                    }
                  </span>
                  <span className="hidden max-w-[140px] truncate sm:inline">
                    {user.displayName}
                    {user.isStaff ? ` (${user.role})` : ""}
                  </span>
                  <ChevronDown size={14} className={`transition-transform ${openDrop === "user" ? "rotate-180" : ""}`} />
                </button>

                {openDrop === "user" ? (
                  <div className={`absolute right-0 mt-3 w-72 overflow-hidden rounded-[1.4rem] border shadow-2xl ${menuPanelClass}`}>
                    {!user.isStaff ? (
                      <button
                        type="button"
                        onClick={() => go("/privileges")}
                        className="flex w-full items-center gap-3 border-b border-[#2FA084]/20 bg-gradient-to-r from-[#eef7f4] via-[#f5fbf9] to-white px-4 py-4 text-left transition-all hover:from-[#e1f2ec] hover:to-[#f0f8f5] dark:from-[#11241f] dark:via-[#0c1815] dark:to-[#091210]"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F6F5F]/15 text-[#1F6F5F] dark:bg-[#6FCF97]/15 dark:text-[#6FCF97]">
                          <Crown size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-[#1F6F5F] dark:text-[#6FCF97]">
                            {membershipLoading ? "Syncing..." : `${tier} Member`}
                          </span>
                          <span className={`block truncate pt-1 text-xs ${isDarkMode ? "text-[#a0c2b7]" : "text-[#477366]"}`}>
                            {membershipLoading ? "Checking your perks..." : `${points.toLocaleString()} pts available`}
                          </span>
                        </span>
                        <ChevronDown size={14} className="-rotate-90 text-[#2FA084]" />
                      </button>
                    ) : null}

                    <div className="p-2">
                      <p className={`px-3 py-2 text-[9px] font-black uppercase tracking-[0.24em] ${isDarkMode ? "text-[#80a397]" : "text-[#588577]"}`}>
                        {user.isStaff ? "Staff Portal" : "My Account"}
                      </p>

                      {user.isStaff ? (
                        <button
                          type="button"
                          onClick={() => go("/staff/dashboard")}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${isDarkMode ? "text-[#EEEEEE] hover:bg-white/5" : "text-[#14231e] hover:bg-[#eef7f4]"}`}
                        >
                          <LayoutDashboard size={16} className="text-[#2FA084]" />
                          Dashboard
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => go("/customer/dashboard")}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${isDarkMode ? "text-[#EEEEEE] hover:bg-white/5" : "text-[#14231e] hover:bg-[#eef7f4]"}`}
                          >
                            <LayoutDashboard size={16} className="text-[#2FA084]" />
                            Dashboard
                          </button>
                          <button
                            type="button"
                            onClick={() => go("/customer/bookings")}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${isDarkMode ? "text-[#EEEEEE] hover:bg-white/5" : "text-[#14231e] hover:bg-[#eef7f4]"}`}
                          >
                            <BookOpen size={16} className="text-[#2FA084]" />
                            My Bookings
                          </button>
                          <button
                            type="button"
                            onClick={() => go("/profile")}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${isDarkMode ? "text-[#EEEEEE] hover:bg-white/5" : "text-[#14231e] hover:bg-[#eef7f4]"}`}
                          >
                            <Settings size={16} className="text-[#2FA084]" />
                            Profile Settings
                          </button>
                          <button
                            type="button"
                            onClick={() => go("/rewards")}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${isDarkMode ? "text-[#EEEEEE] hover:bg-white/5" : "text-[#14231e] hover:bg-[#eef7f4]"}`}
                          >
                            <Crown size={16} className="text-[#2FA084]" />
                            Membership & Rewards
                          </button>
                        </>
                      )}

                      <div className={`my-2 h-px ${isDarkMode ? "bg-white/10" : "bg-[#d9ece6]"}`} />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <LogOut size={16} />
                        Log Out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggle("login")}
                    className={`inline-flex items-center gap-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${isDarkMode ? "text-[#EEEEEE] hover:bg-white/5" : "text-[#1F6F5F] hover:bg-[#eef7f4]"}`}
                  >
                    Login
                    <ChevronDown size={14} className={`transition-transform ${openDrop === "login" ? "rotate-180" : ""}`} />
                  </button>

                  {openDrop === "login" ? (
                    <div className={`absolute right-0 mt-3 w-64 rounded-[1.4rem] border p-2 shadow-2xl ${menuPanelClass}`}>
                      {[
                        { to: "/login", label: "Login as Customer", icon: <Users size={16} className="text-[#2FA084]" /> },
                        { to: "/owner/login", label: "Login as Hotel Owner", icon: <Building2 size={16} className="text-[#2FA084]" /> },
                        { to: "/staff/login", label: "Login as Hotel Staff", icon: <Briefcase size={16} className="text-[#2FA084]" /> },
                        { to: "/admin/login", label: "Admin", icon: <ShieldCheck size={16} className="text-[#2FA084]" /> },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={closeAll}
                          className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${isDarkMode ? "text-[#EEEEEE] hover:bg-white/5" : "text-[#14231e] hover:bg-[#eef7f4]"}`}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggle("signup")}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1F6F5F] px-5 py-2.5 text-sm font-bold text-[#EEEEEE] shadow-[0_14px_32px_rgba(31,111,95,0.28)] transition-all hover:bg-[#2FA084]"
                  >
                    Register
                    <ChevronDown size={14} className={`transition-transform ${openDrop === "signup" ? "rotate-180" : ""}`} />
                  </button>

                  {openDrop === "signup" ? (
                    <div className={`absolute right-0 mt-3 w-64 rounded-[1.4rem] border p-2 shadow-2xl ${menuPanelClass}`}>
                      {[
                        { to: "/signup", label: "Signup as Customer", icon: <Users size={16} className="text-[#2FA084]" /> },
                        { to: "/owner/signup", label: "Signup as Owner", icon: <Building2 size={16} className="text-[#2FA084]" /> },
                        { to: "/staff/signup", label: "Signup as Staff", icon: <Briefcase size={16} className="text-[#2FA084]" /> },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={closeAll}
                          className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${isDarkMode ? "text-[#EEEEEE] hover:bg-white/5" : "text-[#14231e] hover:bg-[#eef7f4]"}`}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggle("mobile")}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border lg:hidden ${iconButtonClass}`}
            >
              {openDrop === "mobile" ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {openDrop === "mobile" ? (
          <div className={`mt-4 rounded-[1.6rem] border p-3 shadow-xl lg:hidden ${menuPanelClass}`}>
            {/* MOBILE SEARCH BAR */}
            <form onSubmit={handleSearchSubmit} className="relative mb-3 flex items-center">
              <input
                type="text"
                placeholder="Find a room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-2xl border py-2.5 pl-10 pr-4 text-sm outline-none transition-all ${inputClass}`}
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute left-3 text-[#2FA084]"
              >
                <Search size={16} />
              </button>
            </form>

            <div className="grid grid-cols-2 gap-2">
              {NAV_LINKS.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => go(item.path)}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActiveRoute(item.path)
                      ? "bg-[#1F6F5F] text-white"
                      : isDarkMode
                        ? "bg-white/5 text-[#EEEEEE]"
                        : "bg-[#eef7f4] text-[#1F6F5F]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleBookings}
                className="rounded-2xl bg-[#2FA084] px-4 py-3 text-sm font-semibold text-white"
              >
                {user?.isStaff ? "Open Dashboard" : "My Bookings"}
              </button>
            </div>

            {!user ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => go("/login")}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${ghostButtonClass}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => go("/signup")}
                  className="rounded-2xl bg-[#1F6F5F] px-4 py-3 text-sm font-bold text-white hover:bg-[#2FA084]"
                >
                  Register
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}