import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { CreditCard, DollarSign } from 'lucide-react';

const LeaveRequests = ({ title }) => {
  const [isDarkMode] = useOutletContext();

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{title}</h1>
      
      <div className={`p-8 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-gradient-to-br from-[#09090b] to-black border-white/5 shadow-xl shadow-[#b3903c]/5' : 'bg-white border-zinc-200'}`}>
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-xl bg-[#b3903c]/20 flex items-center justify-center text-[#b3903c]">
              <DollarSign />
           </div>
           <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Next Pay Run</p>
              <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>March 31, 2026</h2>
           </div>
        </div>
        <button className="bg-[#b3903c] text-black px-8 py-3 rounded-xl font-black text-xs uppercase hover:scale-105 transition-all shadow-lg shadow-[#b3903c]/20">
           Process All export default LeaveRequests
        </button>
      </div>
    </div>
  );
};

export default LeaveRequests;