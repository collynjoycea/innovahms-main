import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Headset, MapPin, Phone, Sparkles } from 'lucide-react';
import NeighborhoodMap from '../components/NeighborhoodMap';

const ABOUT_LOCATION = {
  id: 'innovahms-hq',
  name: 'Innova HMS',
  address: 'Congressional Road Extension, Caloocan, Bulacan, Philippines',
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
    networkTitle: 'Our Global Footprint',
    networkBody:
      'Built for hospitality operations that need one connected platform across multiple properties and guest touchpoints.',
    ctaTitle: 'Partner with Innova HMS',
    ctaBody:
      'Bring your hotel operations, staff coordination, and guest experience workflows into one connected platform.',
    ctaButtonLabel: 'Start with Innova',
    contactPhone: '09605736024',
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">

      {/* HERO */}
      <section className="relative h-[60vh] flex items-center justify-center bg-black text-white">
        <img src={content.heroImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="relative z-10 text-center px-6">
          <p className="text-xs tracking-widest text-[#bf9b30]">{content.heroEyebrow}</p>
          <h1 className="text-5xl font-bold">
            {heroTitle.before}
            <span className="text-[#bf9b30]"> {heroTitle.highlight}</span>
            {heroTitle.after}
          </h1>
          <p className="mt-4 max-w-xl mx-auto">{content.heroSubtitle}</p>
        </div>
      </section>

      {/* STORY */}
      <section className="py-20 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-4xl font-bold mb-4">{content.storyTitle}</h2>
          <p>{content.storyBody}</p>

          <div className="grid grid-cols-2 gap-6 mt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <h3 className="text-3xl text-[#bf9b30]">{compact(s.value)}</h3>
                <p className="text-xs uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <img src={content.storyImageUrl} className="rounded-2xl shadow-xl" />
      </section>

      {/* NETWORK + MAP */}
      <section className="bg-[#0a0503] text-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-10">

          {/* LEFT */}
          <div className="lg:col-span-5">
            <h2 className="text-4xl font-bold mb-4">{content.networkTitle}</h2>
            <p className="text-gray-400">{content.networkBody}</p>
          </div>

          {/* RIGHT MAP */}
          <div className="lg:col-span-7 relative">
            <div className="h-[500px] rounded-3xl overflow-hidden border border-white/10">

              <NeighborhoodMap
                hotels={[ABOUT_LOCATION]}
                landmarks={[]}
                hotelCenter={{ lat: ABOUT_LOCATION.lat, lng: ABOUT_LOCATION.lng }}
                focusedHotelId={ABOUT_LOCATION.id}
                isDarkMode={false}
              />

              {/* LOCATION CARD */}
              <div className="absolute top-6 left-6 bg-black/70 p-4 rounded-xl">
                <MapPin className="text-[#bf9b30]" />
                <h4 className="font-bold">{ABOUT_LOCATION.name}</h4>
                <p className="text-sm text-gray-300">{ABOUT_LOCATION.address}</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h3 className="text-3xl font-bold">{content.ctaTitle}</h3>
        <p className="mt-4">{content.ctaBody}</p>

        <a
          href={`tel:${content.contactPhone}`}
          className="inline-block mt-6 bg-[#bf9b30] text-white px-8 py-4 rounded-xl"
        >
          Call Now
        </a>
      </section>

    </div>
  );
}