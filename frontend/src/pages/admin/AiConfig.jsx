import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Plus, Settings, RefreshCw, Unplug, Zap, 
  Mail, MessageSquare, Bot, Map, Flame, CreditCard 
} from 'lucide-react';

const AiConfig = () => {
  const { isDarkMode } = useOutletContext();

  const bgMain = isDarkMode ? "bg-[#09090b]" : "bg-[#f4f4f5]";
  const cardBg = isDarkMode ? "bg-[#111111]" : "bg-white";
  const borderColor = isDarkMode ? "border-white/10" : "border-gray-200";
  const textColor = isDarkMode ? "text-white" : "text-gray-900";

  const integrations = [
    { name: "PayMongo", category: "Payment", status: "LIVE", icon: <CreditCard />, color: "text-blue-400", key: "pk_live_••••••••3a9f", calls: "24,812", tier: "All", available: true },
    { name: "SendGrid", category: "Email", status: "LIVE", icon: <Mail />, color: "text-blue-300", key: "SG.••••••••••••XZ", calls: "18,340", tier: "All", available: true },
    { name: "Twilio", category: "SMS", status: "LIVE", icon: <MessageSquare />, color: "text-red-500", key: "AC••••••••2b1c", calls: "8,220", tier: "Pro+", available: true },
    { name: "RASA AI", category: "AI / NLP", status: "LIVE", icon: <Bot />, color: "text-purple-400", key: "rasa://innova.local", calls: "12,640", tier: "Pro+", available: true },
    { name: "OpenStreetMap", category: "Maps", status: "LIVE", icon: <Map />, color: "text-green-400", key: "Public API (OSM)", calls: "4,100", tier: "Enterprise", available: true },
    { name: "Firebase", category: "Storage", status: "OFF", icon: <Flame />, color: "text-orange-500", key: "Not configured", calls: "0", tier: "Enterprise", available: false }
  ];

  return (
    <div className={`p-6 space-y-6 text-left min-h-screen transition-all duration-300 ${bgMain}`}>
      
      {/* HEADER SECTION - SYNCED WITH MEMPACKAGE UI */}
      <div className={`flex justify-between items-center border-b ${borderColor} pb-6`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${textColor}`}>
            AI & API <span className="text-[#c9a84c]">Configuration</span>
          </h1>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">
            Configure system integrations and neural api access levels
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 rounded bg-[#c9a84c] text-black font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#c9a84c]/20 hover:scale-105 transition-transform">
          <Plus size={16} strokeWidth={3} /> Add Integration
        </button>
      </div>

      {/* TIGHT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((api, i) => (
          <div key={i} className={`p-4 rounded-xl border transition-all duration-300 ${cardBg} ${borderColor} hover:border-[#c9a84c]/40`}>
            
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white/5 ${api.color}`}>
                  {React.cloneElement(api.icon, { size: 18 })}
                </div>
                <div>
                  <h3 className={`text-[13px] font-black leading-none ${textColor}`}>{api.name}</h3>
                  <span className="text-[9px] font-bold text-[#c9a84c] uppercase">{api.category}</span>
                </div>
              </div>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${api.status === 'LIVE' ? 'border-green-500/50 text-green-500' : 'border-gray-500/50 text-gray-500'}`}>
                {api.status}
              </span>
            </div>

            <div className={`mb-3 p-2 rounded-lg border font-mono text-[10px] truncate ${isDarkMode ? 'bg-black/40 text-gray-400' : 'bg-gray-50 text-gray-600'} ${borderColor}`}>
              {api.key}
            </div>

            <div className="flex justify-between items-center mb-4 px-1">
              <div>
                <p className={`text-base font-black ${textColor} leading-none`}>{api.calls}</p>
                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Calls Today</p>
              </div>
              <div className="text-right">
                <p className={`text-base font-black ${textColor} leading-none`}>{api.tier}</p>
                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Availability</p>
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/5 pt-3">
              {api.available ? (
                <button className="flex-1 py-1.5 rounded-lg border border-red-500/20 text-red-500 text-[9px] font-black uppercase hover:bg-red-500/10">Disconnect</button>
              ) : (
                <button className="flex-1 py-1.5 rounded-lg bg-[#c9a84c] text-black text-[9px] font-black uppercase">Connect</button>
              )}
              <button className={`p-1.5 rounded-lg border ${borderColor} ${textColor} hover:bg-[#c9a84c] hover:text-black`}><Settings size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiConfig;