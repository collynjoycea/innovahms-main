import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Phone, Eye, EyeOff, UserPlus } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login';
import { Facebook } from "lucide-react"; 

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      // Step 1: Create the account
      const signupResponse = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const signupResult = await signupResponse.json();

      if (!signupResponse.ok) {
        setError(signupResult.error || "Registration failed.");
        return;
      }

      // Step 2: Auto-login with the same credentials
      const loginResponse = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const loginResult = await loginResponse.json();

      if (loginResponse.ok) {
        // Step 3: Save user and redirect to homepage
        localStorage.setItem("user", JSON.stringify(loginResult.user));
        localStorage.setItem("customerSession", JSON.stringify(loginResult.user));
        window.dispatchEvent(new Event("userUpdated"));
        navigate("/");
      } else {
        // Account was created but auto-login failed - fall back to login page
        navigate("/login");
      }
    } catch (err) {
      setError("Cannot connect to the server. Is Flask running?");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch("/api/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const result = await response.json();
      
      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(result.user));
        localStorage.setItem("customerSession", JSON.stringify(result.user));
        window.dispatchEvent(new Event("userUpdated"));
        navigate("/");
      } else {
        setError(result.error || "Google Login failed on the server.");
      }
    } catch (err) {
      setError("Cannot connect to the server. Is Flask running?");
    }
  };

  const responseFacebook = async (response) => {
    if (response.accessToken) {
      try {
        const res = await fetch("/api/facebook-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: response.accessToken }),
        });

        const result = await res.json();
        if (res.ok) {
          localStorage.setItem("user", JSON.stringify(result.user));
          localStorage.setItem("customerSession", JSON.stringify(result.user));
          window.dispatchEvent(new Event("userUpdated"));
          navigate("/");
        } else {
          setError(result.error || "Facebook Login failed.");
        }
      } catch (err) {
        setError("Server connection error.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-4 sm:px-6">
      
      <div className="flex w-full max-w-5xl max-h-[92vh] -mt-20 overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl backdrop-blur-md transition-all duration-500">
        
        {/* Left Side: Image*/}
        <div className="relative hidden w-1/2 lg:block group">
          <img 
            src="/images/signup-img.png" 
            alt="Hotel Luxury" 
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />

          <div className="absolute bottom-12 left-10 right-10">
            <div className="overflow-hidden">
              <p className="text-white/90 text-[10px] uppercase tracking-[0.4em] mb-3 animate-pulse font-bold">
                Welcome to Excellence
              </p>
            </div>
            <h1 className="text-4xl font-extrabold text-white leading-[1.1] tracking-tight">
              Smart <span className="text-[#bf9b30]">Hospitality</span> <br /> 
              Starts Here.
            </h1>
            <div className="mt-6 h-1.5 w-16 bg-[#bf9b30] rounded-full shadow-lg shadow-[#bf9b30]/20" />
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full p-6 sm:p-8 lg:p-10 lg:w-1/2 overflow-y-auto custom-scrollbar">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-black tracking-tight text-[#bf9b30]">Create Account</h2>
          </div>

          {error && (
            <p className="mt-3 text-red-500 text-xs font-medium flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </p>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSignUp}>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1.5">First Name</label>
                <input
                  name="firstName"
                  type="text"
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white py-2 px-4 text-sm text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/10 outline-none transition-all"
                  placeholder="John"
                  onChange={handleChange}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1.5">Last Name</label>
                <input
                  name="lastName"
                  type="text"
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white py-2 px-4 text-sm text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/10 outline-none transition-all"
                  placeholder="Doe"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1.5">Contact Number</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="contactNumber"
                  type="tel"
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/10 outline-none transition-all"
                  placeholder="09171234567"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="email"
                  type="email"
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/10 outline-none transition-all"
                  placeholder="name@company.com"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full rounded-xl border border-slate-300 bg-white py-2 px-4 text-sm text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/10 outline-none transition-all"
                    placeholder="********"
                    onChange={handleChange}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1.5">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white py-2 px-4 text-sm text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/10 outline-none transition-all"
                  placeholder="********"
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              className="group w-full flex items-center justify-center gap-2 rounded-xl bg-[#bf9b30] py-3 text-sm font-black text-white shadow-xl transition-all hover:bg-[#a6882d] hover:shadow-yellow-700/20 active:scale-[0.98] mt-4"
            >
              Create Account
              <UserPlus size={16} className="transition-transform group-hover:scale-110" />
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500 font-bold">Or continue with</span></div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <div className="w-full flex justify-center">
              <GoogleLogin 
                onSuccess={handleGoogleSuccess} 
                onError={() => setError("Google Login Failed")}
                theme="outline"
                shape="pill"
                width="280px" 
              />
            </div>
          
            <div style={{ display: 'none' }}>
              <FacebookLogin
                appId="760975413559116"
                callback={responseFacebook}
                fields="name,email,picture"
                tag={({ onClick }) => (
                  <button id="hidden-fb-btn" onClick={onClick} />
                )}
              />
            </div>

            <button 
              type="button"
              onClick={() => document.getElementById('hidden-fb-btn').click()}
              className="flex items-center justify-center gap-3 w-[280px] mx-auto px-4 py-2.5 border border-slate-300 rounded-full text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
            >
              <Facebook size={20} className="text-[#1877F2] fill-[#1877F2]" />
              <span>Continue with Facebook</span>
            </button>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <p className="text-xs font-medium text-slate-800">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-[#bf9b30] transition-colors hover:text-[#a6882d] hover:underline hover:decoration-2 hover:underline-offset-4"
              >
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

