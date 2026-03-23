import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import GuestReviewsSection from "../components/GuestReviewsSection";
import resolveImg from "../utils/resolveImg";

const fallbackHotelCards = [
  {
    id: "quantum-suite",
    name: "Quantum Executive Suite",
    location: "Metro Manila, PH",
    image: "/images/room1.jpg",
    forecast: "95% Occupancy",
    status: "OPEN",
    description: "Premium suite experience with smart room controls and elevated comfort.",
    schedule: "24/7 Guest Service",
  },
];

const fallbackPromotions = [
  {
    id: "promo-early-bird",
    badge: "Early Bird",
    title: "Early Sanctuary Deal",
    desc: "Book 30 days in advance and unlock premium savings on all room categories. Includes complimentary breakfast.",
    promo: "30%",
    sub: "off any room",
    expiry: "Limited-time offer",
    icon: "SUN",
  },
  {
    id: "promo-vip-weekend",
    badge: "VIP Exclusive",
    title: "Suki Member Weekend",
    desc: "Exclusive weekend rate for loyalty members with room upgrades and spa access.",
    promo: "40%",
    sub: "off weekends",
    expiry: "Limited-time offer",
    icon: "VIP",
  },
  {
    id: "promo-long-stay",
    badge: "Long Stay",
    title: "Extended Sanctuary",
    desc: "Stay 5 nights and get the 6th night free on selected premium rooms.",
    promo: "6th Night",
    sub: "free",
    expiry: "Ongoing promotion",
    icon: "STAY",
  },
];

// Persistent image index so animation continues when navigating back
let _heroImgIndex = 0;
let _heroInterval = null;

