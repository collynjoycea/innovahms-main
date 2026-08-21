import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  View, 
  MessageSquare, 
  Map, 
  ArrowUpRight 
} from "lucide-react";

export default function Features() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("theme");
      setIsDark(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    };
    window.addEventListener("themeChanged", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("themeChanged", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const smartFeatures = [
    { 
      title: "AI Recommendations", 
      desc: "Personalized dining, spa, and activity suggestions based on guest behavioral patterns.", 
      icon: <Sparkles className="w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97]" />,
      img: "/images/Ai-recommendations.jpg"
    },
    { 
      title: "Virtual 360 Tours", 
      desc: "Allow guests to explore suites and facilities in immersive 3D before they even check in.", 
      icon: <View className="w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97]" />,
      img: "/images/virtual-360-tours.jpg"
    },
    { 
      title: "AI Concierge", 
      desc: "24/7 automated assistance for room service, local info, and instant guest requests.", 
      icon: <MessageSquare className="w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97]" />,
      img: "/images/AI-concierge.jpg"
    },
    { 
      title: "Indoor Navigation", 
      desc: "Dynamic, interactive property maps guiding guests seamlessly through large hotels.", 
      icon: <Map className="w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97]" />,
      img: "/images/indoor-navigation.jpg"
    }
  ];

  return (
    <div className={`min-h-screen w-full ${isDark ? "dark" : ""} bg-slate-50 dark:bg-[#080d0b] text-[#14231e] dark:text-[#EEEEEE] font-sans transition-colors duration-300 selection:bg-[#2FA084]/30 overflow-x-hidden`}>
      
      {/* HERO SECTION */}
      <section className="relative min-h-[48vh] flex items-center justify-center overflow-hidden bg-[#0a120f]">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-features.jpg" 
            className="w-full h-full object-cover opacity-40 scale-105" 
            alt="Luxury Hotel Technology"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080d0b]/80 via-[#080d0b]/50 to-[#080d0b]" />
        </div>

        <div className="relative z-10 w-full max-w-5xl px-6 py-16 text-center">
         
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white leading-tight">
            Next-Gen <span className="font-semibold text-[#6FCF97]">Capabilities</span>
          </h1>
          
          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-gray-300 font-normal leading-relaxed">
            Elevating modern hospitality through quiet automation, intelligent guest routing, and tailored stay experiences.
          </p>
        </div>
      </section>

      {/* SMART GUEST EXPERIENCE SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 border-b border-gray-200 dark:border-[#182924] pb-6">
          <div>
            <span className="text-[11px] font-mono tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] uppercase block mb-1">
              Guest Experience
            </span>
            <h2 className="text-2xl sm:text-3xl font-light text-[#111C18] dark:text-white">
              Intelligent Suite Features
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
            Designed to seamlessly integrate with daily guest touchpoints without cluttering the physical room interface.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {smartFeatures.map((feature, index) => (
            <div 
              key={index} 
              className="group flex flex-col justify-between rounded-2xl bg-white dark:bg-[#121E1A] border border-gray-200 dark:border-[#243B33] overflow-hidden transition-all duration-300 hover:border-[#1F6F5F] dark:hover:border-[#2FA084] shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(47,160,132,0.15)] hover:-translate-y-1"
            >
              <div className="p-6">
                {/* Icon Container */}
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-[#182924] border border-emerald-100 dark:border-[#243B33] flex items-center justify-center mb-5 group-hover:bg-[#1F6F5F] dark:group-hover:bg-[#2FA084] transition-colors duration-300">
                  {React.cloneElement(feature.icon, {
                    className: "w-5 h-5 text-[#1F6F5F] dark:text-[#6FCF97] group-hover:text-white transition-colors duration-300"
                  })}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-medium text-[#111C18] dark:text-white group-hover:text-[#1F6F5F] dark:group-hover:text-[#6FCF97] transition-colors">
                    {feature.title}
                  </h3>
                  <ArrowUpRight size={15} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                  {feature.desc}
                </p>
              </div>

              {/* Image Footer */}
              <div className="relative h-40 overflow-hidden bg-gray-100 dark:bg-[#182924] mt-2 border-t border-gray-100 dark:border-[#1e332c]">
                <img 
                  src={feature.img} 
                  alt={feature.title} 
                  onError={(e) => { e.currentTarget.src = '/images/1.webp'; }}
                  className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
              </div>
            </div>
          ))}
        </div>

      </section>

    </div>
  );
}