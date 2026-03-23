import React from 'react';
import { 
  Sparkles, 
  View, 
  MessageSquare, 
  Map, 
  LayoutDashboard, 
  Waves, 
  ArrowRight,
  Download 
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
      desc: "Dynamic, interactive property maps guiding guests seamlessly through large resorts.", 
      icon: <Map className="w-8 h-8 text-[#bf9b30]" />,
      img: "https://images.unsplash.com/photo-1569336415962-a4bd4f79c3f2?q=80&w=400"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans relative overflow-x-hidden">
      
      {/* SECTION 1: HERO */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-stone-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-features.jpg" 
            className="w-full h-full object-cover opacity-90" 
            alt="Luxury Resort"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl">
          <span className="bg-[#bf9b30] text-white text-[10px] font-black px-5 py-2 rounded-full tracking-[0.3em] uppercase mb-8 inline-block shadow-xl">
            Enterprise Edition
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white uppercase leading-[1.1] drop-shadow-2xl">
            Next-Gen <br /> 
            <span className="text-[#bf9b30]">Capabilities</span>
          </h1>
          <p className="text-white text-xl md:text-2xl max-w-2xl mx-auto font-medium drop-shadow-lg opacity-90">
            Elevating hospitality through intelligent automation and sophisticated guest experiences.
          </p>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
            <div className="w-1 h-12 bg-gradient-to-b from-[#bf9b30] to-transparent rounded-full mx-auto" />
          </div>
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

      {/* SECTION 3: Core Operational Excellence */}
      <section className="py-24 bg-slate-50/50 relative">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div>
              <p className="text-[#bf9b30] font-black text-xs uppercase tracking-widest mb-2">Operations</p>
              <h2 className="text-4xl font-black tracking-tight uppercase">Core Operational Excellence</h2>
            </div>
            <button className="flex items-center gap-2 text-[#bf9b30] font-black text-sm uppercase tracking-widest hover:underline group">
              Download Full Specs <Download className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Unified Dashboard with Live Effects */}
            <div className="lg:col-span-8 bg-slate-900 rounded-[32px] p-10 text-white relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="text-3xl font-black uppercase tracking-tight">Role-Based Unified <br /> Dashboards</h3>
                    <LayoutDashboard className="w-10 h-10 text-[#bf9b30]" />
                  </div>
                  <p className="text-slate-400 font-bold mb-12 max-w-md text-lg">Real-time data visualization tailored for General Managers, Front Desk, and Finance teams.</p>
                  
                  {/* REAL-TIME DASHBOARD SLOTS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto md:h-48">
                    {/* Live Occupancy Tracker */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-5 flex flex-col justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Live Occupancy</span>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-[#bf9b30]">84%</span>
                        <div className="flex gap-1 mb-1 items-end">
                           <div className="w-1 h-3 bg-[#bf9b30]/40 animate-pulse" />
                           <div className="w-1 h-5 bg-[#bf9b30] animate-pulse delay-75" />
                           <div className="w-1 h-4 bg-[#bf9b30]/60 animate-pulse delay-150" />
                        </div>
                      </div>
                    </div>
                    {/* Active Guest Requests */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-5 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Guest Tasks</span>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                      </div>
                      <div className="space-y-2">
                         <div className="flex justify-between text-[10px] font-black">
                           <span className="text-slate-400">Response Rate</span>
                           <span className="text-green-400">98.2%</span>
                         </div>
                         <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-[98%] bg-green-500 shadow-[0_0_8px_#22c55e]" />
                         </div>
                      </div>
                    </div>
                    {/* Sync Status */}
                    <div className="bg-white/10 rounded-xl border border-white/20 flex flex-col items-center justify-center text-center p-5">
                      <div className="w-10 h-10 rounded-full border-2 border-[#bf9b30] border-t-transparent animate-spin mb-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#bf9b30]">Global Syncing</span>
                    </div>
                  </div>
               </div>
            </div>

            {/* Housekeeping with Live Load Balance */}
            <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-100 p-10 flex flex-col justify-between overflow-hidden">
              <div>
                <Waves className="w-10 h-10 text-[#bf9b30] mb-8" />
                <h3 className="text-2xl font-black mb-4">Housekeeping Load <br /> Balancer</h3>
                <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">AI-optimized scheduling based on room priority.</p>
                
                {/* Live Floor Status */}
                <div className="space-y-4">
                  {[
                    { floor: "12th Floor", status: "w-[92%]", time: "2m ago" },
                    { floor: "Pool Suites", status: "w-[45%]", time: "Now" }
                  ].map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">{item.floor}</span>
                        <span className="text-[9px] font-bold text-[#bf9b30]">{item.time}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.status} bg-[#bf9b30] transition-all duration-1000 ease-in-out`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Engine Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: CTA */}
      <section className="max-w-7xl mx-auto px-8 py-24">
        <div className="bg-[#bf9b30] rounded-[40px] p-16 text-center text-white shadow-2xl relative overflow-hidden">
          <h3 className="text-4xl font-black mb-8 uppercase tracking-tighter">Ready to modernize your property?</h3>
          <button className="bg-slate-950 text-white px-12 py-5 rounded-2xl font-black transition-all hover:scale-105 shadow-xl uppercase tracking-widest text-sm inline-flex items-center gap-3">
            Schedule a Demo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}