const images = ["/images/herobg.jpg", "/images/herobg1.jpg", "/images/herobg2.jpg"];

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentImg, setCurrentImg] = useState(() => _heroImgIndex);
  const [isBooted, setIsBooted] = useState(true);
  const [hotelCards, setHotelCards] = useState(fallbackHotelCards);
  const [promotionCards, setPromotionCards] = useState(fallbackPromotions);
  const [suiteTourRoomId, setSuiteTourRoomId] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);
  const [heroCheckIn, setHeroCheckIn] = useState(() => toInputDate(new Date()));
  const [heroCheckOut, setHeroCheckOut] = useState(() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    return toInputDate(nextDay);
  });
  const [heroGuests, setHeroGuests] = useState(2);
  const [heroRoomType, setHeroRoomType] = useState("Any");
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
    // Clear any existing interval first
    if (_heroInterval) clearInterval(_heroInterval);
    _heroInterval = setInterval(() => {
      _heroImgIndex = (_heroImgIndex + 1) % images.length;
      setCurrentImg(_heroImgIndex);
    }, 8000);
    return () => {
      // Don't clear on unmount — keep running so index stays in sync
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        const [roomsRes, offersRes] = await Promise.all([
          fetch("/api/rooms"),
          fetch("/api/guest-offers"),
        ]);

        if (roomsRes.ok) {
          const roomsPayload = await roomsRes.json();
          const rooms = Array.isArray(roomsPayload?.rooms)
            ? roomsPayload.rooms
            : Array.isArray(roomsPayload)
              ? roomsPayload
              : [];

          const firstSuiteRoom = rooms.find((room) => {
            const type = String(room.type || room.room_type || room.roomType || "").toLowerCase();
            return type.includes("suite");
          });
          if (isMounted) {
            setSuiteTourRoomId(firstSuiteRoom?.id || null);
          }

          const mappedHotels = rooms.slice(0, 4).map((room) => {
            const capacity = Number(room.maxAdults || 0) + Number(room.maxChildren || 0);
            const roomType = room.roomType || room.type || room.room_type || "Suite";
            const rawImg = (Array.isArray(room.images) && room.images[0]) || "";
            const image = resolveImg(rawImg);
            return {
              id: room.id,
              name: room.roomName || room.name || roomType || "Innova Suite",
              location: room.location_description || "Innova Smart Hotel",
              image,
              forecast: `${Math.max(capacity, 2)} Pax`,
              status: String(room.status || "Available").toUpperCase() === "AVAILABLE" ? "OPEN" : String(room.status || "CLOSED").toUpperCase(),
              description: room.description || `${roomType} room designed for seamless comfort and smart hospitality experiences.`,
              schedule: "24/7 Guest Service",
              roomType,
              amenities: Array.isArray(room.amenities) ? room.amenities : [],
            };
          });

          if (isMounted && mappedHotels.length > 0) {
            setHotelCards(mappedHotels);
          }
        }

        if (offersRes.ok) {
          const offersPayload = await offersRes.json();
          const offers = Array.isArray(offersPayload) ? offersPayload : [];

          const mappedOffers = offers.slice(0, 3).map((offer, index) => {
            const iconByType = {
              seasonal: "SUN",
              flash_deal: "FLASH",
              holiday_package: "PACK",
            };

            const promoText = Number(offer.discount_percentage || 0) > 0
              ? `${Number(offer.discount_percentage)}%`
              : `PHP ${Number(offer.discounted_price || 0).toLocaleString()}`;

            return {
              id: offer.id || `offer-${index}`,
              badge: offer.badge_text || "Featured Deal",
              title: offer.title || "Special Offer",
              desc: offer.description || "Enjoy exclusive rates for a limited time.",
              promo: promoText,
              sub: Number(offer.discount_percentage || 0) > 0 ? "off today" : "promo rate",
              expiry: offer.expiry_date ? `Expires ${new Date(offer.expiry_date).toLocaleDateString()}` : "Limited-time offer",
              icon: iconByType[offer.offer_type] || "DEAL",
            };
          });

          if (isMounted && mappedOffers.length > 0) {
            setPromotionCards(mappedOffers);
          }
        }
      } catch (error) {
        console.error("Home data fetch error:", error);
      }
    };

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadSessionUser = () => {
      const raw = localStorage.getItem("user") || localStorage.getItem("customerSession");
      if (!raw) {
        setSessionUser(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        const normalizedUser = parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
        setSessionUser(normalizedUser);
      } catch {
        setSessionUser(null);
      }
    };

    loadSessionUser();
    window.addEventListener("userUpdated", loadSessionUser);
    window.addEventListener("storage", loadSessionUser);

    return () => {
      window.removeEventListener("userUpdated", loadSessionUser);
      window.removeEventListener("storage", loadSessionUser);
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/" || !location.hash) return;

    const sectionId = location.hash.replace("#", "");
    const timer = setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);

    return () => clearTimeout(timer);
  }, [location.pathname, location.hash, hotelCards.length, promotionCards.length]);
  const handleHeroAvailabilitySearch = () => {
    const params = new URLSearchParams();
    if (heroCheckIn) params.set("from", heroCheckIn);
    if (heroCheckOut) params.set("to", heroCheckOut);
    if (heroGuests) params.set("guests", String(heroGuests));
    if (heroRoomType && heroRoomType !== "Any") params.set("view", heroRoomType);
    navigate(`/vision-suites${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handlePromotionAccess = () => {
    if (sessionUser?.id) {
      navigate("/offers?view=privileged");
      return;
    }
    navigate("/login");
  };

  const roomTypeOptions = Array.from(
    new Set(hotelCards.map((room) => room.roomType).filter(Boolean))
  );

  return (
    <main className="relative min-h-screen w-full bg-[#f6f1e5] dark:bg-[#0d0c0a] font-sans selection:bg-[#bf9b30]/30 overflow-x-hidden text-[#1a160d] dark:text-[#e5e1d8] transition-colors duration-300">
      
      <section id="hero" className="relative h-screen w-full overflow-hidden shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImg}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-[-6%] z-0 bg-cover bg-center animate-hero-zoom"
            style={{ backgroundImage: `url(${images[currentImg]})` }}
          >
            <div className={`absolute inset-0 ${
              isDark ? "bg-black/20" : "bg-black/10"
            }`} />
            <div className={`absolute inset-0 ${
              isDark
                ? "bg-gradient-to-b from-black/15 via-transparent to-black/55"
                : "bg-gradient-to-b from-black/10 via-transparent to-black/45"
            }`} />
          </motion.div>
        </AnimatePresence>

        <style>{`
          @keyframes heroZoom {
            0%   { transform: scale(1.06); }
            100% { transform: scale(1.14); }
          }
          .animate-hero-zoom {
            animation: heroZoom 10s ease-in-out infinite alternate;
          }
        `}</style>

        <div className="relative z-20 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <h2 className="text-[10px] font-bold uppercase tracking-[0.8em] text-[#bf9b30]">
              The Evolution of Travel
            </h2>
            <h1 className="mt-4 text-7xl md:text-[10rem] font-black tracking-tighter leading-none bg-gradient-to-b from-white via-[#f5f1da] to-[#bf9b30] bg-clip-text text-transparent drop-shadow-2xl">
              INNOVA<span className="text-[#bf9b30]">.</span>HMS
            </h1>
          </motion.div>

          <div className="max-w-2xl">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-2 text-[12px] md:text-sm leading-relaxed tracking-[0.1em] text-white/85 font-light drop-shadow-md"
            >
              INNOVA-HMS is designed to provide guests with a smarter, faster, and more convenient hotel experience. 
              Through our intelligent management platform, explore rooms, make reservations, and manage 
              your sanctuary anywhere in the world.
            </motion.p>
          </div>

          {/* HERO AVAILABILITY CONSOLE */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className={`mt-16 w-full max-w-4xl overflow-hidden rounded-[1.4rem] border backdrop-blur-xl shadow-[0_26px_56px_rgba(0,0,0,0.4)] transition-all duration-300 ${
              isDark
                ? "border-[#bf9b30]/40 bg-black/70"
                : "border-white/60 bg-white/80"
            }`}
          >
            <div className="flex flex-col md:flex-row items-stretch">
              <div className={`flex-1 px-7 py-5 border-b md:border-b-0 md:border-r text-left ${
                isDark ? "border-[#bf9b30]/20" : "border-[#bf9b30]/25"
              }`}>
                <span className="block text-[10px] uppercase tracking-[0.26em] text-[#bf9b30] font-black mb-2">Check Availability</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={heroCheckIn}
                    onChange={(e) => setHeroCheckIn(e.target.value)}
                    className={`h-9 w-full rounded-md border px-2 text-[13px] font-semibold outline-none focus:border-[#bf9b30] transition-colors ${
                      isDark
                        ? "border-[#bf9b30]/20 bg-white/10 text-[#f0e6d2] placeholder:text-white/30"
                        : "border-[#bf9b30]/30 bg-white/70 text-[#1a160d] placeholder:text-[#1a160d]/30"
                    }`}
                  />
                  <span className={`text-xs font-bold flex-shrink-0 ${isDark ? "text-[#ab9870]" : "text-[#bf9b30]"}`}>—</span>
                  <input
                    type="date"
                    value={heroCheckOut}
                    onChange={(e) => setHeroCheckOut(e.target.value)}
                    className={`h-9 w-full rounded-md border px-2 text-[13px] font-semibold outline-none focus:border-[#bf9b30] transition-colors ${
                      isDark
                        ? "border-[#bf9b30]/20 bg-white/10 text-[#f0e6d2] placeholder:text-white/30"
                        : "border-[#bf9b30]/30 bg-white/70 text-[#1a160d] placeholder:text-[#1a160d]/30"
                    }`}
                  />
                </div>
              </div>
              <div className="flex-1 px-7 py-5 text-left">
                <span className="block text-[10px] uppercase tracking-[0.26em] text-[#bf9b30] font-black mb-2">Guest Occupancy</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={heroGuests}
                    onChange={(e) => setHeroGuests(Math.max(1, Number(e.target.value) || 1))}
                    className={`h-9 rounded-md border px-3 text-[13px] font-semibold outline-none focus:border-[#bf9b30] transition-colors ${
                      isDark
                        ? "border-[#bf9b30]/20 bg-white/10 text-[#f0e6d2]"
                        : "border-[#bf9b30]/30 bg-white/70 text-[#1a160d]"
                    }`}
                  />
                  <select
                    value={heroRoomType}
                    onChange={(e) => setHeroRoomType(e.target.value)}
                    className={`h-9 rounded-md border px-3 text-[13px] font-semibold outline-none focus:border-[#bf9b30] transition-colors ${
                      isDark
                        ? "border-[#bf9b30]/20 bg-[#1a1208] text-[#f0e6d2]"
                        : "border-[#bf9b30]/30 bg-white/70 text-[#1a160d]"
                    }`}
                  >
                    <option value="Any">Any Room</option>
                    {roomTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={handleHeroAvailabilitySearch}
                className="m-2 min-h-14 px-8 md:px-12 rounded-xl bg-[#bf9b30] text-[11px] font-black uppercase tracking-[0.22em] text-[#0d0c0a] hover:bg-[#d8b454] hover:scale-[1.01] active:scale-95 transition-all shadow-lg"
              >
                Initiate Search
              </button>
            </div>
          </motion.div>
        </div>
      </section>

 {/* --- FACILITIES / AMENITIES SECTION --- */}
<section id="suites" className="relative pt-8 pb-16 px-6 bg-[#f6f1e5] dark:bg-[#0d0c0a] max-w-7xl mx-auto overflow-hidden scroll-mt-24 transition-colors duration-300">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <motion.div 
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="max-w-xl text-left"
    >
      <p className="font-serif italic text-[#bf9b30] text-xl md:text-2xl mb-1 tracking-wide">
        Facilities
      </p>
      <h2 className="text-3xl md:text-4xl font-bold text-[#1a160d] dark:text-white tracking-tight uppercase mb-2">
        Our <span className="text-[#bf9b30]">Amenities</span>
      </h2>
      <p className="text-[#7d725f] dark:text-gray-400 text-xs md:text-sm font-light leading-relaxed max-w-md">
        Premium facilities designed to enhance every aspect of your journey.
      </p>
    </motion.div>

    <div className="flex items-center gap-3">
      <Link
        to="/facilities"
        className="text-[#bf9b30] text-[10px] font-black uppercase tracking-widest hover:underline"
      >
        Explore All Facilities
      </Link>
      <Link
        to={suiteTourRoomId ? `/virtual-tour/${suiteTourRoomId}` : "/vision-suites"}
        className="rounded-full border border-[#bf9b30]/35 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#7f6525] dark:text-[#bf9b30] hover:bg-[#bf9b30] hover:text-[#0d0c0a] transition-all"
      >
        Suites 360 Tour
      </Link>
    </div>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    
    {/* HIGHLIGHT BOX (Now Clickable) */}
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="lg:col-span-8 relative group overflow-hidden rounded-xl border border-[#e6ddca] dark:border-white/5 bg-white/95 dark:bg-[#14130f] h-[580px] shadow-[0_22px_46px_rgba(191,155,48,0.14)] dark:shadow-none"
    >
      <Link to={suiteTourRoomId ? `/virtual-tour/${suiteTourRoomId}` : "/vision-suites"} className="flex flex-col h-full w-full">
        <div className="relative h-[65%] overflow-hidden">
          <img 
            src="/images/signup-img.png" 
            alt="Main Facility" 
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-all duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#efe8d7] dark:from-[#14130f] via-transparent to-transparent" />
          <div className="absolute top-4 left-4 bg-[#bf9b30]/10 backdrop-blur-md border border-[#bf9b30]/30 px-3 py-1 rounded-full flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#bf9b30] animate-pulse" />
            <span className="text-[9px] font-bold text-[#bf9b30] uppercase tracking-widest">Presidential Suite</span>
          </div>
        </div>

        <div className="p-6 flex flex-col justify-between flex-grow">
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-[#1a160d] dark:text-white uppercase tracking-tighter mb-2 group-hover:text-[#bf9b30] transition-colors">
              The Imperial <span className="text-[#bf9b30]">Sanctum</span>
            </h3>
            <p className="text-[10px] md:text-xs text-[#756a58] dark:text-gray-400 font-light leading-relaxed max-w-xl line-clamp-2">
              A masterpiece of luxury living spanning 180 sqm. Complete with a private terrace, jacuzzi, personal butler, and panoramic city views.
            </p>
          </div>

          <div className="flex items-center gap-8 mt-4 pt-4 border-t border-[#ece3d1] dark:border-white/5">
            {[
              { label: "SQM", val: "180" },
              { label: "GUESTS", val: "4" },
              { label: "PER NIGHT", val: "18k" },
              { label: "RATING", val: "4.9" }
            ].map((spec, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-lg font-black text-[#bf9b30] leading-none">{spec.val}</span>
                <span className="text-[8px] text-[#746957] dark:text-gray-500 font-bold uppercase tracking-tighter mt-1">{spec.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>

    {/* SIDE CARDS (Now Clickable) */}
    <div className="lg:col-span-4 flex flex-col gap-4">
      {[
        { 
          title: "Wellness Gym", 
          desc: "AI-integrated health equipment.", 
          img: "/images/hero-bg-img.png", 
          label: "Fitness" 
        },
        { 
          title: "Dining Hall", 
          desc: "Futuristic culinary experience.", 
          img: "/images/signup-img.png", 
          label: "Culinary" 
        }
      ].map((item, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="relative group flex-1 overflow-hidden rounded-lg h-[102px] border border-[#e8decb] dark:border-white/5 shadow-[0_16px_34px_rgba(191,155,48,0.1)] dark:shadow-none"
        >
          <Link to="/facilities" className="block w-full h-full">
            <img 
              src={item.img} 
              alt={item.title} 
              className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-600"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <span className="text-[8px] text-[#bf9b30] font-black uppercase tracking-[0.3em] mb-1">{item.label}</span>
              <h4 className="text-md font-bold text-[#1a160d] dark:text-[#e5e1d8] uppercase tracking-wide group-hover:text-[#bf9b30] transition-colors">
                {item.title}
              </h4>
              <p className="text-[9px] text-[#756a58] dark:text-gray-500 font-light mt-0.5 leading-tight line-clamp-2">
                {item.desc}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
</section>


{/* --- ROOMS SECTION --- */}
<section id="rooms" className="relative pt-20 pb-10 px-6 max-w-7xl mx-auto scroll-mt-20">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#bf9b30] mb-2">Room Collection</p>
      <h2 className="text-5xl md:text-6xl font-black text-[#1a160d] dark:text-white uppercase tracking-tighter leading-none">
        Featured <span className="font-serif italic font-light text-[#bf9b30] normal-case tracking-normal">Rooms</span>
      </h2>
      <p className="text-[#7a6f5e] dark:text-gray-400 text-xs mt-4 max-w-md font-light leading-relaxed">
        Live room inventory connected to your database with quick access to room details and booking.
      </p>
    </motion.div>
    <button
      type="button"
      onClick={() => navigate("/recommendations")}
      className="px-6 py-3 border border-[#bf9b30]/40 text-[#bf9b30] text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-[#bf9b30] hover:text-[#0d0c0a] transition-all"
    >
      View All Rooms
    </button>
  </div>

  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {hotelCards.map((hotel, idx) => (
      <motion.article
        key={hotel.id || idx}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
        viewport={{ once: true }}
        className="group bg-white/95 dark:bg-[#14130f] border border-[#e6ddca] dark:border-[#bf9b30]/15 rounded-2xl overflow-hidden shadow-[0_24px_46px_rgba(191,155,48,0.15)] dark:shadow-xl hover:border-[#bf9b30]/40 transition-all duration-500"
      >
        <Link to={`/hoteldetail/${hotel.id}`} className="block">
          <div className="relative h-40 overflow-hidden">
            <img
              src={hotel.image}
              alt={hotel.name}
              onError={(e) => { e.currentTarget.src = `/images/room1.jpg`; }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#f0e8d5] dark:from-[#0d0c0a] via-transparent to-transparent" />
            <span className={`absolute top-4 right-4 px-4 py-1 rounded-full text-[10px] font-black tracking-[0.2em] border ${
              hotel.status === "OPEN"
                ? "bg-emerald-400/15 text-emerald-300 border-emerald-300/40"
                : "bg-rose-400/15 text-rose-300 border-rose-300/40"
            }`}>
              {hotel.status}
            </span>
          </div>
        </Link>

        <div className="p-6">
          <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#bf9b30] mb-1">{hotel.forecast}</p>
          <h3 className="text-lg font-black tracking-tight text-[#1a160d] dark:text-white mb-1 leading-none group-hover:text-[#bf9b30] transition-colors">
            {hotel.name}
          </h3>
          <p className="text-[#766b59] dark:text-gray-400 text-xs leading-relaxed line-clamp-2">{hotel.description}</p>

          <div className="mt-3 pt-3 border-t border-[#bf9b30]/15 flex flex-col gap-2">
            <p className="text-[10px] text-[#746a58] dark:text-gray-400 flex items-center gap-1">
              <MapPin size={11} className="text-[#bf9b30]" />
              {hotel.location}
            </p>
            <div className="flex items-center gap-2">
              <Link
                to={`/hoteldetail/${hotel.id}`}
                className="flex-1 text-center py-1.5 rounded-lg border border-[#bf9b30]/50 text-[#bf9b30] text-[9px] font-black uppercase tracking-widest hover:bg-[#bf9b30]/10 transition-all"
              >
                Details
              </Link>
              <Link
                to={`/virtual-tour/${hotel.id}`}
                className="flex-1 text-center py-1.5 rounded-lg border border-[#cdb88a] dark:border-white/20 text-[#8a6f2a] dark:text-white hover:bg-[#f2e8cf] dark:hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all"
              >
                360 Tour
              </Link>
              <button
                type="button"
                onClick={() => navigate(`/booking?roomId=${hotel.id}`)}
                className="flex-1 py-1.5 rounded-lg bg-[#bf9b30] text-[#0d0c0a] text-[9px] font-black uppercase tracking-widest hover:bg-[#d8b454] transition-all"
              >
                Reserve
              </button>
            </div>
          </div>
        </div>
      </motion.article>
    ))}
  </div>
</section>

{/* --- HOTELS SECTION --- */}
<section id="hotels" className="relative pt-20 pb-10 px-6 max-w-7xl mx-auto scroll-mt-20">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#bf9b30] mb-2">Our Properties</p>
      <h2 className="text-5xl md:text-6xl font-black text-[#1a160d] dark:text-white uppercase tracking-tighter leading-none">
        Our <span className="font-serif italic font-light text-[#bf9b30] normal-case tracking-normal">Hotels</span>
      </h2>
      <p className="text-[#7a6f5e] dark:text-gray-400 text-xs mt-4 max-w-md font-light leading-relaxed">
        Discover our collection of smart hotels powered by Innova HMS.
      </p>
    </motion.div>
    <button
      type="button"
      onClick={() => navigate("/vision-suites#map")}
      className="px-6 py-3 border border-[#bf9b30]/40 text-[#bf9b30] text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-[#bf9b30] hover:text-[#0d0c0a] transition-all"
    >
      View Map
    </button>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[
      {
        name: "Innova Velora Hotel",
        location: "Metro Manila, PH",
        img: "/images/signup-img.png",
        tag: "Flagship",
        rooms: 24,
        rating: "4.9",
        hotelId: 1,
      },
      {
        name: "Sunshine Hotel",
        location: "Cebu City, PH",
        img: "/images/hero-bg-img.png",
        tag: "Premium",
        rooms: 18,
        rating: "4.7",
        hotelId: 12,
      },
      {
        name: "Innova Grand Suites",
        location: "Davao, PH",
        img: "/images/herobg.jpg",
        tag: "Luxury",
        rooms: 32,
        rating: "4.8",
        hotelId: 2,
      },
    ].map((hotel, idx) => (
      <motion.article
        key={idx}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
        viewport={{ once: true }}
        className="group bg-white/95 dark:bg-[#14130f] border border-[#e6ddca] dark:border-[#bf9b30]/15 rounded-2xl overflow-hidden shadow-[0_24px_46px_rgba(191,155,48,0.15)] dark:shadow-xl hover:border-[#bf9b30]/40 transition-all duration-500"
      >
        <div className="relative h-48 overflow-hidden">
          <img
            src={hotel.img}
            alt={hotel.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f0e8d5] dark:from-[#0d0c0a] via-transparent to-transparent" />
          <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-[#bf9b30]/15 text-[#bf9b30] border border-[#bf9b30]/30">
            {hotel.tag}
          </span>
        </div>
        <div className="p-5">
          <h3 className="text-xl font-black tracking-tight text-[#1a160d] dark:text-white mb-1 group-hover:text-[#bf9b30] transition-colors">
            {hotel.name}
          </h3>
          <p className="text-[11px] text-[#766b59] dark:text-gray-400 flex items-center gap-1 mb-4">
            <MapPin size={11} className="text-[#bf9b30]" /> {hotel.location}
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-[#bf9b30]/15">
            <div className="flex gap-4">
              <div>
                <p className="text-base font-black text-[#bf9b30]">{hotel.rooms}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#857a67] dark:text-gray-500">Rooms</p>
              </div>
              <div>
                <p className="text-base font-black text-[#bf9b30]">{hotel.rating}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#857a67] dark:text-gray-500">Rating</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/vision-suites?hotel_id=${hotel.hotelId}`)}
              className="px-4 py-1.5 rounded-lg bg-[#bf9b30] text-[#0d0c0a] text-[9px] font-black uppercase tracking-widest hover:bg-[#d8b454] transition-all"
            >
              View Hotel
            </button>
          </div>
        </div>
      </motion.article>
    ))}
  </div>
