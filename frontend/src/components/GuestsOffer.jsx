import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, Sparkles, ArrowRight, Lock, Crown, Gift, CalendarHeart, ShieldCheck } from 'lucide-react';

const GuestsOffer = ({ offers, isLoggedIn }) => {
  const navigate = useNavigate();
  // Logic para sa Real-Time Countdown Timer
  const [timeLeft, setTimeLeft] = useState({ days: 0, hrs: 0, min: 0, sec: 0 });
  const [liveOffers, setLiveOffers] = useState(Array.isArray(offers) ? offers : []);
  const hasMemberAccess = Boolean(
    isLoggedIn || localStorage.getItem('user') || localStorage.getItem('customerSession')
  );
  const formatPeso = (amount) => `PHP ${Number(amount || 0).toLocaleString()}`;

  // Filter offers by type base sa props
  const seasonalOffer = liveOffers?.find(o => o.offer_type === 'seasonal');
  const flashDeals = liveOffers?.filter(o => o.offer_type === 'flash_deal');
  const holidayPackages = liveOffers?.filter(o => o.offer_type === 'holiday_package');

  useEffect(() => {
    if (Array.isArray(offers) && offers.length > 0) {
      setLiveOffers(offers);
      return;
    }

    let isMounted = true;

    const fetchOffers = async () => {
      try {
        const response = await fetch('/api/guest-offers');
        if (!response.ok) {
          throw new Error('Failed to fetch guest offers');
        }

        const data = await response.json();
        if (isMounted) {
          setLiveOffers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Guest offers fetch error:', error);
        if (isMounted) {
          setLiveOffers([]);
        }
      }
    };

    fetchOffers();

    return () => {
      isMounted = false;
    };
  }, [offers]);

  useEffect(() => {
    // Kung walang expiry_date mula sa props, huwag patakbuhin ang timer
    if (!seasonalOffer?.expiry_date) return;

    const timer = setInterval(() => {
      const target = new Date(seasonalOffer.expiry_date).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hrs: Math.floor((difference / (1000 * 60 * 60)) % 24),
          min: Math.floor((difference / 1000 / 60) % 60),
          sec: Math.floor((difference / 1000) % 60)
        });
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [seasonalOffer]);

  const handleSeasonalAction = () => {
    if (hasMemberAccess) {
      navigate('/offers?view=privileged');
      return;
    }
    navigate('/login');
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen font-sans">
      
      {/* SECTION 1: EARLY BIRD (Half-Screen Glassmorphism Overlay) */}
      <section 
        className="relative h-[85vh] flex items-center bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${seasonalOffer?.image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'})` }}
      >
        <div className="absolute inset-0 bg-black/20" /> {/* Darker tint overlay */}

        {/* The "Half-Screen" Glass Box */}
        <div className="relative z-10 h-full w-full md:w-1/2 flex items-center px-8 md:px-20 bg-white/10 backdrop-blur-xl border-r border-white/20 shadow-2xl">
          <div className="max-w-xl text-white">
            <p className="uppercase tracking-[0.4em] text-[10px] font-bold mb-6 text-[#d4af37] flex items-center gap-2">
              <Sparkles size={14} /> {seasonalOffer?.subtitle || "Seasonal Privilege"}
            </p>
            <h1 className="serif text-5xl md:text-7xl mb-8 leading-[1.1]">
              {seasonalOffer?.title || "Signature Escapes"}
            </h1>
            <p className="text-lg mb-12 opacity-80 leading-relaxed font-light">
              {seasonalOffer?.description || "Experience the pinnacle of luxury with our curated seasonal offerings."}
            </p>
            
            {/* Real-time Countdown Grid */}
            <div className="flex gap-10 mb-12">
              <div className="text-center">
                <span className="text-5xl block font-extralight mb-1">{String(timeLeft.days).padStart(2, '0')}</span>
                <span className="text-[9px] uppercase tracking-[0.2em] opacity-50 font-bold">Days</span>
              </div>
              <div className="text-center">
                <span className="text-5xl block font-extralight mb-1">{String(timeLeft.hrs).padStart(2, '0')}</span>
                <span className="text-[9px] uppercase tracking-[0.2em] opacity-50 font-bold">Hours</span>
              </div>
              <div className="text-center">
                <span className="text-5xl block font-extralight mb-1">{String(timeLeft.min).padStart(2, '0')}</span>
                <span className="text-[9px] uppercase tracking-[0.2em] opacity-50 font-bold">Mins</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSeasonalAction}
              className="group relative bg-[#d4af37] text-white px-12 py-5 uppercase text-[10px] tracking-[0.3em] font-bold transition-all hover:bg-white hover:text-black"
            >
              <span className="relative z-10 flex items-center gap-3">
                {hasMemberAccess ? "Open Privileged Rate" : "Sign In to Secure"} <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: AI SMART PICK (Flash Deals) */}
      <section className="py-20 px-8 md:px-20 max-w-7xl mx-auto">
        {flashDeals?.map((deal) => (
          <div key={deal.id} className="flex flex-col md:flex-row bg-white shadow-sm border border-gray-100 overflow-hidden mb-12">
            <div className="md:w-1/2 h-[450px] overflow-hidden">
              <img 
                src={deal.image_url || "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6"} 
                alt="Room" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="md:w-1/2 p-12 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-[#d4af37] mb-4">
                <Sparkles size={16} />
                <span className="uppercase text-[10px] tracking-[0.2em] font-bold">{deal.badge_text || "AI-Optimized Smart Pick"}</span>
              </div>
              <h2 className="serif text-4xl text-gray-800 mb-6">{deal.title}</h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                {deal.description}
              </p>
              <div className="flex items-baseline gap-4 mb-10">
                <span className="text-gray-400 line-through text-xl">{formatPeso(deal.original_price)}</span>
                <span className="text-[#d4af37] text-4xl font-light">{formatPeso(deal.discounted_price)}</span>
                <span className="text-gray-400 text-sm">/ night</span>
              </div>
              <button className="border border-black py-4 px-8 uppercase text-[10px] tracking-[0.2em] hover:bg-black hover:text-white transition-colors self-start">
                Book Flash Rate
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* SECTION 3: HOLIDAY PACKAGES / MEMBER MOMENTS */}
      <section className="py-20 px-8 md:px-20 bg-white">
        {!hasMemberAccess ? (
          <>
            <div className="flex justify-between items-end mb-12">
              <div>
                <p className="text-[#d4af37] uppercase text-[10px] tracking-[0.2em] mb-2 font-bold">Curated Experiences</p>
                <h2 className="serif text-4xl">Holiday Packages</h2>
              </div>
              <p className="text-gray-400 max-w-xs text-right text-sm italic">
                Tailored escapes designed to elevate your special moments with artisanal touches.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {holidayPackages?.map((pkg) => (
                <div key={pkg.id} className="group cursor-pointer">
                  <div className="relative aspect-[16/9] overflow-hidden mb-6">
                    <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur px-4 py-1 text-[10px] uppercase tracking-widest shadow-sm">
                      {pkg.badge_text}
                    </div>
                    <img 
                      src={pkg.image_url} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                      alt={pkg.title}
                    />
                  </div>
                  <h3 className="serif text-2xl mb-3">{pkg.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                    {pkg.description}
                  </p>
                  <button className="flex items-center gap-2 text-[#d4af37] uppercase text-[10px] tracking-[0.2em] font-bold group-hover:gap-4 transition-all">
                    Explore Details <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-end mb-12 gap-6 flex-wrap">
              <div>
                <p className="text-[#d4af37] uppercase text-[10px] tracking-[0.2em] mb-2 font-bold">Member Spotlight</p>
                <h2 className="serif text-4xl">Your Next Elevated Moment</h2>
              </div>
              <p className="text-gray-400 max-w-md text-right text-sm italic">
                Reserved for signed-in guests: timely upgrades, intimate extras, and polished finishing touches that make each stay feel intentionally yours.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#0f0f0f] text-white p-10 md:p-12 rounded-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.25),_transparent_42%)]" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 text-[#d4af37] mb-6">
                    <Crown size={18} />
                    <span className="uppercase text-[10px] tracking-[0.25em] font-bold">Signed-in Privileges</span>
                  </div>
                  <h3 className="serif text-4xl md:text-5xl leading-tight mb-5">
                    Stay spontaneous, but never miss the best window.
                  </h3>
                  <p className="text-white/75 leading-relaxed max-w-2xl mb-10">
                    Your account keeps the most relevant rates and limited-time packages within reach, so you can move from inspiration to confirmed stay with less friction and more confidence.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-white/10 bg-white/5 p-5 rounded-sm">
                      <Gift size={18} className="text-[#d4af37] mb-3" />
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Active Offers</p>
                      <p className="text-3xl font-light">{liveOffers.length}</p>
                    </div>
                    <div className="border border-white/10 bg-white/5 p-5 rounded-sm">
                      <CalendarHeart size={18} className="text-[#d4af37] mb-3" />
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Flash Deals</p>
                      <p className="text-3xl font-light">{flashDeals.length}</p>
                    </div>
                    <div className="border border-white/10 bg-white/5 p-5 rounded-sm">
                      <ShieldCheck size={18} className="text-[#d4af37] mb-3" />
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2">Priority Access</p>
                      <p className="text-sm leading-relaxed text-white/75">Member-first view on featured rates and curated packages.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#fbf8ef] border border-[#eee2bf] p-8 rounded-sm flex flex-col justify-between">
                <div>
                  <p className="text-[#d4af37] uppercase text-[10px] tracking-[0.2em] font-bold mb-4">Recommended Next Step</p>
                  <h3 className="serif text-3xl text-gray-900 mb-4">
                    {seasonalOffer?.title || 'Keep your preferred rate within reach'}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {seasonalOffer?.description || 'Browse live packages and secure the stay enhancements that fit your timing, celebration, or travel mood.'}
                  </p>
                </div>

                <button
                  onClick={() => navigate('/booking')}
                  className="mt-8 bg-black text-white px-8 py-4 uppercase text-[10px] tracking-[0.2em] font-bold hover:bg-[#d4af37] transition-colors"
                >
                  Continue to Booking
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* NEW MEMBER SIGN-UP BANNER */}
      {!hasMemberAccess && (
        <section className="mx-8 md:mx-20 mb-20 p-12 bg-black text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-700 via-transparent to-transparent" />
          </div>
          <div className="relative z-10">
            <Lock className="mx-auto mb-6 text-[#d4af37]" size={32} />
            <h2 className="serif text-3xl mb-4">Unlock the Unseen</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Our most exclusive rates and hidden "Prophet" deals are reserved for members. Register now to experience Lumiere Suites at its finest.
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="bg-white text-black px-12 py-4 uppercase text-[10px] tracking-[0.2em] font-bold hover:bg-[#d4af37] hover:text-white transition-all"
            >
              Register Now
            </button>
          </div>
        </section>
      )}

      {/* EXPLORE 360 */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="bg-white/80 backdrop-blur-md border border-gray-200 p-4 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-3 pr-6">
          <div className="bg-black text-white rounded-full p-2">
            <Sparkles size={18} />
          </div>
          <span className="uppercase text-[10px] tracking-[0.2em] font-bold text-black">Explore 360-degree</span>
        </button>
      </div>
    </div>
  );
};

export default GuestsOffer;
