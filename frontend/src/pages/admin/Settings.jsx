import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Building2, Shield, Database, Bell, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

const Settings = () => {
  const { isDarkMode } = useOutletContext();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Centralized State for all switches
  const [switches, setSwitches] = useState({
    twoFactor: true,
    sessionTimeout: true,
    ipWhitelisting: true,
    maintenanceMode: false,
    autoBackup: true,
    emailAlerts: true,
    smsFailures: true,
    errorLogDigest: true,
    marketingEmails: false,
  });

  // Theme Configurations
  const bgMain = isDarkMode ? "bg-[#09090b]" : "bg-[#f4f4f5]";
  const cardBg = isDarkMode ? "bg-[#111111]" : "bg-white";
  const borderColor = isDarkMode ? "border-white/10" : "border-gray-200";
  const textColor = isDarkMode ? "text-white" : "text-gray-900";
  const inputBg = isDarkMode ? "bg-black/40" : "bg-gray-50";

  // Function: Trigger Feedback
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Function: Toggle logic
  const handleToggle = (key) => {
    setSwitches(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Function: Save logic
  const handleSave = () => {
    triggerToast("System settings updated successfully!");
  };

  // Reusable Toggle Component
  const renderToggle = (label, stateKey) => (
    <div 
      className="flex items-center justify-between py-3 cursor-pointer group select-none transition-all active:px-1"
      onClick={() => handleToggle(stateKey)}
    >
      <span className={`text-[11px] font-bold transition-colors ${isDarkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-black'}`}>
        {label}
      </span>
      <div className={`w-9 h-5 rounded-full relative transition-all duration-300 shadow-inner ${switches[stateKey] ? 'bg-[#c9a84c]' : 'bg-gray-600'}`}>
        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-300 ${switches[stateKey] ? 'left-5' : 'left-1'}`}></div>
      </div>
    </div>
  );

  return (
    <div className={`p-6 space-y-5 text-left min-h-screen relative transition-all duration-300 ${bgMain}`}>
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#c9a84c] text-black px-5 py-3 rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={18} strokeWidth={3} />
          <span className="text-[11px] font-black uppercase tracking-wider">{toastMsg}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className={`flex justify-between items-center border-b ${borderColor} pb-5`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${textColor}`}>
            System <span className="text-[#c9a84c]">Settings</span>
          </h1>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1 italic">
            Global platform configuration and security
          </p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded bg-[#c9a84c] text-black font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#c9a84c]/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Save size={16} strokeWidth={3} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* PLATFORM INFORMATION */}
        <div className={`p-6 rounded-xl border ${cardBg} ${borderColor} space-y-5`}>
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#c9a84c]" />
            <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Platform Information</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Platform Name</label>
                <input type="text" defaultValue="Innova-HMS" className={`w-full p-3 rounded-lg border ${borderColor} ${inputBg} ${textColor} text-[11px] font-bold outline-none focus:border-[#c9a84c]/50 transition-all`} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Version Control</label>
                <div className={`w-full p-3 rounded-lg border ${borderColor} ${inputBg} text-[#c9a84c] text-[11px] font-bold`}>v2.4.1 - Stable</div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Developer Company</label>
              <input type="text" defaultValue="Innova Tech Solutions, Inc." className={`w-full p-3 rounded-lg border ${borderColor} ${inputBg} ${textColor} text-[11px] font-bold outline-none focus:border-[#c9a84c]/50 transition-all`} />
            </div>
          </div>
        </div>

        {/* SECURITY & ACCESS */}
        <div className={`p-6 rounded-xl border ${cardBg} ${borderColor}`}>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-[#c9a84c]" />
            <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Security & Access</h2>
          </div>
          <div className="space-y-0 divide-y divide-white/5">
            {renderToggle("Two-Factor Authentication (2FA)", "twoFactor")}
            {renderToggle("Session Timeout (30 min)", "sessionTimeout")}
            {renderToggle("IP Whitelisting for SuperAdmin", "ipWhitelisting")}
            {renderToggle("Maintenance Mode", "maintenanceMode")}
          </div>
        </div>

        {/* DATABASE & BACKUPS */}
        <div className={`p-6 rounded-xl border ${cardBg} ${borderColor} space-y-5`}>
          <div className="flex items-center gap-2">
            <Database size={16} className="text-[#c9a84c]" />
            <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Database & Backups</h2>
          </div>
          <div className="p-4 rounded-lg bg-black/30 border border-white/5 space-y-2">
            <p className="text-[9px] font-bold text-gray-500 uppercase">Current Status</p>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold ${textColor}`}>Last backup: Mar 15, 2026</span>
              <span className="text-[10px] text-[#c9a84c] font-black">2.8 GB</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => triggerToast("Database backup initiated...")} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-[#c9a84c] text-black font-black text-[9px] uppercase hover:brightness-110 active:scale-95 transition-all">
              <Database size={14}/> Backup Now
            </button>
            <button onClick={() => triggerToast("Fetching backup logs...")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border ${borderColor} ${textColor} text-[9px] font-black uppercase hover:bg-white/5 active:scale-95 transition-all`}>
              <RotateCcw size={14}/> Restore
            </button>
          </div>
        </div>

        {/* NOTIFICATION SETTINGS */}
        <div className={`p-6 rounded-xl border ${cardBg} ${borderColor}`}>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-[#c9a84c]" />
            <h2 className={`text-xs font-black uppercase tracking-widest ${textColor}`}>Notification Settings</h2>
          </div>
          <div className="space-y-0 divide-y divide-white/5">
            {renderToggle("Email alerts for new hotel signups", "emailAlerts")}
            {renderToggle("SMS on payment failures", "smsFailures")}
            {renderToggle("Error log digest (daily)", "errorLogDigest")}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;