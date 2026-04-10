import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Headset, Phone, Sparkles } from 'lucide-react';

const fallbackData = {
  content: {
    heroEyebrow: 'About Innova HMS',
    heroTitle: 'Revolutionizing Hospitality through AI',
    heroHighlight: 'through AI',
    heroSubtitle: 'Empowering high-end hospitality management with intelligent automation and seamless guest experiences.',
    storyEyebrow: 'Our Story',
    storyTitle: 'Defining the Future of Luxury Service',
    storyBody: 'Founded at the intersection of luxury hospitality and cutting-edge technology, Innova HMS was built to simplify complex operations while elevating the human touch across every stay.',
    networkEyebrow: 'Global Network Live',
    networkTitle: 'Our Global Footprint',
    networkBody: 'Built for hospitality operations that need one connected platform across multiple properties and guest touchpoints.',
    ctaTitle: 'Partner with Innova HMS',
    ctaBody: 'Bring your hotel operations, staff coordination, and guest experience workflows into one connected platform.',
    ctaButtonLabel: 'Start with Innova',
    contactPhone: '09605736024',
    heroImageUrl: '/images/hero-lobby.jpg',
    storyImageUrl: '/images/about-story-staff.jpg',
    networkImageUrl: '/images/global-network-map.jpg',
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

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/about');
        const payload = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) {
          setData({
            content: { ...fallbackData.content, ...(payload.content || {}) },
            stats: Array.isArray(payload.stats) && payload.stats.length ? payload.stats : fallbackData.stats,
          });
          return;
        }
        if (!cancelled) setData(fallbackData);
      } catch {
        if (!cancelled) setData(fallbackData);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const content = data.content || fallbackData.content;
  const customerStats = useMemo(() => {
    const stats = Array.isArray(data.stats) ? data.stats : [];
    const hotelStat = stats.find((item) => item.label === 'Hotels Connected') || fallbackData.stats[0];
    const bookingStat = stats.find((item) => item.label === 'Guest Bookings') || fallbackData.stats[1];
    return [hotelStat, bookingStat];
  }, [data.stats]);

  const heroTitle = useMemo(() => {
    const title = String(content.heroTitle || fallbackData.content.heroTitle);
    const highlight = String(content.heroHighlight || '').trim();
    if (!highlight || !title.includes(highlight)) return { before: title, highlight: '', after: '' };
    const [before, ...rest] = title.split(highlight);
    return { before, highlight, after: rest.join(highlight) };
  }, [content.heroTitle, content.heroHighlight]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f8fafc] text-slate-900">
      <section className="relative flex min-h-[54vh] items-center justify-center overflow-hidden bg-stone-900">
        <div className="absolute inset-0 z-0">
          <img src={content.heroImageUrl} className="h-full w-full object-cover opacity-90" alt="Luxury Interior" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />
        </div>

        <div className="relative z-10 max-w-5xl px-6 py-12 text-center text-white">
          <p className="mb-5 text-[11px] font-black uppercase tracking-[0.3em] text-[#d4b04f]">{content.heroEyebrow}</p>
          <h1 className="mb-5 text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-2xl md:text-6xl">
            {heroTitle.before}
            {heroTitle.highlight ? <span className="text-[#bf9b30]"> {heroTitle.highlight}</span> : null}
            {heroTitle.after}
          </h1>
          <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-white/95 md:text-xl">
            {content.heroSubtitle}
          </p>
        </div>
      </section>

      <section className="relative bg-white py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="space-y-8">
              <div>
                <span className="mb-6 inline-block rounded-full bg-[#bf9b30]/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">
                  {content.storyEyebrow}
                </span>
                <h2 className="mb-8 text-5xl font-bold leading-none tracking-tight text-slate-900">
                  {content.storyTitle}
                </h2>
                <p className="text-lg font-medium leading-relaxed text-slate-600">
                  {content.storyBody}
                </p>
                <div className="mt-10 grid grid-cols-2 gap-8">
                  {customerStats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-4xl font-bold text-[#bf9b30]">{compact(stat.value)}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-2xl">
                <img src={content.storyImageUrl} className="h-[500px] w-full object-cover" alt="Service Excellence" />
              </div>
              <div className="absolute -bottom-6 -left-6 z-20 rounded-2xl bg-[#bf9b30] p-6 shadow-2xl">
                <Sparkles className="h-10 w-10 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/5 bg-[#0a0503] py-24 text-white">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
            <div className="space-y-10 lg:col-span-5">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500">{content.networkEyebrow}</span>
                </div>
                <h2 className="text-5xl font-bold tracking-tight leading-tight">{content.networkTitle}</h2>
                <p className="text-lg leading-relaxed text-gray-400">{content.networkBody}</p>
              </div>

              <div className="space-y-6">
                <div className="group flex cursor-default items-center gap-5">
                  <div className="rounded-full bg-[#bf9b30]/20 p-3 transition-all duration-300 group-hover:bg-[#bf9b30]">
                    <Globe className="h-6 w-6 text-[#bf9b30] group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-200">Operational Coverage</p>
                    <p className="text-sm text-gray-500">Hotel groups, resorts, and managed stays connected in one workflow</p>
                  </div>
                </div>
                <div className="group flex cursor-default items-center gap-5">
                  <div className="rounded-full bg-[#bf9b30]/20 p-3 transition-all duration-300 group-hover:bg-[#bf9b30]">
                    <Headset className="h-6 w-6 text-[#bf9b30] group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-200">Customer Support</p>
                    <p className="text-sm text-gray-500">Reach us directly for inquiries and hospitality platform assistance</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative lg:col-span-7">
              <div className="relative h-[300px] overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-4 shadow-2xl md:h-[520px]">
                <div className="absolute inset-0 z-0">
                  <img src={content.networkImageUrl} className="h-full w-full rounded-[32px] object-cover opacity-40 mix-blend-screen" alt="World Map" />
                  <div className="absolute left-[48%] top-[35%]"><PulseNode /></div>
                  <div className="absolute left-[25%] top-[38%]"><PulseNode /></div>
                  <div className="absolute left-[78%] top-[65%]"><PulseNode /></div>
                  <div className="absolute left-[58%] top-[48%]"><PulseNode /></div>
                </div>

                <div className="relative z-10 flex h-full items-end justify-start">
                  <h4 className="px-4 text-center text-2xl font-black uppercase tracking-[0.4em] text-[#bf9b30] opacity-80 drop-shadow-2xl md:text-5xl">
                    Enterprise <br className="md:hidden" /> Network
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-8 text-center">
          <div className="group relative overflow-hidden rounded-[3rem] border border-slate-100 bg-slate-50 p-16 shadow-sm">
            <div className="absolute -inset-full translate-x-[-100%] rotate-45 bg-gradient-to-r from-transparent via-[#bf9b30]/5 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />
            <h3 className="mb-6 text-4xl font-black uppercase tracking-tight text-slate-900">{content.ctaTitle}</h3>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-slate-600">{content.ctaBody}</p>

            <div className="mx-auto mb-8 flex w-fit items-center gap-3 rounded-2xl border border-[#bf9b30]/20 bg-white px-5 py-4 text-left shadow-sm">
              <div className="rounded-full bg-[#bf9b30]/10 p-3 text-[#bf9b30]">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Contact</p>
                <a href={`tel:${content.contactPhone}`} className="mt-1 block text-lg font-black text-slate-900 hover:text-[#bf9b30]">
                  {content.contactPhone}
                </a>
              </div>
            </div>

            <a
              href={`tel:${content.contactPhone}`}
              className="inline-flex rounded-2xl bg-[#bf9b30] px-12 py-5 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-105 hover:bg-[#a68628]"
            >
              {content.ctaButtonLabel}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function PulseNode() {
  return (
    <span className="relative flex h-4 w-4">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#bf9b30] opacity-75" />
      <span className="relative inline-flex h-4 w-4 rounded-full bg-[#bf9b30] shadow-[0_0_10px_#bf9b30]" />
    </span>
  );
}
