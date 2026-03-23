import React, { useState, useEffect } from 'react';
import { BrainCircuit, Play, TrendingUp, AlertTriangle, Calendar, Sparkles, Calculator, RefreshCw, CheckCircle2, Zap } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';
import { useOutletContext } from 'react-router-dom';

const InventorySimulation = () => {
  const { isDarkMode } = useOutletContext();
  const { qs } = useStaffSession();
  const [occupancy, setOccupancy] = useState(78);
  const [duration, setDuration] = useState(7);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedData, setSimulatedData] = useState([]);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [dbItems, setDbItems] = useState([]);

  // Fetch real items from DB
  useEffect(() => {
    fetch(`/api/inventory/items${qs}`)
      .then(r => r.json())
      .then(d => { if (d.items) setDbItems(d.items.slice(0, 8)); })
      .catch(() => {});
  }, [qs]);

  const initialItems = dbItems.length > 0
    ? dbItems.map(i => ({ name: i.name, category: i.category, baseDaily: Math.max(1, Math.round(i.stockLevel / 30)), current: i.stockLevel, cost: i.unitCost || 100 }))
    : [
        { name: 'Bath Towels',    category: 'Linens',     baseDaily: 4, current: 12,  cost: 450 },
        { name: 'Bed Sheets',     category: 'Linens',     baseDaily: 2, current: 48,  cost: 850 },
        { name: 'Shampoo 100ml',  category: 'Toiletries', baseDaily: 5, current: 42,  cost: 45  },
        { name: 'Conditioner',    category: 'Toiletries', baseDaily: 4, current: 38,  cost: 45  },
        { name: 'Coffee Pods',    category: 'F&B',        baseDaily: 8, current: 180, cost: 25  },
      ];

  // --- CORE LOGIC: Simulation Function ---
  const runSimulation = (targetOccupancy = occupancy) => {
    setIsSimulating(true);
    
    // Realistic "AI Processing" Delay
    setTimeout(() => {
      const results = initialItems.map(item => {
        const predictedNeed = Math.ceil((item.baseDaily * duration) * (targetOccupancy / 50));
        const remains = item.current - predictedNeed;
        const depletesIn = Math.floor(item.current / (predictedNeed / duration));

        return {
          ...item,
          totalNeed: predictedNeed,
          status: remains <= 0 ? `Depletes in ${Math.max(0, depletesIn)}d` : `${remains} left`,
          isCritical: remains <= 0,
          percentage: Math.min(100, (item.current / predictedNeed) * 100)
        };
      });

      setSimulatedData(results);
      setIsSimulating(false);
    }, 800);
  };

  // --- AUTO-SIMULATION TIMER ---
  useEffect(() => {
    let interval;
    if (isAutoMode) {
      interval = setInterval(() => {
        // Randomly adjust occupancy by +/- 5% to simulate live data flow
        setOccupancy(prev => {
          const change = Math.floor(Math.random() * 11) - 5;
          const next = Math.min(100, Math.max(10, prev + change));
          runSimulation(next); // Run simulation with new value
          return next;
        });
      }, 5000); // Tumatakbo tuwing 5 seconds
    }
    return () => clearInterval(interval);
  }, [isAutoMode, duration]);

  // Initial Run
  useEffect(() => { runSimulation(); }, []);

  const totalCost = simulatedData
    .filter(item => item.isCritical)
    .reduce((acc, item) => acc + (item.totalNeed * item.cost), 0);

  return (
    <div className="p-8 space-y-8 text-left bg-black min-h-screen font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#b3903c]/10 text-[#b3903c] border border-[#b3903c]/20">
              <Sparkles size={14} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#b3903c]">Prophet Engine V.2</span>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
            Live <span className="text-[#b3903c]">AI Simulation</span>
          </h1>
        </div>

        {/* Live Status Indicator */}
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${isAutoMode ? 'bg-[#b3903c]/10 border-[#b3903c]/30' : 'bg-zinc-900 border-white/5'}`}>
          <div className={`w-2 h-2 rounded-full ${isAutoMode ? 'bg-[#b3903c] animate-pulse' : 'bg-zinc-600'}`}></div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isAutoMode ? 'text-[#b3903c]' : 'text-zinc-500'}`}>
            {isAutoMode ? 'Auto-Simulation Active' : 'Manual Mode'}
          </span>
          <button 
            onClick={() => setIsAutoMode(!isAutoMode)}
            className="ml-4 p-1 hover:bg-white/5 rounded-md transition-all"
          >
            <Zap size={14} className={isAutoMode ? 'text-[#b3903c] fill-[#b3903c]' : 'text-zinc-600'} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: CONFIG (Now with Auto-Feedback) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0c0c0e] border border-[#b3903c]/20 p-8 rounded-[2.5rem] space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrainCircuit className="text-[#b3903c]" size={20} />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Scenario</h3>
              </div>
              {isSimulating && <RefreshCw size={14} className="text-[#b3903c] animate-spin" />}
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Occupancy</label>
                  <span className="text-[#b3903c] font-black text-xs">{occupancy}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" max="100"
                  value={occupancy}
                  onChange={(e) => {
                    setOccupancy(e.target.value);
                    setIsAutoMode(false); // Stop auto if user interacts
                    runSimulation(e.target.value);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#b3903c]" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Simulation Duration</label>
                <select 
                  value={duration}
                  onChange={(e) => {
                    setDuration(Number(e.target.value));
                    runSimulation();
                  }}
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-[11px] font-bold text-white outline-none focus:border-[#b3903c]/50"
                >
                  <option value={7}>7 Days (Short Term)</option>
                  <option value={14}>14 Days (Bi-Weekly)</option>
                  <option value={30}>30 Days (Monthly)</option>
                </select>
              </div>

              <button 
                onClick={() => { setIsAutoMode(true); runSimulation(); }}
                className="w-full bg-[#b3903c] text-black py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-[#d4ac4d] transition-all shadow-xl shadow-[#b3903c]/10"
              >
                Reset & Auto-Run
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: LIVE RESULTS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0c0c0e] border border-white/5 p-8 rounded-[2.5rem]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                <Calendar className="text-[#b3903c]" size={18} /> Predicted Demand
              </h3>
              <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                Refreshing every 5s...
              </div>
            </div>

            <div className="space-y-4">
              {simulatedData.map((item, i) => (
                <div key={i} className="group p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-[#b3903c]/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-[150px]">
                      <span className="text-xs font-black text-white uppercase">{item.name}</span>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Est: {item.totalNeed} units</p>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.isCritical ? 'bg-red-500' : 'bg-[#b3903c]'} rounded-full transition-all duration-1000`} 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="min-w-[130px] text-right">
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${item.isCritical ? 'text-red-500' : 'text-emerald-500'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI FOOTER */}
            <div className="mt-8 p-6 rounded-[2rem] bg-[#b3903c]/5 border border-[#b3903c]/20 flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-3">
                  <Calculator className="text-[#b3903c]" size={16} />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest italic">
                    Forecasted Budget: ₱{totalCost.toLocaleString()}
                  </span>
               </div>
               <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#b3903c]" />
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Simulation Stable</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventorySimulation;