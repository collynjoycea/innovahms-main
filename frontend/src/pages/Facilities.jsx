import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star } from "lucide-react";
import { Link } from "react-router-dom";

const allFacilities = [
  {
    title: "The Imperial Sanctum",
    category: "Presidential Suite",
    desc: "A masterpiece of luxury living spanning 180 sqm. Complete with a private terrace, jacuzzi, and personal butler.",
    img: "/images/signup-img.png",
    specs: { sqm: "180", guests: "4", price: "PHP 18k", rating: "4.9" }
  },
  {
    title: "Wellness Gym",
    category: "Fitness & Health",
    desc: "AI-integrated health equipment with neural-link tracking for an optimized workout experience.",
    img: "/images/hero-bg-img.png",
    specs: { sqm: "120", guests: "20", price: "Free", rating: "4.8" }
  },
  {
    title: "Dining Hall",
    category: "Culinary",
    desc: "Futuristic culinary experience featuring automated service and world-class fusion cuisine.",
    img: "/images/signup-img.png",
    specs: { sqm: "300", guests: "100", price: "Varies", rating: "5.0" }
  }
  // Maaari ka pang magdagdag ng iba rito...
];

export default function Facilities() {
  const [suiteTourRoomId, setSuiteTourRoomId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSuiteRoom = async () => {
      try {
        const response = await fetch("/api/rooms");
        const payload = await response.json().catch(() => ({}));
        const rooms = Array.isArray(payload?.rooms)
          ? payload.rooms
          : Array.isArray(payload)
            ? payload
            : [];

        const suiteRoom = rooms.find((room) => {
          const roomType = String(room.type || room.room_type || room.roomType || "").toLowerCase();
          return roomType.includes("suite");
        });

        if (isMounted) {
          setSuiteTourRoomId(suiteRoom?.id || null);
        }
      } catch {
        if (isMounted) {
          setSuiteTourRoomId(null);
        }
      }
    };

    loadSuiteRoom();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0d0c0a] dark:text-[#e5e1d8] font-sans selection:bg-[#bf9b30]/30 transition-colors duration-300">
      {/* Header */}
      <nav className="p-6 max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-[#bf9b30] hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Back to Home</span>
        </Link>
        <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
          INNOVA<span className="text-[#bf9b30]">.</span>FACILITIES
        </h1>
        <Link
          to={suiteTourRoomId ? `/virtual-tour/${suiteTourRoomId}` : "/vision-suites"}
          className="rounded-full border border-[#bf9b30]/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#8a6f2a] dark:text-[#bf9b30] hover:bg-[#bf9b30] hover:text-[#0d0c0a] transition-all"
        >
          Suites 360 Tour
        </Link>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-16">
          <p className="font-serif italic text-[#bf9b30] text-2xl mb-2">Discovery</p>
          <h2 className="text-5xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">
            World-Class <span className="text-[#bf9b30]">Amenities</span>
          </h2>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {allFacilities.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-white dark:bg-[#14130f] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden hover:border-[#bf9b30]/30 transition-all shadow-2xl"
            >
              <div className="h-64 overflow-hidden">
                <img 
                  src={item.img} 
                  alt={item.title} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                />
              </div>
              
              <div className="p-6">
                <span className="text-[9px] font-bold text-[#bf9b30] uppercase tracking-[0.2em]">
                  {item.category}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase mt-1 mb-3 group-hover:text-[#bf9b30] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-light leading-relaxed mb-6">
                  {item.desc}
                </p>

                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-200 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#bf9b30]">{item.specs.sqm}</span>
                    <span className="text-[7px] text-slate-400 dark:text-gray-600 uppercase font-black">SQM</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#bf9b30]">{item.specs.guests}</span>
                    <span className="text-[7px] text-slate-400 dark:text-gray-600 uppercase font-black">Guests</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#bf9b30]">{item.specs.price}</span>
                    <span className="text-[7px] text-slate-400 dark:text-gray-600 uppercase font-black">Price</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#bf9b30] flex items-center gap-1">
                      {item.specs.rating}
                      <Star size={12} />
                    </span>
                    <span className="text-[7px] text-slate-400 dark:text-gray-600 uppercase font-black">Score</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}

