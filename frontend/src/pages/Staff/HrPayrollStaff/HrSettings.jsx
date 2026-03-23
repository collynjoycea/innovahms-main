import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Save, Settings, Bell, Building2, 
  Calendar, Clock, Percent, ClipboardList,
  Mail, ShieldCheck
} from 'lucide-react';

const HrSettings = () => {
  const [isDarkMode] = useOutletContext();
  const [saving, setSaving] = useState(false);

  const theme = {
    container: isDarkMode ? "bg-[#050505]" : "bg-zinc-50",
    card: isDarkMode 
      ? "bg-[#0a0a0a] border-zinc-900 shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
      : "bg-white border-zinc-200 shadow-sm",
    input: isDarkMode
      ? "bg-[#050505] border-zinc-800 text-zinc-100 focus:border-[#b3903c]"
      : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-[#b3903c]",
    textMain: isDarkMode ? "text-zinc-100" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    accent: "#b3903c"
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500); // Simulate API call
  };

  const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-[#b3903c]/10 text-[#b3903c]">
        <Icon size={18} />
      </div>
      <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>
        {title}
      </h2>
    </div>
  );

  const InputField = ({ label, type = "text", placeholder, defaultValue }) => (
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>
        {label}
      </label>
      <input 
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-bold text-[12px] ${theme.input}`}
      />
    </div>
  );

  const ToggleSwitch = ({ label, defaultChecked }) => (
    <div className="flex items-center justify-between py-2">
      <span className={`text-[11px] font-bold ${theme.textMain}`}>{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b3903c]"></div>
      </label>
    </div>
  );

  return (
    <div className={`p-6 space-y-8 animate-in fade-in duration-700 ${theme.container} min-h-screen`}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-[#b3903c]"></span>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b3903c]">System Configuration</p>
          </div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            HR <span className="text-[#b3903c]">Settings</span>
          </h1>
        </div>
        
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-8 py-3 bg-[#b3903c] text-black font-black uppercase text-[11px] rounded-xl hover:bg-[#967932] transition-all shadow-[0_0_15px_rgba(179,144,60,0.3)]"
        >
          {saving ? <Settings className="animate-spin" size={16} /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PAYROLL CONFIGURATION */}
        <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
          <SectionHeader icon={Percent} title="Payroll Configuration" />
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Pay Period" defaultValue="Monthly (1st-End)" />
              <InputField label="Pay Day" defaultValue="Last Day of Month" />
            </div>
            <InputField label="Overtime Rate (%)" defaultValue="125% (Regular OT)" />
            <div className="space-y-2">
              <InputField label="Night Differential (%)" defaultValue="10" />
              <p className="text-[9px] font-bold text-zinc-500 italic">% additional for 10PM-6AM shifts</p>
            </div>
          </div>
        </div>

        {/* LEAVE POLICY */}
        <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
          <SectionHeader icon={Calendar} title="Leave Policy" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Annual Sick Leave (Days)" defaultValue="15" />
            <InputField label="Annual Vacation Leave (Days)" defaultValue="15" />
            <InputField label="Emergency Leave (Days)" defaultValue="3" />
            <InputField label="Maternity Leave (Days)" defaultValue="105" />
            <div className="md:col-span-2">
              <InputField label="Paternity Leave (Days)" defaultValue="7" />
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
          <SectionHeader icon={Bell} title="Notifications" />
          <div className="space-y-4">
            <ToggleSwitch label="Payroll deadline reminder (3 days before)" defaultChecked={true} />
            <ToggleSwitch label="Email payslips on pay day" defaultChecked={true} />
            <ToggleSwitch label="Alert for 2+ consecutive absences" defaultChecked={true} />
            <ToggleSwitch label="Notify manager for leave approval" defaultChecked={true} />
            <ToggleSwitch label="Monthly HR summary to manager" defaultChecked={false} />
          </div>
        </div>

        {/* HOTEL INFORMATION */}
        <div className={`p-8 rounded-[2rem] border ${theme.card}`}>
          <SectionHeader icon={Building2} title="Hotel Information" />
          <div className="space-y-6">
            <InputField label="Hotel Name" defaultValue="Obsidian Sanctuary" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Hotel Code" defaultValue="OBS-2026" />
              <InputField label="HR Manager" defaultValue="Diana Cruz" />
            </div>
            <InputField label="HR Contact Email" defaultValue="diana@obsidian.ph" type="email" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HrSettings;