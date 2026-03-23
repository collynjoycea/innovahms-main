import React, { useState } from 'react';
import { Settings, Users, Home, Box, Bell, Save, Moon, Sun } from 'lucide-react';

const HKSettings = ({ isDark, setIsDark }) => {
  const [activeTab, setActiveTab] = useState('general');

  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        activeTab === id 
        ? 'bg-gradient-to-r from-[#C5A059] to-[#A37E36] text-white shadow-lg shadow-gold-500/20' 
        : 'text-gray-500 dark:text-gray-400 hover:bg-[#C5A059]/10 hover:text-[#C5A059]'
      }`}
    >
      <Icon size={18} />
      <span className="font-semibold tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className={`${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-white p-6 md:p-10 transition-colors duration-500 font-sans">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-12 border-b border-gray-200 dark:border-white/10 pb-8">
          <div className="flex items-center gap-4 text-left">
            <div className="p-3 bg-[#C5A059] rounded-2xl shadow-inner">
               <Settings className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                HK <span className="text-[#C5A059]">Protocols</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium tracking-widest uppercase mt-1">
                System Configuration & Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
             >
                {isDark ? <Sun size={20} className="text-[#C5A059]" /> : <Moon size={20} className="text-gray-600" />}
             </button>
             
             <button className="flex items-center space-x-2 bg-[#C5A059] hover:bg-[#A37E36] text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-[#C5A059]/20 transition-transform active:scale-95">
                <Save size={18} />
                <span>Publish Changes</span>
             </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <div className="w-full lg:w-72 space-y-3 bg-white dark:bg-[#141414] p-5 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-xl h-fit">
            <SidebarItem id="general" icon={Settings} label="General Rules" />
            <SidebarItem id="staff" icon={Users} label="Staff Directory" />
            <SidebarItem id="rooms" icon={Home} label="Unit Templates" />
            <SidebarItem id="inventory" icon={Box} label="Stock Control" />
            <SidebarItem id="alerts" icon={Bell} label="Auto-Alerts" />
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white dark:bg-[#141414] p-10 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-2xl relative overflow-hidden transition-all text-left">
            <div className="hidden dark:block absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/10 blur-[120px] rounded-full -mr-32 -mt-32"></div>

            {activeTab === 'general' && (
              <div className="relative z-10 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                <section>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="w-2 h-8 bg-[#C5A059] rounded-full"></span>
                    Operational Standards
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 dark:text-gray-500">Average Clean Time (Min)</label>
                      <input type="number" defaultValue="42" className="w-full bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:ring-2 focus:ring-[#C5A059] outline-none transition-all dark:text-white" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 dark:text-gray-500">Dispatch Logic</label>
                      <select className="w-full bg-gray-50 dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 p-4 rounded-2xl focus:ring-2 focus:ring-[#C5A059] outline-none dark:text-white">
                        <option>Performance Based</option>
                        <option>Sequential Order</option>
                      </select>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HKSettings;