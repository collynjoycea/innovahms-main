import React, { useEffect, useState } from "react";
import { AlertCircle, KeyRound, Mail, MessageSquare, ShieldCheck, X } from "lucide-react";
import { getPasswordStrengthMessage, isValidEmail, isValidHotelCode } from "../utils/authValidation";

const ForgotPasswordModal = ({ isOpen, onClose, userType, title, initialEmail = "", initialHotelCode = "" }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(initialEmail);
  const [hotelCode, setHotelCode] = useState(initialHotelCode);
  const [channel, setChannel] = useState("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setEmail(initialEmail);
    setHotelCode(initialHotelCode);
    setChannel("email");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setDevOtp("");
    setLoading(false);
  }, [isOpen, initialEmail, initialHotelCode]);

  if (!isOpen) return null;

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (userType === "staff" && !isValidHotelCode(hotelCode)) {
      setError("Enter a valid hotel code.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType,
          email,
          hotelCode: hotelCode.trim().toUpperCase(),
          channel,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Failed to send OTP.");
        return;
      }
      setDevOtp(data.devOtp || "");
      setSuccess(data.message || "OTP sent.");
      setStep(2);
    } catch {
      setError("Unable to reach the server right now.");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("OTP must be 6 digits.");
      return;
    }
    const passwordError = getPasswordStrengthMessage(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType,
          email,
          hotelCode: hotelCode.trim().toUpperCase(),
          otp,
          newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }
      setSuccess(data.message || "Password updated successfully.");
      window.setTimeout(() => onClose?.(), 1200);
    } catch {
      setError("Unable to reach the server right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0f1117] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#bf9b30]">Account Recovery</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">{title || "Forgot Password"}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {step === 1 ? "Request a one-time password." : "Enter the OTP and your new password."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <div>
              <p>{success}</p>
              {devOtp ? <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Dev OTP: {devOtp}</p> : null}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <form onSubmit={submitRequest} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email</span>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-[#bf9b30]"
                  placeholder="name@hotel.com"
                />
              </div>
            </label>

            {userType === "staff" ? (
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hotel Code</span>
                <input
                  type="text"
                  value={hotelCode}
                  onChange={(event) => setHotelCode(event.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold uppercase outline-none focus:border-[#bf9b30]"
                  placeholder="INNOVAHMS-1"
                />
              </label>
            ) : null}

            <div>
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Send OTP Via</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${
                    channel === "email" ? "border-[#bf9b30] bg-[#bf9b30]/15 text-[#f5d37e]" : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  <Mail size={14} /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.2em] ${
                    channel === "sms" ? "border-[#bf9b30] bg-[#bf9b30]/15 text-[#f5d37e]" : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  <MessageSquare size={14} /> SMS
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#bf9b30] px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-[#0f1117] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">OTP Code</span>
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={otp}
                  maxLength={6}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm font-black tracking-[0.35em] outline-none focus:border-[#bf9b30]"
                  placeholder="123456"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none focus:border-[#bf9b30]"
                placeholder="Create a stronger password"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none focus:border-[#bf9b30]"
                placeholder="Repeat the new password"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#bf9b30] px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-[#0f1117] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Updating Password..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-300"
            >
              <Mail size={14} /> Request New OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
