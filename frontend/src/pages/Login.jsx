import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Facebook } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("customerSession", JSON.stringify(data.user));
        window.dispatchEvent(new Event("userUpdated"));
        const returnTo = sessionStorage.getItem('returnTo');
        sessionStorage.removeItem('returnTo');
        navigate(returnTo || "/");
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch("/api/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("customerSession", JSON.stringify(data.user));
        window.dispatchEvent(new Event("userUpdated"));
        const returnTo = sessionStorage.getItem('returnTo');
        sessionStorage.removeItem('returnTo');
        navigate(returnTo || "/");
      } else {
        setError(data.error || "Google login failed.");
      }
    } catch {
      setError("Failed to connect to Google login server.");
    }
  };

  const responseFacebook = async (response) => {
    if (!response.accessToken) return;
    try {
      const res = await fetch("/api/facebook-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: response.accessToken }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("customerSession", JSON.stringify(data.user));
        window.dispatchEvent(new Event("userUpdated"));
        const returnTo = sessionStorage.getItem('returnTo');
        sessionStorage.removeItem('returnTo');
        navigate(returnTo || "/");
      } else {
        setError(data.error || "Facebook login failed.");
      }
    } catch {
      setError("Server connection error.");
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden font-sans pt-20"
      style={{
        backgroundImage: "url('/images/herobg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />
      {/* Gold radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(191,155,48,0.18)_0%,transparent_70%)]" />

      {/* CARD */}
      <div className="relative z-10 w-full max-w-[420px] px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="rounded-[2rem] border border-[#bf9b30]/40 bg-white/10 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] overflow-hidden">

          {/* TOP GOLD ACCENT BAR */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />

          <div className="px-8 py-10">

            {/* LOGO + TITLE */}
            <div className="text-center mb-8">
              <img src="/images/logo.png" alt="Innova HMS" className="h-10 w-auto mx-auto mb-5 brightness-0 invert" />
              <h2 className="text-2xl font-black tracking-tight text-white">
                Welcome <span className="text-[#bf9b30]">Back</span>
              </h2>
              <p className="mt-1 text-[10px] font-bold text-white/50 uppercase tracking-[0.25em]">
                Sign in to your HMS Portal
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* EMAIL */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@innovahms.com"
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-11 pr-4 text-sm font-semibold text-white placeholder:text-white/25 outline-none focus:border-[#bf9b30]/70 focus:bg-white/15 transition-all"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">
                    Password
                  </label>
                  <Link to="#" className="text-[9px] font-bold text-white/40 hover:text-[#bf9b30] transition-colors uppercase tracking-widest">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-11 pr-12 text-sm font-semibold text-white placeholder:text-white/25 outline-none focus:border-[#bf9b30]/70 focus:bg-white/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3">
                  <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">!</span>
                  <p className="text-[11px] font-bold text-red-300 uppercase tracking-tight">{error}</p>
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full flex items-center justify-center gap-2 rounded-xl bg-[#bf9b30] py-4 text-[11px] font-black uppercase tracking-[0.25em] text-[#0d0c0a] shadow-[0_8px_32px_rgba(191,155,48,0.4)] hover:bg-[#d4ac37] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {isLoading ? "Authenticating..." : "Sign In"}
                {!isLoading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/15" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-transparent px-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  or continue with
                </span>
              </div>
            </div>

            {/* SOCIAL */}
            <div className="flex flex-col gap-3 items-center">
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google Login Failed")}
                  theme="filled_black"
                  shape="pill"
                  width="320px"
                />
              </div>
              <FacebookLogin
                appId="1986409515302523"
                autoLoad={false}
                callback={responseFacebook}
                render={(renderProps) => (
                  <button
                    onClick={renderProps.onClick}
                    className="flex items-center justify-center gap-3 w-full max-w-[320px] h-[40px] rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <Facebook size={17} className="text-[#1877F2] fill-[#1877F2]" />
                    <span className="text-white/80 text-sm font-medium">Continue with Facebook</span>
                  </button>
                )}
              />
            </div>

            {/* REGISTER LINK */}
            <p className="mt-8 text-center text-[11px] font-bold text-white/35 uppercase tracking-widest">
              New here?{" "}
              <Link to="/signup" className="font-black text-[#bf9b30] hover:text-[#d4ac37] transition-colors underline underline-offset-4">
                Register Now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
