import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Headset, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import NeighborhoodMap from '../components/NeighborhoodMap';

const ABOUT_LOCATION = {
  id: 'innovahms-hq',
  name: 'Innova HMS Headquarters',
  address: 'Congressional Road Extension, Caloocan, Philippines',
  lat: 14.753889,
  lng: 121.031389,
};

const fallbackData = {
  content: {
    heroEyebrow: 'About Innova HMS',
    heroTitle: 'Revolutionizing Hospitality through AI',
    heroHighlight: 'through AI',
    heroSubtitle:
      'Empowering high-end hospitality management with intelligent automation and seamless guest experiences.',
    storyEyebrow: 'Our Story',
    storyTitle: 'Defining the Future of Luxury Service',
    storyBody:
      'Founded at the intersection of luxury hospitality and cutting-edge technology, Innova HMS was built to simplify complex operations while elevating the human touch across every stay.',
    networkEyebrow: 'Global Network Live',
    networkTitle: 'Our Connected Footprint',
    networkBody:
      'Built for hospitality operations that need one connected platform across multiple properties and guest touchpoints.',
    ctaTitle: 'Partner with Innova HMS',
    ctaBody:
      'Bring your hotel operations, staff coordination, and guest experience workflows into one connected platform.',
    ctaButtonLabel: 'Get Started Today',
    heroImageUrl: '/images/hero-lobby.jpg',
    storyImageUrl: '/images/about-story-staff.jpg',
  },
  stats: [
    { label: 'Hotels Connected', value: 0 },
    { label: 'Guest Bookings', value: 0 },
  ],
};

const compact = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}M+`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K+`;
  return amount.toLocaleString();
};

export default function AboutUs() {
  const [data, setData] = useState(fallbackData);

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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/about');
        const payload = await res.json().catch(() => ({}));

        if (res.ok) {
          setData({
            content: { ...fallbackData.content, ...(payload.content || {}) },
            stats:
              Array.isArray(payload.stats) && payload.stats.length
                ? payload.stats
                : fallbackData.stats,
          });
        }
      } catch {
        setData(fallbackData);
      }
    };

    load();
  }, []);

  const content = data.content;

  const stats = useMemo(() => {
    const s = data.stats || [];
    return [
      s.find((x) => x.label === 'Hotels Connected') || fallbackData.stats[0],
      s.find((x) => x.label === 'Guest Bookings') || fallbackData.stats[1],
    ];
  }, [data.stats]);

  const heroTitle = useMemo(() => {
    const title = content.heroTitle;
    const highlight = content.heroHighlight;
    if (!title.includes(highlight)) return { before: title, highlight: '', after: '' };
    const [before, ...rest] = title.split(highlight);
    return { before, highlight, after: rest.join(highlight) };
  }, [content]);

  return (
    <div className={`min-h-screen w-full ${isDark ? "dark" : ""} bg-slate-50 dark:bg-[#080d0b] text-[#14231e] dark:text-[#EEEEEE] font-sans transition-colors duration-300 selection:bg-[#2FA084]/30 overflow-x-hidden`}>

      {/* HERO SECTION */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-[#0a120f]">
        <div className="absolute inset-0 z-0">
          <img 
            src={content.heroImageUrl} 
            className="w-full h-full object-cover opacity-60 scale-105" 
            alt="Innova HMS Lobby"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {/* Emerald Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#080d0b]/70 via-[#1F6F5F]/20 to-[#080d0b]" />
        </div>

        <div className="relative z-10 text-center px-6 py-16 max-w-4xl mx-auto">
          <span className="text-[11px] font-mono tracking-widest text-[#6FCF97] uppercase block mb-3">
            {content.heroEyebrow}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white leading-tight">
            {heroTitle.before}
            <span className="font-semibold text-[#6FCF97]"> {heroTitle.highlight}</span>
            {heroTitle.after}
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-gray-300 font-normal leading-relaxed">
            {content.heroSubtitle}
          </p>
        </div>
      </section>

      {/* OUR STORY SECTION */}
      <section className="py-20 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] uppercase block mb-2">
            {content.storyEyebrow || "Our Story"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-light text-[#111C18] dark:text-white mb-6 leading-tight">
            {content.storyTitle}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed font-normal mb-8">
            {content.storyBody}
          </p>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-200 dark:border-[#182924]">
            {stats.map((s) => (
              <div key={s.label}>
                <h3 className="text-3xl font-light text-[#1F6F5F] dark:text-[#6FCF97]">
                  {compact(s.value)}
                </h3>
                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-[#243B33] shadow-lg dark:shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <img 
            src={content.storyImageUrl} 
            alt="Hotel Staff"
            onError={(e) => { e.currentTarget.src = '/images/1.webp'; }}
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d0b]/40 via-transparent to-transparent" />
        </div>
      </section>

      {/* NETWORK + MAP SECTION */}
      <section className="bg-[#0e1a16] dark:bg-[#0c1612] text-white py-20 border-y border-[#182924]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-10 items-center">

          {/* LEFT CONTENT */}
          <div className="lg:col-span-5">
            <span className="text-[11px] font-mono tracking-widest text-[#6FCF97] uppercase block mb-2">
              {content.networkEyebrow || "Global Network"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-light mb-4 leading-tight text-white">
              {content.networkTitle}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed font-normal">
              {content.networkBody}
            </p>
          </div>

          {/* RIGHT MAP CONTAINER */}
          <div className="lg:col-span-7 relative">
            <div className="h-[420px] rounded-2xl overflow-hidden border border-[#243B33] shadow-xl relative">

              <NeighborhoodMap
                hotels={[ABOUT_LOCATION]}
                landmarks={[]}
                hotelCenter={{ lat: ABOUT_LOCATION.lat, lng: ABOUT_LOCATION.lng }}
                focusedHotelId={ABOUT_LOCATION.id}
                isDarkMode={isDark}
              />

              {/* LOCATION BADGE CARD */}
              <div className="absolute top-5 left-5 bg-[#080d0b]/90 backdrop-blur-md p-4 rounded-xl border border-[#243B33] max-w-xs shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={16} className="text-[#6FCF97]" />
                  <h4 className="font-medium text-sm text-white">{ABOUT_LOCATION.name}</h4>
                </div>
                <p className="text-xs text-gray-300 leading-normal pl-6">{ABOUT_LOCATION.address}</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* CLEAN PARTNER CTA SECTION (WITHOUT PHONE/CALL) */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#2FA084]/30 bg-[#1F6F5F]/10 px-4 py-1 text-[11px] font-mono uppercase tracking-widest text-[#1F6F5F] dark:text-[#6FCF97] mb-4">
          <Sparkles size={12} /> Innovation
        </span>
        <h3 className="text-3xl sm:text-4xl font-light text-[#111C18] dark:text-white">
          {content.ctaTitle}
        </h3>
        <p className="mt-4 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed font-normal">
          {content.ctaBody}
        </p>

        <div className="mt-8">
          <a
            href="/vision-suites"
            className="inline-flex items-center gap-2 bg-[#1F6F5F] hover:bg-[#288B77] dark:bg-[#2FA084] dark:hover:bg-[#288B77] text-white text-xs font-medium uppercase tracking-wider px-7 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            {content.ctaButtonLabel || "Explore Platform"} <ArrowRight size={14} />
          </a>
        </div>
      </section>

    </div>
  );
}