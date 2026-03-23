import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  BrainCircuit, Users, TrendingUp, AlertTriangle, 
  Download, Calculator, Calendar, Loader2, 
  Sparkles, Save, CheckCircle2, Info
} from 'lucide-react';

const StaffingEstimator = () => {
  const [isDarkMode] = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [occupancy, setOccupancy] = useState(100);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const theme = {
    container: isDarkMode ? "bg-[#050505]" : "bg-zinc-50",
    card: isDarkMode ? "bg-[#0a0a0a] border-zinc-900" : "bg-white border-zinc-200 shadow-sm",
    textMain: isDarkMode ? "text-zinc-100" : "text-zinc-900",
    textSub: isDarkMode ? "text-zinc-500" : "text-zinc-400",
    tableHeader: isDarkMode ? "text-zinc-600" : "text-zinc-400",
    accent: "#b3903c"
  };

  const departments = [
    { id: 1, name: "Front Desk", current: 8, normal: 13, peak: 19, color: "text-purple-500", bg: "bg-purple-500" },
    { id: 2, name: "Housekeeping", current: 14, normal: 18, peak: 27, color: "text-emerald-500", bg: "bg-emerald-500" },
    { id: 3, name: "F&B", current: 10, normal: 11, peak: 15, color: "text-yellow-500", bg: "bg-yellow-500" },
    { id: 4, name: "Maintenance", current: 6, normal: 7, peak: 9, color: "text-orange-500", bg: "bg-orange-500" },
    { id: 5, name: "Security", current: 5, normal: 6, peak: 7, color: "text-blue-500", bg: "bg-blue-500" },
  ];

  if (loading) return (
    <div className={`h-screen flex items-center justify-center ${theme.container}`}>
      <Loader2 className="animate-spin text-[#b3903c]" size={40} />
    </div>
  );

  return (
    <div className={`p-6 space-y-8 animate-in fade-in duration-700 ${theme.container} min-h-screen font-sans uppercase tracking-tighter`}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-black ${theme.textMain}`}>AI Staffing <span className="text-[#b3903c] italic font-medium">Estimator</span></h1>
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1">Prophet Occupancy Forecast → Required Headcount Per Department</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-[10px] font-black text-white rounded-lg flex items-center gap-2">
            <Download size={14} /> Export Plan
          </button>
          <button className="px-4 py-2 bg-[#6d28d9] text-[10px] font-black text-white rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(109,40,217,0.4)]">
            <BrainCircuit size={14} /> Run AI Estimate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORECAST PARAMETERS */}
        <div className={`p-6 rounded-2xl border ${theme.card}`}>
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-900 pb-4">
            <Calculator size={16} className="text-[#b3903c]" />
            <h2 className={`text-xs font-black ${theme.textMain}`}>Forecast Parameters</h2>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500">Forecast Period</label>
              <select className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-[10px] font-bold text-white outline-none">
                <option>Next 14 Days</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-zinc-500">Predicted Occupancy Rate — {occupancy}%</label>
              </div>
              <input 
                type="range" min="10" max="100" value={occupancy} 
                onChange={(e) => setOccupancy(e.target.value)}
                className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#6d28d9]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500">Total Available Rooms</label>
              <input type="text" value="80" disabled className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-[10px] font-bold text-zinc-400" />
            </div>

            <div className="p-4 rounded-xl bg-[#b3903c]/5 border border-[#b3903c]/20">
              <div className="flex items-center gap-2 mb-1 text-[#b3903c]">
                <BrainCircuit size={14} />
                <span className="text-[9px] font-black">Prophet AI Baseline</span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-tight">Predicted occupancy based on historical data: <span className="text-white">78% avg</span> · Peak: <span className="text-orange-500 font-bold">94%</span></p>
            </div>

            <button className="w-full py-3 bg-[#6d28d9] text-white text-[10px] font-black rounded-xl hover:opacity-90 transition-all uppercase">
              Calculate Staffing Needs
            </button>
          </div>
        </div>

        {/* LIVE PREVIEW CARDS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black text-zinc-500 flex items-center gap-2"><Users size={14} /> Required Staff (Live Preview)</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {departments.map(dept => {
              const req = occupancy > 80 ? dept.peak : dept.normal;
              const gap = req - dept.current;
              return (
                <div key={dept.id} className={`p-4 rounded-xl border ${theme.card} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${dept.bg}`}></div>
                    <span className={`text-xs font-black ${theme.textMain}`}>{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-8 text-[10px]">
                    <div className="text-center"><p className="text-zinc-600 font-bold">Normal</p><p className="text-white font-black">{dept.normal}</p></div>
                    <div className="text-center"><p className="text-orange-500 font-bold">Peak</p><p className="text-white font-black">{dept.peak}</p></div>
                    <div className="text-center"><p className="text-zinc-600 font-bold">Current</p><p className="text-white font-black">{dept.current}</p></div>
                    <div className="text-right w-20">
                      <span className={`px-2 py-1 rounded font-black ${gap > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {gap > 0 ? `+${gap} Needed` : 'Optimal'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`p-5 rounded-2xl border ${theme.card} border-zinc-800 flex justify-between items-center`}>
            <div className="flex gap-10">
              <div><p className="text-[9px] text-zinc-600 font-black">Total Required Staff:</p><p className="text-3xl font-black text-white">66</p></div>
              <div><p className="text-[9px] text-zinc-600 font-black">Current Active Staff:</p><p className="text-3xl font-black text-white">48</p></div>
            </div>
            <div className="text-right">
              <p className="text-rose-500 text-[10px] font-black flex items-center gap-1"><AlertTriangle size={14} /> High Occupancy!</p>
              <p className="text-zinc-500 text-[9px] font-bold">18 additional staff needed. Consider hiring or OT.</p>
            </div>
          </div>
        </div>
      </div>

      {/* STAFFING PLAN TABLE */}
      <div className={`p-6 rounded-2xl border ${theme.card} space-y-6`}>
        <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
          <h2 className="text-xs font-black text-white flex items-center gap-2"><Calendar size={16} /> Staffing Plan — Next 14 Days ({occupancy}% Occupancy)</h2>
          <button className="px-4 py-2 bg-[#6d28d9] text-[10px] font-black text-white rounded-lg flex items-center gap-2">
            <Save size={14} /> Save Plan
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] font-black">
            <thead className={`text-zinc-600 border-b border-zinc-900`}>
              <tr>
                <th className="pb-4">Department</th>
                <th className="pb-4 text-center">Current Staff</th>
                <th className="pb-4 text-center">Required (Normal)</th>
                <th className="pb-4 text-center">Required (Peak)</th>
                <th className="pb-4 text-center">Gap</th>
                <th className="pb-4">Recommendation</th>
                <th className="pb-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {departments.map((dept, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-4">{dept.name}</td>
                  <td className="py-4 text-center text-zinc-500">{dept.current}</td>
                  <td className="py-4 text-center text-[#6d28d9]">{dept.normal}</td>
                  <td className="py-4 text-center text-orange-500">{dept.peak}</td>
                  <td className="py-4 text-center text-rose-500">+{dept.peak - dept.current}</td>
                  <td className="py-4">
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      Hire {dept.peak - dept.current} more or add OT
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button className="px-3 py-1.5 bg-[#6d28d9] text-white rounded text-[9px]">Apply Plan</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DAILY FORECAST GRID */}
      <div className={`p-6 rounded-2xl border ${theme.card}`}>
        <h2 className="text-xs font-black text-white flex items-center gap-2 mb-6"><Calendar size={16} /> Daily Staffing Forecast</h2>
        <div className="grid grid-cols-8 gap-1">
          <div className="text-[10px] font-black text-zinc-600 py-2 pt-10">Department</div>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <div key={i} className="text-center">
              <p className="text-orange-500 text-[10px] font-black">{day}</p>
              <p className="text-zinc-600 text-[8px] font-bold mb-2">{94 - (i * 5)}%</p>
            </div>
          ))}
          
          {departments.map(dept => (
            <React.Fragment key={dept.id}>
              <div className="py-3 text-zinc-400 text-[10px] font-bold">{dept.name.split(' ')[0]}</div>
              {[12, 11, 10, 9, 9, 8, 8].map((val, i) => (
                <div key={i} className={`p-3 text-center rounded-lg m-0.5 font-black text-[11px] ${i < 2 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {val + Math.floor(dept.id/2)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  );
};

export default StaffingEstimator;