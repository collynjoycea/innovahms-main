import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MapPin, Star, CalendarDays, Users, Sparkles, ArrowRight } from "lucide-react";
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

const fallbackFeaturedHotels = [
  {
    id: 1,
    name: "Innova Velora Hotel",
    location: "Metro Manila, PH",
    image: "/images/signup-img.png",
    tag: "Flagship",
    rooms: 24,
    description: "Signature city property with a polished building presence and guest-focused stay experience.",
    contactPhone: "",
  },
  {
    id: 12,
    name: "Sunshine Hotel",
    location: "Cebu City, PH",
    image: "/images/hero-bg-img.png",
    tag: "Premium",
    rooms: 18,
    description: "Premium hotel destination designed for fast reservations and modern comfort.",
    contactPhone: "",
  },
  {
    id: 2,
    name: "Innova Grand Suites",
    location: "Davao, PH",
    image: "/images/herobg.jpg",
    tag: "Luxury",
    rooms: 32,
    description: "Luxury-forward hospitality with elevated rooms, service, and booking convenience.",
    contactPhone: "",
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
  const [featuredHotels, setFeaturedHotels] = useState(fallbackFeaturedHotels);
  const [promotionCards, setPromotionCards] = useState(fallbackPromotions);
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
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

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
        const [roomsRes, offersRes, hotelsRes] = await Promise.all([
          fetch("/api/rooms"),
          fetch("/api/guest-offers"),
          fetch("/api/home/hotels"),
        ]);

        if (roomsRes.ok) {
          const roomsPayload = await roomsRes.json();
          const rooms = Array.isArray(roomsPayload?.rooms)
            ? roomsPayload.rooms
            : Array.isArray(roomsPayload)
              ? roomsPayload
              : [];

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

        if (hotelsRes.ok) {
          const hotelsPayload = await hotelsRes.json().catch(() => ({}));
          const hotels = Array.isArray(hotelsPayload?.hotels) ? hotelsPayload.hotels.slice(0, 3) : [];
          if (isMounted && hotels.length > 0) {
            setFeaturedHotels(hotels);
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
    <main className={`relative min-h-screen w-full ${isDark ? "dark" : ""} bg-white dark:bg-[#0d0c0a] font-sans selection:bg-[#bf9b30]/30 overflow-x-hidden text-[#1a160d] dark:text-[#e5e1d8] transition-colors duration-300`}>
      
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
            className="mb-5"
          >
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.44em] text-[#f7e8b2] opacity-90">
              The Evolution of Travel
            </h2>
            <h1 className="mt-4 text-5xl md:text-6xl xl:text-[5.8rem] font-black leading-none tracking-tight text-white drop-shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              INNOVA<span className="text-[#f7d881]">.</span>HMS
            </h1>
          </motion.div>

          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mx-auto mt-2 text-sm leading-relaxed tracking-[0.02em] text-white/90 font-light drop-shadow-md"
            >
              INNOVA-HMS is designed to provide guests with a smarter, faster, and more convenient hotel experience.
              Through our intelligent management platform, explore rooms, make reservations, and manage your sanctuary anywhere in the world.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {[
              "Smart booking",
              "Live availability",
              "Instant confirmation",
            ].map((label) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <Sparkles size={12} className="text-[#f1d27b]" />
                {label}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className={`mt-16 w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/15 bg-white/20 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.24)] transition-all duration-300 ${
              isDark ? "bg-black/70" : "bg-white/10"
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr_0.5fr] gap-3 p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-inner">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8c27d] font-black mb-2">Check-in</p>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white/90">
                      <CalendarDays size={16} className="text-[#f7db8b]" />
                      <span>{heroCheckIn}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8c27d] font-black mb-2">Check-out</p>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white/90">
                      <CalendarDays size={16} className="text-[#f7db8b]" />
                      <span>{heroCheckOut}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-inner">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8c27d] font-black mb-2">Guests</p>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white/90">
                      <Users size={16} className="text-[#f7db8b]" />
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={heroGuests}
                        onChange={(e) => setHeroGuests(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full bg-transparent text-[13px] font-semibold text-white/90 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8c27d] font-black mb-2">Room type</p>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white/90">
                      <Sparkles size={16} className="text-[#f7db8b]" />
                      <select
                        value={heroRoomType}
                        onChange={(e) => setHeroRoomType(e.target.value)}
                        className="w-full bg-transparent text-[13px] font-semibold text-white/90 outline-none"
                      >
                        <option value="Any">Any Room</option>
                        {roomTypeOptions.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleHeroAvailabilitySearch}
                className="flex min-h-[88px] items-center justify-center rounded-[1.5rem] bg-[#f7d881] px-8 py-4 text-[12px] font-black uppercase tracking-[0.24em] text-[#0d0c0a] shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition-all hover:scale-[1.01]"
              >
                Search Rooms
              </button>
            </div>
          </motion.div>
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
    {featuredHotels.slice(0, 3).map((hotel, idx) => (
      <motion.article
        key={hotel.id || idx}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
        viewport={{ once: true }}
        onClick={() => navigate(`/vision-suites?hotel_id=${hotel.id}`)}
        className="group overflow-hidden rounded-[2rem] border border-[#e7dcc4] bg-white shadow-[0_24px_50px_rgba(69,40,10,0.12)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_32px_62px_rgba(191,155,48,0.18)] dark:border-[#3a2b18] dark:bg-[#11100c] dark:shadow-[0_24px_46px_rgba(0,0,0,0.34)] cursor-pointer">
        <div className="relative h-48 overflow-hidden">
          <img
            src={hotel.image}
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
          <p className="text-[#766b59] dark:text-gray-400 text-xs leading-relaxed min-h-[36px]">
            {hotel.description}
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-[#bf9b30]/15">
            <div className="flex gap-4">
              <div>
                <p className="text-base font-black text-[#bf9b30]">{hotel.rooms}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#857a67] dark:text-gray-500">Rooms</p>
              </div>
              <div>
                <p className="text-base font-black text-[#bf9b30]">{hotel.contactPhone || 'Live'}</p>
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#857a67] dark:text-gray-500">Contact</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/vision-suites?hotel_id=${hotel.id}`); }}
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
        className="group overflow-hidden rounded-[1.8rem] border border-[#e9dec6] bg-white/95 shadow-[0_22px_44px_rgba(191,155,48,0.12)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_28px_56px_rgba(191,155,48,0.18)] dark:border-[#3a2b18] dark:bg-[#151310] dark:shadow-[0_24px_48px_rgba(0,0,0,0.35)]"
      >
        <Link to={`/hoteldetail/${hotel.id}`} className="block">
          <div className="relative h-40 overflow-hidden">
            <img
              src={hotel.image}
              alt={hotel.name}
              onError={(e) => { e.currentTarget.src = '/images/deluxe-room.jpg'; }}
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
                Details & 360
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

    </main>
  );
}
