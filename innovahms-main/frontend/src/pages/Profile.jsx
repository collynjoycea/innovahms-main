import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success"); // "success" | "error"
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: ""
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [passwordError, setPasswordError] = useState("");

  const triggerToast = (message, type = "success") => {
    setToastMsg(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUserInfo(JSON.parse(savedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleUpdateInfo = async () => {
    try {
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userInfo),
      });

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(userInfo));
        window.dispatchEvent(new Event("userUpdated"));
        triggerToast("Profile information updated!");
      } else {
        triggerToast("Update failed. Please try again.", "error");
      }
    } catch (err) {
      triggerToast("Failed to connect to server.", "error");
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    // --- Frontend validation ---
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    try {
      const response = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userInfo.id,
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        triggerToast("Password changed successfully!");
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else if (response.status === 401) {
        setPasswordError("Current password is incorrect.");
      } else {
        triggerToast(data.error || "Failed to change password.", "error");
      }
    } catch (err) {
      triggerToast("Failed to connect to server.", "error");
    }
  };

  const handleChange = (e) => {
    setUserInfo({ ...userInfo, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setPasswordError(""); // Clear error on input
  };

  if (!userInfo.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-innova-gold"></div>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-slate-50 font-sans pb-20 relative overflow-hidden">

      {/* Toast Notification */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 transform ${
        showToast ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'
      }`}>
        <div className={`${toastType === "error" ? "bg-red-900 border-red-500/50" : "bg-slate-900 border-innova-gold/50"} text-white px-6 py-3 rounded-full shadow-2xl border flex items-center gap-3`}>
          <div className={`${toastType === "error" ? "bg-red-500" : "bg-innova-gold"} rounded-full p-1`}>
            {toastType === "error" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            )}
          </div>
          <span className="text-sm font-medium tracking-wide">{toastMsg}</span>
        </div>
      </div>

      <div className="bg-innova-gold h-48 w-full absolute top-0 z-0"></div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 pt-10">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-slate-100">
          <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-innova-gold/10 rounded-full flex items-center justify-center border-2 border-innova-gold">
              <span className="text-3xl font-bold text-innova-gold">
                {userInfo.firstName[0]}{userInfo.lastName[0]}
              </span>
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold text-slate-800">
                {userInfo.firstName} {userInfo.lastName}
              </h1>
              <p className="text-slate-500 font-medium">{userInfo.email}</p>
              <div className="mt-2 inline-block px-3 py-1 bg-innova-gold/10 text-innova-gold text-xs font-bold rounded-full uppercase tracking-widest">
                Gold Member
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Info */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#bf9b30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Personal Info</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1">First Name</label>
                <input name="firstName" type="text" value={userInfo.firstName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-innova-gold focus:border-innova-gold outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1">Last Name</label>
                <input name="lastName" type="text" value={userInfo.lastName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-innova-gold focus:border-innova-gold outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1">Contact Number</label>
                <input name="contactNumber" type="text" value={userInfo.contactNumber} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-innova-gold focus:border-innova-gold outline-none transition-all text-sm" />
              </div>
              <button onClick={handleUpdateInfo} className="w-full mt-4 bg-innova-gold text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all text-sm uppercase tracking-widest">
                Update Info
              </button>
            </div>
          </div>

          {/* Security / Change Password */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#bf9b30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Security</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1">Current Password</label>
                <input
                  name="currentPassword"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-innova-gold focus:border-innova-gold outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1">New Password</label>
                <input
                  name="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-innova-gold focus:border-innova-gold outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-1">Confirm New Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-1 focus:ring-innova-gold focus:border-innova-gold outline-none transition-all text-sm"
                />
              </div>

              {/* Inline validation error */}
              {passwordError && (
                <p className="text-red-500 text-xs font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {passwordError}
                </p>
              )}

              <button
                onClick={handleChangePassword}
                className="w-full mt-4 border-2 border-innova-gold text-innova-gold font-bold py-3 rounded-lg hover:bg-innova-gold hover:text-white transition-all text-sm uppercase tracking-widest"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;