</section>

{/* --- PROMOTIONS SECTION --- */}
<section id="promotions" className="relative pt-10 pb-20 px-6 max-w-7xl mx-auto scroll-mt-24">
  <div className="mb-12">
    <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#bf9b30] mb-2"></p>
    <h2 className="text-5xl md:text-6xl font-black text-[#1a160d] dark:text-white uppercase tracking-tighter leading-none">
      Current <span className="font-serif italic font-light text-[#bf9b30] normal-case tracking-normal">Promotions</span>
    </h2>
    <p className="text-[#7a6f5e] dark:text-gray-400 text-xs mt-4 max-w-md font-light leading-relaxed">
      Personalized deals crafted by our AI system based on your preferences and stay history.
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {promotionCards.map((offer, idx) => (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
        viewport={{ once: true }}
        className="relative group bg-white/95 dark:bg-[#14130f] border border-[#e7dec9] dark:border-[#bf9b30]/10 rounded-2xl p-8 flex flex-col h-full hover:border-[#bf9b30]/40 transition-all duration-500 overflow-hidden shadow-[0_22px_42px_rgba(191,155,48,0.13)] dark:shadow-none"
      >
        {/* Subtle Glow Effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#bf9b30]/5 blur-[80px] group-hover:bg-[#bf9b30]/10 transition-all" />

        {/* Icon & Badge */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#efe7d5] dark:bg-[#22211c] flex items-center justify-center text-lg border border-[#e3d9c4] dark:border-white/5 shadow-inner">
            {offer.icon}
          </div>
          <span className="w-fit px-3 py-1 rounded-full border border-[#bf9b30]/30 bg-[#bf9b30]/5 text-[9px] font-black text-[#bf9b30] uppercase tracking-widest">
            {offer.badge}
          </span>
        </div>

        {/* Content */}
        <div className="flex-grow">
          <h3 className="text-xl font-black text-[#1a160d] dark:text-white uppercase tracking-tight mb-3 group-hover:text-[#bf9b30] transition-colors">
            {offer.title}
          </h3>
          <p className="text-[11px] text-[#766b59] dark:text-gray-500 font-light leading-relaxed mb-8">
            {offer.desc}
          </p>
        </div>

        {/* Promo Value */}
        <div className="mb-8">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-[#bf9b30] tracking-tighter">{offer.promo}</span>
            <span className="text-[10px] font-bold text-[#8b806d] dark:text-gray-400 uppercase tracking-widest">{offer.sub}</span>
          </div>
          <p className="text-[9px] text-[#877c68] dark:text-gray-600 mt-2 flex items-center gap-1">
              {offer.expiry}
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handlePromotionAccess}
          className="w-full py-3 bg-[#bf9b30] text-[#0d0c0a] text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-[#d4ac37] active:scale-[0.98] transition-all shadow-lg shadow-[#bf9b30]/10"
        >
          {sessionUser?.id ? "Open Privileged Offer" : "Sign In to Claim"}
        </button>
      </motion.div>
    ))}
  </div>
</section>

{/* --- AI CONCIERGE SECTION --- */}
<section id="ai-concierge" className="relative pt-10 pb-20 px-6 max-w-7xl mx-auto scroll-mt-24">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
    
    {/* LEFT SIDE: Heading & Features */}
    <motion.div 
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#bf9b30] mb-2">Powered by Rasa AI</p>
      <h2 className="text-5xl md:text-6xl font-black text-[#1a160d] dark:text-white uppercase tracking-tighter leading-none mb-6">
        AI <span className="font-serif italic font-light text-[#bf9b30] normal-case tracking-normal">Guest Assistant</span>
      </h2>
      <p className="text-[#7a6f5d] dark:text-gray-400 text-sm font-light leading-relaxed max-w-md mb-10">
        Our intelligent assistant is available 24/7 to help with bookings, recommendations, and any inquiry you may have.
      </p>

      {/* Features List */}
      <div className="space-y-4">
        {[
          { title: "Smart Room Recommendations", desc: "AI analyzes your preferences and history to suggest the perfect room.", icon: "AI" },
          { title: "Interactive Hotel Map", desc: "Explore hotel grounds and nearby attractions via OpenStreetMap.", icon: "MAP" },
          { title: "Virtual 360 Room Tours", desc: "Experience any room before booking with immersive virtual tours.", icon: "360" },
          { title: "Personalized Notifications", desc: "Receive alerts for booking confirmations, promos, and stay updates.", icon: "AL" }
        ].map((feat, i) => (
          <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-[#e8ddc8] dark:border-white/5 bg-white/95 dark:bg-[#14130f] hover:border-[#bf9b30]/30 transition-all group shadow-[0_14px_30px_rgba(191,155,48,0.11)] dark:shadow-none">
            <div className="w-10 h-10 rounded-lg bg-[#efe7d5] dark:bg-[#1a1915] flex items-center justify-center text-lg border border-[#e5dbc5] dark:border-white/5 shadow-inner group-hover:bg-[#bf9b30]/10 transition-colors">
              {feat.icon}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1a160d] dark:text-white uppercase tracking-wide">{feat.title}</h4>
              <p className="text-[11px] text-[#786d5b] dark:text-gray-500 font-light mt-0.5">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
    {/* RIGHT SIDE: Terms Details */}
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="relative bg-white/95 dark:bg-[#14130f] rounded-3xl border border-[#e6dcc7] dark:border-[#bf9b30]/20 shadow-[0_25px_46px_rgba(191,155,48,0.15)] dark:shadow-2xl overflow-hidden p-8 md:p-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,155,48,0.14),transparent_48%)]" />
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-[#bf9b30]/15 border border-[#bf9b30]/30 flex items-center justify-center mb-6">
          <span className="text-2xl">AI</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#bf9b30] mb-2">
          AI Concierge
        </p>
        <h3 className="text-3xl md:text-4xl font-black text-[#1a160d] dark:text-white uppercase tracking-tight leading-tight">
          View Service <span className="text-[#bf9b30]">Details</span>
        </h3>
        <p className="mt-4 text-sm text-[#6f6452] dark:text-gray-400 leading-relaxed">
          Chat is now handled by the floating AI Assisted widget. For policies, usage terms, and service coverage, open Terms of Service.
        </p>
        <button
          type="button"
          onClick={() => navigate("/terms-of-service")}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#bf9b30] px-7 py-3 text-[10px] font-black uppercase tracking-[0.26em] text-[#0d0c0a] hover:bg-[#d8b454] transition-all"
        >
          View Details
        </button>
        <div className="mt-6 border-t border-[#e8decb] dark:border-white/10 pt-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#807460] dark:text-gray-500 font-bold">
            Ai Concierge
          </p>
          <p className="text-xs text-[#6f6452] dark:text-gray-400 mt-1"></p>
        </div>
      </div>
    </motion.div>

  </div>
</section>

{/* --- GUEST REVIEWS SECTION --- */}
<section id="guest-reviews" className="relative pt-10 pb-20 px-6 max-w-7xl mx-auto overflow-hidden">
  <GuestReviewsSection sessionUser={sessionUser} />
</section>
    </main>
  );
}


