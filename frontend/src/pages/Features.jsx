import React from 'react';
import { 
  Sparkles, 
  View, 
  MessageSquare, 
  Map, 
} from 'lucide-react';

export default function Features() {
  const smartFeatures = [
    { 
      title: "AI Recommendations", 
      desc: "Personalized dining, spa, and activity suggestions based on guest behavioral patterns.", 
      icon: <Sparkles className="w-8 h-8 text-[#bf9b30]" />,
      img: "/images/Ai-recommendations.jpg"
    },
    { 
      title: "Virtual 360 Tours", 
      desc: "Allow guests to explore suites and facilities in immersive 3D before they even check in.", 
      icon: <View className="w-8 h-8 text-[#bf9b30]" />,
      img: "/images/virtual-360-tours.jpg"
    },
    { 
      title: "AI Concierge", 
      desc: "24/7 automated assistance for room service, local info, and instant guest requests.", 
      icon: <MessageSquare className="w-8 h-8 text-[#bf9b30]" />,
      img: "/images/AI-concierge.jpg"
    },
    { 
      title: "Indoor Navigation", 
      desc: "Dynamic, interactive property maps guiding guests seamlessly through large hotels.", 
      icon: <Map className="w-8 h-8 text-[#bf9b30]" />,
      img: "/images/AI-concierge.jpg"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans relative overflow-x-hidden">
      
      {/* SECTION 1: HERO */}
      <section className="relative min-h-[54vh] flex items-center justify-center overflow-hidden bg-stone-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-features.jpg" 
            className="w-full h-full object-cover opacity-90" 
            alt="Luxury Resort"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />
        </div>

        <div className="relative z-10 w-full max-w-5xl px-6 py-12 text-center">
          <span className="inline-block rounded-full bg-[#bf9b30] px-5 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-xl">
            Enterprise Edition
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight mb-5 text-white uppercase leading-[1.05] drop-shadow-2xl">
            Next-Gen <br /> 
            <span className="text-[#bf9b30]">Capabilities</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-xl font-medium text-white/90 drop-shadow-lg">
            Elevating hospitality through intelligent automation and sophisticated guest experiences.
          </p>
        </div>
      </section>

      {/* SECTION 2: Smart Guest Experience */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="flex flex-col mb-16">
          <p className="text-[#bf9b30] font-black text-xs uppercase tracking-widest mb-2">Experience</p>
          <div className="flex items-center gap-4">
            <div className="h-10 w-1.5 bg-[#bf9b30] rounded-full" />
            <h2 className="text-4xl font-black tracking-tight uppercase">Smart Guest Experience</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {smartFeatures.map((feature, index) => (
            <div key={index} className="bg-white/70 backdrop-blur-md rounded-3xl border border-slate-100 p-2 hover:shadow-2xl transition-all duration-500 group">
              <div className="p-6">
                <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#bf9b30]/10 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black mb-3">{feature.title}</h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">{feature.desc}</p>
              </div>
              <div className="relative h-48 rounded-2xl overflow-hidden mx-2 mb-2">
                <img src={feature.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={feature.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
