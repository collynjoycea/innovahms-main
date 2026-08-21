import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Facebook, AlertCircle, Building2, CheckCircle2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { isValidEmail } from "../utils/authValidation";

const getPostLoginRedirect = () => {
  const returnTo = sessionStorage.getItem("returnTo");
  sessionStorage.removeItem("returnTo");

  if (returnTo?.startsWith("/booking")) {
    return "/";
  }

  return returnTo || "/";
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Validation States
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const validateField = (name, value) => {
    let errorMsg = "";
    if (name === "email") {
      const trimmed = value.trim();
      if (!trimmed) {
        errorMsg = "Email address is required.";
      } else if (!isValidEmail(trimmed)) {
        errorMsg = "Please enter a valid email address.";
      }
    } else if (name === "password") {
      if (!value) {
        errorMsg = "Password is required.";
      } else if (value.length < 6) {
        errorMsg = "Password must be at least 6 characters.";
      }
    }
    return errorMsg;
  };

  const validateForm = () => {
    const errors = {
      email: validateField("email", email),
      password: validateField("password", password),
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === "email" ? email : password;
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, val) }));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setServerError("");
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateField("email", val) }));
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setServerError("");
    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validateField("password", val) }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setServerError("");
    setTouched({ email: true, password: true });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("customerSession", JSON.stringify(data.user));
        window.dispatchEvent(new Event("userUpdated"));
        navigate(getPostLoginRedirect());
      } else {
        setServerError(data.error || "Invalid email or password.");
      }
    } catch {
      setServerError("Unable to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setServerError("");
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
        navigate(getPostLoginRedirect());
      } else {
        setServerError(data.error || "Google sign-in failed.");
      }
    } catch {
      setServerError("Failed to connect to authentication server.");
    }
  };

  const responseFacebook = async (response) => {
    if (!response.accessToken) return;
    setServerError("");
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
        navigate(getPostLoginRedirect());
      } else {
        setServerError(data.error || "Facebook sign-in failed.");
      }
    } catch {
      setServerError("Server connection error during Facebook login.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* LEFT BRAND PANEL (Balanced Layout) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-teal-400 mb-8">
              <Building2 size={28} />
              <span className="font-bold tracking-wider text-sm uppercase">INNOVA HMS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
              Seamless Guest Experience & Management
            </h2>
            <p className="text-xs text-teal-100/70 mt-3 leading-relaxed">
              Access room bookings, guest services, and account privileges in one integrated portal.
            </p>
          </div>

          <div className="space-y-3 my-8">
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
              <span>Real-time room availability & instant reservation</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
              <span>Secure authentication & guest data privacy</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
              <span>Direct access to Vision Suites booking status</span>
            </div>
          </div>

          <p className="text-[11px] text-teal-200/50">
            © INNOVA HMS Portal. All rights reserved.
          </p>
        </div>

        {/* RIGHT LOGIN FORM PANEL */}
        <div className="lg:col-span-7 p-8 sm:p-12 bg-white flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Sign In to Your Account</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please enter your credentials to proceed.
              </p>
            </div>

            {/* SERVER ERROR ALERT */}
            {serverError && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* EMAIL FIELD */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => handleBlur("email")}
                    placeholder="guest@innovahms.com"
                    className={`w-full rounded-lg border bg-slate-50 py-2.5 pl-10 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                      touched.email && fieldErrors.email
                        ? "border-rose-400 bg-rose-50/50 focus:border-rose-500"
                        : "border-slate-300 focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600"
                    }`}
                  />
                </div>
                {touched.email && fieldErrors.email && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">{fieldErrors.email}</p>
                )}
              </div>

              {/* PASSWORD FIELD */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={() => handleBlur("password")}
                    placeholder="••••••••"
                    className={`w-full rounded-lg border bg-slate-50 py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all ${
                      touched.password && fieldErrors.password
                        ? "border-rose-400 bg-rose-50/50 focus:border-rose-500"
                        : "border-slate-300 focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.password && fieldErrors.password && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">{fieldErrors.password}</p>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 py-2.5 text-xs font-semibold text-white shadow-md shadow-teal-600/10 transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400">or sign in with</span>
              </div>
            </div>

            {/* SOCIAL LOGINS */}
            <div className="space-y-2.5">
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setServerError("Google Login failed.")}
                  theme="outline"
                  shape="rectangular"
                  width="384"
                />
              </div>

              <FacebookLogin
                appId="1986409515302523"
                autoLoad={false}
                callback={responseFacebook}
                render={(renderProps) => (
                  <button
                    type="button"
                    onClick={renderProps.onClick}
                    className="flex items-center justify-center gap-2 w-full h-[38px] rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                  >
                    <Facebook size={15} className="text-[#1877F2] fill-[#1877F2]" />
                    <span>Facebook</span>
                  </button>
                )}
              />
            </div>

            {/* FOOTER LINK */}
            <p className="mt-8 text-center text-xs text-slate-500">
              Don't have an account?{" "}
              <Link to="/signup" className="text-teal-600 font-semibold hover:text-teal-700 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>

      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        userType="customer"
        title="Customer Password Reset"
        initialEmail={email}
      />
    </div>
  );
}