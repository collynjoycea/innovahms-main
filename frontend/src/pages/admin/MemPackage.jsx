import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ShieldCheck, Plus, CheckCircle2, Trash2, Edit2, 
  Zap, Crown, Sprout, FileText, RefreshCw 
} from 'lucide-react';

const MemPackage = () => {
  const { isDarkMode } = useOutletContext();

  // Dynamic Theme Colors
  const bgMain = isDarkMode ? "bg-[#09090b]" : "bg-[#f4f4f5]";
  const cardBg = isDarkMode ? "bg-[#111111]" : "bg-white";
  const borderColor = isDarkMode ? "border-white/5" : "border-gray-200";
  const textColor = isDarkMode ? "text-white" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-500" : "text-gray-400";

  const packages = [
    { 
      name: "Starter", price: "₱8,000", color: "text-green-400", icon: <Sprout />,
      features: ["Up to 30 rooms", "PayMongo gateway", "Basic email support", "Guest portal access"] 
    },
    { 
      name: "Pro", price: "₱25,000", color: "text-[#c9a84c]", icon: <Zap />, popular: true,
      features: ["Up to 100 rooms", "AI Concierge (RASA)", "Twilio SMS alerts", "Advanced analytics"] 
    },
    { 
      name: "Enterprise", price: "₱50,000", color: "text-purple-400", icon: <Crown />,
      features: ["Unlimited rooms", "Dedicated instance", "White-label option", "Full API access"] 
    },
  ];

  const subscriptions = [
    { hotel: "Obsidian Sanctuary", plan: "Enterprise", cycle: "Monthly", amount: "₱50,000", renewal: "Apr 15, 2026", status: "ACTIVE" },
    { hotel: "Horizon Vista Hotel", plan: "Pro", cycle: "Monthly", amount: "₱25,000", renewal: "Apr 3, 2026", status: "ACTIVE" },
    { hotel: "Kinetic Royal Resort", plan: "Enterprise", cycle: "Annual", amount: "₱540,000", renewal: "Jun 1, 2026", status: "ACTIVE" },
    { hotel: "Radiant Plaza", plan: "Starter", cycle: "Monthly", amount: "₱8,000", renewal: "Apr 28, 2026", status: "PENDING" },
  ];

  return (
    <div className={`p-6 space-y-8 text-left min-h-screen transition-colors duration-300 ${bgMain}`}>
      
      {/* HEADER SECTION */}
      <div className={`flex justify-between items-center border-b ${borderColor} pb-6`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${textColor}`}>
            Membership <span className="text-[#c9a84c]">Packages</span>
          </h1>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Configure subscription tiers and api access levels</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 rounded bg-[#c9a84c] text-black font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#c9a84c]/20 hover:scale-105 transition-transform">
          <Plus size={16} strokeWidth={3} /> New Package
        </button>
      </div>

      {/* TIER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg, i) => (
          <div key={i} className={`relative p-8 rounded-2xl border transition-all duration-300 ${cardBg} ${borderColor} ${pkg.popular ? 'ring-1 ring-[#c9a84c]/50' : ''}`}>
            {pkg.popular && (
              <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-[#c9a84c] text-black text-[8px] font-black uppercase tracking-widest">Most Popular</span>
            )}
            <div className={`mb-6 p-3 rounded-xl bg-white/5 inline-block ${pkg.color}`}>{React.cloneElement(pkg.icon, { size: 28 })}</div>
            <h3 className={`text-xl font-black ${textColor}`}>{pkg.name}</h3>
            <div className="flex items-baseline gap-1 mt-1 mb-6">
              <span className={`text-3xl font-black ${textColor}`}>{pkg.price}</span>
              <span className="text-[10px] font-bold text-gray-500">/ MONTH</span>
            </div>
            <ul className={`space-y-4 mb-8 border-t ${borderColor} pt-6`}>
              {pkg.features.map((f, idx) => (
                <li key={idx} className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                  <CheckCircle2 size={14} className="text-[#c9a84c]" /> {f}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button className={`flex-1 py-3 rounded-xl border ${borderColor} text-[9px] font-black uppercase ${textColor} hover:bg-[#c9a84c] hover:text-black transition-all`}>Edit Plan</button>
              <button className={`px-4 py-3 rounded-xl border ${borderColor} text-red-500 hover:bg-red-500/10 transition-colors`}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SUBSCRIPTIONS TABLE SECTION */}
      <div className={`rounded-2xl border ${cardBg} ${borderColor} overflow-hidden shadow-sm`}>
        <div className={`p-6 border-b ${borderColor} flex justify-between items-center`}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#c9a84c]" size={20} />
            <h2 className={`text-sm font-black uppercase tracking-widest ${textColor}`}>Hotel Subscriptions</h2>
          </div>
          <select className={`bg-transparent border ${borderColor} text-[10px] font-black uppercase px-3 py-1.5 rounded-lg ${textColor}`}>
            <option>All Plans</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`border-b ${borderColor} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">Hotel</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">Billing Cycle</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">Next Renewal</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subscriptions.map((sub, idx) => (
                <tr key={idx} className={`hover:${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} transition-colors`}>
                  <td className={`px-6 py-4 text-[11px] font-black ${textColor}`}>{sub.hotel}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-[8px] font-black uppercase ${
                      sub.plan === 'Enterprise' ? 'bg-purple-500/20 text-purple-400' : 
                      sub.plan === 'Pro' ? 'bg-[#c9a84c]/20 text-[#c9a84c]' : 'bg-blue-500/20 text-blue-400'
                    }`}>{sub.plan}</span>
                  </td>
                  <td className={`px-6 py-4 text-[10px] font-bold ${subText}`}>{sub.cycle}</td>
                  <td className={`px-6 py-4 text-[11px] font-black ${textColor}`}>{sub.amount}</td>
                  <td className={`px-6 py-4 text-[10px] font-bold ${subText}`}>{sub.renewal}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${
                      sub.status === 'ACTIVE' ? 'border-green-500/50 text-green-500' : 'border-yellow-500/50 text-yellow-500'
                    }`}>{sub.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button className={`p-2 rounded-lg border ${borderColor} ${textColor} hover:bg-[#c9a84c] hover:text-black`}><FileText size={14} /></button>
                      <button className={`p-2 rounded-lg border ${borderColor} ${textColor} hover:bg-[#c9a84c] hover:text-black`}><RefreshCw size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MemPackage;