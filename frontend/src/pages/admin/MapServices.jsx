import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Globe, Navigation, Layers } from 'lucide-react';

const MapServices = () => {
  const { isDarkMode } = useOutletContext();

  // Fine-tuned Theme Logic
  const theme = {
    // Slightly off-white para lalong lumitaw ang white cards
    bg: isDarkMode ? "bg-[#0c0c0e]" : "bg-[#f0f0f3]", 
    card: isDarkMode ? "bg-[#111111]/80" : "bg-white",
    textMain: isDarkMode ? "text-white" : "text-gray-900",
    textSub: isDarkMode ? "text-gray-500" : "text-gray-400",
    // Light mode: ginawa nating border-gray-300 para mas visible ang manipis na linya
    border: isDarkMode ? "border-white/10" : "border-gray-300",
    // Enhanced shadow para sa separation
    shadow: isDarkMode ? "shadow-2xl shadow-black/40" : "shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
  };

  return (
    <div className={`p-6 space-y-6 min-h-screen transition-colors duration-500 ${theme.bg}`}>
      
      {/* HEADER SECTION */}
      <div className={`flex justify-between items-end border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Map <span className="text-[#c9a84c]">Services</span>
          </h1>
          <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest mt-1`}>
            Geospatial tracking and hotel distribution
          </p>
        </div>
      </div>

      {/* MAP CONTAINER */}
      <div className={`w-full h-[600px] rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow} overflow-hidden relative transition-all duration-300`}>
        
        {/* Map Background Placeholder */}
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#e5e7eb]'} flex items-center justify-center`}>
          <div className="text-center space-y-4">
            <div className="relative">
              <Globe className="mx-auto text-[#c9a84c] animate-spin-slow" size={56} />
              <div className="absolute inset-0 blur-3xl bg-[#c9a84c]/20 animate-pulse" />
            </div>
            <p className={`text-[10px] font-black uppercase ${theme.textSub} tracking-[0.4em]`}>
              Initializing OSM Engine...
            </p>
          </div>
        </div>
        
        {/* Map UI Overlay */}
        <div className="absolute top-6 right-6 space-y-3">
          {[
            { icon: <Navigation size={20} />, label: "Locate" },
            { icon: <Layers size={20} />, label: "Layers" }
          ].map((btn, i) => (
            <button 
              key={i}
              className="p-3 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl text-[#c9a84c] hover:scale-110 active:scale-95 transition-all shadow-2xl group flex items-center justify-center"
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-6 left-6 p-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
            <span className="text-[10px] font-black uppercase text-white tracking-widest">OSM Node: Active</span>
          </div>
        </div>

        {/* Subtle Inner Glow para sa Light Mode */}
        {!isDarkMode && (
          <div className="absolute inset-0 pointer-events-none border border-black/[0.03] rounded-2xl" />
        )}
      </div>
    </div>
  );
};

export default MapServices;