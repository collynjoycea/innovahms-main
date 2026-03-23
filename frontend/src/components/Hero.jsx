import { Calendar, Users, Zap, ShieldCheck, Globe, Star, MapPin, Cpu, ArrowUpRight, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage() {
  const [currentImg, setCurrentImg] = useState(0);
  const [isBooted, setIsBooted] = useState(false);

  const images = ["/images/hero-bg-img.png", "/images/suite-luxury.jpg"];

  const collaboratingHotels = [
    { name: "Obsidian Sanctuary", location: "Metropolis Hub", image: "/images/obsidian-suite.jpg", spec: "Neural-Link Integrated", forecast: "Optimal" },
    { name: "Horizon Vista", location: "Skyline District", image: "/images/horizon-villa.jpg", spec: "Prophet AI Analytics", forecast: "Stable" },
    { name: "Kinetic Royal", location: "Coastal Sector", image: "/images/kinetic-villa.jpg", spec: "Biometric v.2", forecast: "Peak" },
    { name: "Radiant Plaza", location: "Central Node", image: "/images/suite-luxury.jpg", spec: "Predictive Comfort", forecast: "Optimal" }
  ];

  useEffect(() => {
    setIsBooted(true);
    const interval = setInterval(() => {
      setCurrentImg((prev) => (prev + 1) % images.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    // Base Background: Deep Warm Charcoal/Black (Hindi masakit sa mata)
    <main className="relative min-h-screen w-full bg-[#0d0c0a] font-sans selection:bg-[#bf9b30]/30 overflow-x-hidden text-[#e5e1d8]">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImg}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1.25, x: "2%", y: "-1%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 5, ease: "linear" }}
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${images[currentImg]})` }}
          >
            {/* Gradient Overlay: Deep Amber to Obsidian */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1812]/40 via-[#0d0c0a]/60 to-[#0d0c0a]" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-20 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={isBooted ? { opacity: 1, y: 0 } : {}}
            className="mb-6"
          >
            <h2 className="text-[10px] font-bold uppercase tracking-[0.8em] text-[#bf9b30]/80">
              The Evolution of Travel
            </h2>
            {/* Pinalaking System Name: Silver-Gold Gradient */}
            <h1 className="mt-4 text-7xl md:text-[10rem] font-black tracking-tighter leading-none bg-gradient-to-b from-[#f5f1da] to-[#bf9b30] bg-clip-text text-transparent drop-shadow-2xl">
              INNOVA<span className="text-[#bf9b30]">.</span>HMS
            </h1>
          </motion.div>

          <div className="max-w-2xl">
            {/* Warm & Refined Description */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={isBooted ? { opacity: 0.8 } : {}}
              transition={{ delay: 0.4 }}
              className="mt-2 text-[12px] md:text-sm leading-relaxed tracking-[0.1em] text-[#e5e1d8] font-light"
            >
              INNOVA-HMS is designed to provide guests with a smarter, faster, and more convenient hotel experience. 
              Through our intelligent management platform, explore rooms, make reservations, and manage 
              your sanctuary anywhere in the world.
            </motion.p>
          </div>

          {/* FUTURISTIC GLASS CONSOLE (Warm Obsidian) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={isBooted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6 }}
            className="mt-16 w-full max-w-4xl overflow-hidden rounded-2xl border border-[#bf9b30]/20 bg-[#1a1812]/40 p-1 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="flex flex-col md:flex-row items-center">
              <div className="flex-1 px-10 py-6 text-left border-r border-[#bf9b30]/10 hover:bg-[#bf9b30]/5 transition-colors cursor-pointer">
                <span className="block text-[8px] uppercase tracking-[0.3em] text-[#bf9b30] font-bold mb-1">Check Availability</span>
                <p className="text-xs font-bold text-white tracking-widest uppercase">Oct 12 — Oct 18</p>
              </div>
              <div className="flex-1 px-10 py-6 text-left hover:bg-[#bf9b30]/5 transition-colors cursor-pointer">
                <span className="block text-[8px] uppercase tracking-[0.3em] text-[#bf9b30] font-bold mb-1">Guest Occupancy</span>
                <p className="text-xs font-bold text-white tracking-widest uppercase">02 Adults, 01 Child</p>
              </div>
              <button className="m-2 h-14 px-12 rounded-xl bg-gradient-to-r from-[#bf9b30] to-[#8a6d1d] text-[10px] font-black uppercase tracking-[0.3em] text-[#0d0c0a] hover:scale-[1.02] active:scale-95 transition-all shadow-lg">
                Initiate Search
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- PARTNER SECTION (Warm Dark Theme) --- */}
      <section className="relative py-32 px-6 max-w-7xl mx-auto bg-[#0d0c0a]">
        <div className="flex justify-between items-end mb-16 border-b border-[#bf9b30]/10 pb-10">
          <div>
            <p className="text-[#bf9b30] text-[9px] font-bold uppercase tracking-[0.6em] mb-2">Global Network Node</p>
            <h2 className="text-4xl font-extralight text-white tracking-tight">Collaborating <span className="italic font-serif text-[#bf9b30]">Sanctuaries</span></h2>
          </div>
          <ArrowUpRight size={24} className="text-[#bf9b30] opacity-50" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collaboratingHotels.map((hotel, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -10 }}
              className="group relative bg-[#14130f] rounded-2xl border border-[#bf9b30]/5 overflow-hidden shadow-2xl transition-all duration-500"
            >
              {/* Card Image with Warm Tint */}
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={hotel.image} 
                  alt={hotel.name} 
                  className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-[#0d0c0a]/20" />
                <div className="absolute top-4 left-4 bg-[#bf9b30]/90 backdrop-blur-md px-2 py-1 rounded-md">
                  <span className="flex items-center gap-1 text-[8px] font-black text-[#0d0c0a] uppercase">
                    <TrendingUp size={10}/> {hotel.forecast}
                  </span>
                </div>
              </div>

              {/* Refined Dark Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={10} className="text-[#bf9b30]" />
                  <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-[#bf9b30]/60">{hotel.location}</span>
                </div>
                <h3 className="text-sm font-bold text-[#e5e1d8] mb-6 tracking-wide group-hover:text-[#bf9b30] transition-colors">{hotel.name}</h3>
                
                <div className="pt-4 border-t border-[#bf9b30]/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={12} className="text-[#bf9b30]/40" />
                    <span className="text-[9px] uppercase text-[#e5e1d8]/50 font-medium">{hotel.spec}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={8} fill={i < 4 ? "#bf9b30" : "none"} stroke="#bf9b30" strokeWidth={1} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOOTER: Minimalist & Clean */}
      <footer className="py-20 text-center border-t border-[#bf9b30]/5">
         <p className="text-[9px] uppercase tracking-[0.8em] text-[#bf9b30]/30 font-bold">
           Innova-HMS • Redefining the human experience
         </p>
      </footer>
    </main>
  );
}