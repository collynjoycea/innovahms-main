import React from 'react';
import { Sparkles, MapPin, Headset, Globe } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans relative overflow-x-hidden">
      
      {/* SECTION 1: HERO */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-stone-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-lobby.jpg" 
            className="w-full h-full object-cover opacity-90" 
            alt="Luxury Interior"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white leading-[1.1] drop-shadow-2xl">
            Revolutionizing <br /> 
            Hospitality <span className="text-[#bf9b30]">through AI</span>
          </h1>
          <p className="text-white text-lg md:text-2xl max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-lg opacity-95">
            Empowering high-end hospitality management with intelligent automation and seamless guest experiences.
          </p>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
            <div className="w-1 h-12 bg-gradient-to-b from-[#bf9b30] to-transparent rounded-full mx-auto" />
          </div>
        </div>
      </section>

      {/* SECTION 2: OUR STORY */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <span className="bg-[#bf9b30]/10 text-[#bf9b30] text-[11px] font-black px-4 py-1.5 rounded-full tracking-[0.2em] uppercase inline-block mb-6">
                  Our Story
                </span>
                <h2 className="text-5xl font-bold text-slate-900 tracking-tight leading-none mb-8">
                  Defining the Future of <br /> Luxury Service
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed font-medium">
                  Founded at the intersection of luxury hospitality and cutting-edge technology, Innova-HMS was born from a vision to simplify complex operations while elevating the human touch.
                </p>
                <div className="grid grid-cols-2 gap-8 mt-10">
                  <div>
                    <p className="text-4xl font-bold text-[#bf9b30]">500+</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hotels Worldwide</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-[#bf9b30]">15M+</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Guest Stays</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100">
                <img 
                  src="/images/about-story-staff.jpg" 
                  className="w-full h-[500px] object-cover" 
                  alt="Service Excellence"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-[#bf9b30] p-6 rounded-2xl shadow-2xl z-20">
                <Sparkles className="w-10 h-10 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: GLOBAL FOOTPRINT - Live Real-Time Map Feel */}
      <section className="py-24 bg-[#0a0503] text-white relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">Global Network Live</span>
                </div>
                <h2 className="text-5xl font-bold tracking-tight leading-tight">
                  Our Global Footprint
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Serving elite hotels and resorts across 45 countries, ensuring standard-setting excellence regardless of location.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-5 group cursor-default">
                  <div className="bg-[#bf9b30]/20 p-3 rounded-full group-hover:bg-[#bf9b30] transition-all duration-300">
                    <Globe className="w-6 h-6 text-[#bf9b30] group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-gray-200 font-semibold text-lg">Strategic Regional Hubs</p>
                    <p className="text-gray-500 text-sm">London • Singapore • New York • Dubai</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 group cursor-default">
                  <div className="bg-[#bf9b30]/20 p-3 rounded-full group-hover:bg-[#bf9b30] transition-all duration-300">
                    <Headset className="w-6 h-6 text-[#bf9b30] group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-gray-200 font-semibold text-lg">24/7 Enterprise Support</p>
                    <p className="text-gray-500 text-sm">Real-time monitoring & instant resolution</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 relative">
              <div className="bg-white/5 rounded-[40px] p-4 border border-white/10 overflow-hidden shadow-2xl relative h-[300px] md:h-[520px]">
                {/* World Map with Pulse Nodes */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="/images/global-network-map.jpg" 
                    className="w-full h-full object-cover rounded-[32px] opacity-40 mix-blend-screen" 
                    alt="World Map"
                  />
                  
                  {/* PULSING NODES (London, Singapore, NY, Dubai) */}
                  <div className="absolute top-[35%] left-[48%]"><PulseNode /></div> {/* London */}
                  <div className="absolute top-[38%] left-[25%]"><PulseNode /></div> {/* New York */}
                  <div className="absolute top-[65%] left-[78%]"><PulseNode /></div> {/* Singapore */}
                  <div className="absolute top-[48%] left-[58%]"><PulseNode /></div> {/* Dubai */}
                </div>

                <div className="relative z-10 h-full flex items-center justify-center pointer-events-none">
                   <h4 className="text-[#bf9b30] font-black text-2xl md:text-5xl tracking-[0.4em] uppercase opacity-80 drop-shadow-2xl text-center px-4">
                     Enterprise <br className="md:hidden" /> Network
                   </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <div className="bg-slate-50 p-16 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            {/* Subtle background glow on hover */}
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-[#bf9b30]/5 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <h3 className="text-4xl font-black text-slate-900 mb-8 uppercase tracking-tight">Partner with Innova-HMS</h3>
            <button className="bg-[#bf9b30] text-white px-12 py-5 rounded-2xl font-black hover:bg-[#a68628] transition-all transform hover:scale-105 shadow-xl uppercase tracking-widest text-xs">
              Contact Sales
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Simple Helper Component para sa Pulsing Map Nodes
function PulseNode() {
  return (
    <span className="relative flex h-4 w-4">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#bf9b30] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-4 w-4 bg-[#bf9b30] shadow-[0_0_10px_#bf9b30]"></span>
    </span>
  );
}