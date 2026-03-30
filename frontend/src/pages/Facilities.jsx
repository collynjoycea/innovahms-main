import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Star, X, Calendar, Users, CheckCircle2, Loader2, Wifi, Waves, Utensils, Dumbbell, Coffee, Shield, Tv, Wind } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import resolveImg from "../utils/resolveImg";

// Static facility cards (always shown)
const STATIC_FACILITIES = [
  {
    id: "wellness-gym",
    title: "Wellness Gym",
    category: "Fitness & Health",
    desc: "AI-integrated health equipment with neural-link tracking for an optimized workout experience.",
    img: "/images/hero-bg-img.png",
    specs: { sqm: "120", guests: "20", price: "Free for guests", rating: "4.8" },
    amenities: ["Cardio Equipment", "Free Weights", "Personal Trainer", "Locker Room"],
    bookable: false,
  },
  {
    id: "dining-hall",
    title: "Dining Hall",
    category: "Culinary",
    desc: "Futuristic culinary experience featuring automated service and world-class fusion cuisine.",
    img: "/images/signup-img.png",
    specs: { sqm: "300", guests: "100", price: "Varies", rating: "5.0" },
    amenities: ["Breakfast Buffet", "À la Carte", "Private Dining", "Bar Service"],
    bookable: false,
  },
];

const AMENITY_ICONS = {
  "wifi": <Wifi size={14} />, "wi-fi": <Wifi size={14} />,
  "pool": <Waves size={14} />, "swimming": <Waves size={14} />,
  "dining": <Utensils size={14} />, "breakfast": <Utensils size={14} />,
  "gym": <Dumbbell size={14} />, "fitness": <Dumbbell size={14} />,
  "coffee": <Coffee size={14} />,
  "safe": <Shield size={14} />,
  "tv": <Tv size={14} />,
  "air": <Wind size={14} />,
};

const getAmenityIcon = (name) => {
  const lower = (name || "").toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <Star size={14} />;
};

function ReserveModal({ facility, onClose }) {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(() => new Date().toISOString().split("T")[0]);
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [guests, setGuests] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const sessionUser = (() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("customerSession");
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p?.user && typeof p.user === "object" ? p.user : p;
    } catch { return null; }
  })();

  const handleReserve = async (e) => {
    e.preventDefault();
    if (!sessionUser?.id) {
      sessionStorage.setItem("returnTo", "/facilities");
      navigate("/login");
      return;
    }
    if (facility.roomId) {
      // Real room — go to booking page
      navigate(`/booking?roomId=${facility.roomId}`);
      return;
    }
    // Static facility — just show confirmation
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-md rounded-[2rem] border border-[#bf9b30]/30 bg-white dark:bg-[#14130f] shadow-[0_32px_80px_rgba(0,0,0,0.4)] overflow-hidden"
      >
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />

        {done ? (
          <div className="p-10 text-center">
            <CheckCircle2 size={52} className="text-[#bf9b30] mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Request Sent!</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
              Your reservation request for <strong>{facility.title}</strong> has been noted. Our team will confirm shortly.
            </p>
            <button onClick={onClose}
              className="px-8 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#bf9b30] mb-1">{facility.category}</p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{facility.title}</h3>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors mt-1">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleReserve} className="p-6 space-y-4">
              {/* Facility image */}
              <div className="rounded-xl overflow-hidden h-36">
                <img src={facility.img} alt={facility.title}
                  onError={e => { e.currentTarget.src = "/images/deluxe-room.jpg"; }}
                  className="w-full h-full object-cover" />
              </div>

              {/* Amenities */}
              {facility.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {facility.amenities.map((a, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#bf9b30]/20 bg-[#bf9b30]/5 text-[9px] font-black text-[#bf9b30] uppercase tracking-widest">
                      {getAmenityIcon(a)} {a}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30] mb-1.5">
                    <Calendar size={10} className="inline mr-1" />Check-In
                  </label>
                  <input type="date" value={checkIn} min={new Date().toISOString().split("T")[0]}
                    onChange={e => setCheckIn(e.target.value)} required
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-3 px-3 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#bf9b30]/60 transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30] mb-1.5">
                    <Calendar size={10} className="inline mr-1" />Check-Out
                  </label>
                  <input type="date" value={checkOut} min={checkIn}
                    onChange={e => setCheckOut(e.target.value)} required
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-3 px-3 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#bf9b30]/60 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30] mb-1.5">
                  <Users size={10} className="inline mr-1" />Guests
                </label>
                <div className="flex items-center gap-0 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 overflow-hidden">
                  <button type="button" onClick={() => setGuests(g => Math.max(1, g - 1))}
                    className="px-4 py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-lg font-black leading-none">−</button>
                  <span className="flex-1 text-center text-sm font-black text-slate-800 dark:text-white">{guests}</span>
                  <button type="button" onClick={() => setGuests(g => Math.min(20, g + 1))}
                    className="px-4 py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-lg font-black leading-none">+</button>
                </div>
              </div>

              {!sessionUser?.id && (
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 text-center">
                  You'll be redirected to sign in before completing your reservation.
                </p>
              )}

              <button type="submit" disabled={submitting}
                className="w-full py-4 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-[0.25em] hover:bg-[#d4ac37] active:scale-[0.98] transition-all shadow-lg shadow-[#bf9b30]/30 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? "Processing..." : sessionUser?.id ? "Reserve Now" : "Sign In to Reserve"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function Facilities() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      if (res.ok) setRooms(data.rooms || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Build facility cards from DB rooms + static facilities
  const dbFacilities = rooms.slice(0, 6).map(room => ({
    id: `room-${room.id}`,
    roomId: room.id,
    title: room.roomName || room.name || room.roomType || "Suite",
    category: room.roomType || "Suite",
    desc: room.description || `${room.roomType || "Premium"} room crafted for smart hospitality and elevated guest comfort.`,
    img: resolveImg(Array.isArray(room.images) && room.images[0] ? room.images[0] : ""),
    specs: {
      sqm: "—",
      guests: String(Math.max((room.maxAdults || 0) + (room.maxChildren || 0), 1)),
      price: `₱${Number(room.price || 0).toLocaleString()}/night`,
      rating: "4.8",
    },
    amenities: Array.isArray(room.amenities) ? room.amenities.filter(Boolean) : [],
    bookable: true,
  }));

  const allFacilities = [...dbFacilities, ...STATIC_FACILITIES];
  const buildTourTarget = (item) => ({
    pathname: `/virtual-tour/${item.roomId || item.id}`,
    state: {
      roomName: item.title,
      previewImage: item.img,
      backToPath: "/facilities",
      backToLabel: "Back to Facilities",
      bookingPath: item.roomId ? `/booking?roomId=${item.roomId}` : "",
    },
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0d0c0a] dark:text-[#e5e1d8] font-sans selection:bg-[#bf9b30]/30 transition-colors duration-300">

      {/* NAV */}
      <nav className="p-6 max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-[#bf9b30] hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Back to Home</span>
        </Link>
        <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
          INNOVA<span className="text-[#bf9b30]">.</span>FACILITIES
        </h1>
        <div className="w-32" /> {/* spacer for centering */}
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-16">
          <p className="font-serif italic text-[#bf9b30] text-2xl mb-2">Discovery</p>
          <h2 className="text-5xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">
            World-Class <span className="text-[#bf9b30]">Amenities</span>
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-3 max-w-lg font-light">
            Browse every room and amenity, then open its 360 preview or reservation options.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-[#bf9b30]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {allFacilities.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => setSelected(item)}
                className="group relative bg-white dark:bg-[#14130f] border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden hover:border-[#bf9b30]/40 transition-all shadow-xl cursor-pointer hover:-translate-y-1 duration-300"
              >
                <div className="h-56 overflow-hidden relative">
                  <img
                    src={item.img}
                    alt={item.title}
                    onError={e => { e.currentTarget.src = "/images/deluxe-room.jpg"; }}
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {item.bookable && (
                    <div className="absolute top-3 right-3 bg-[#bf9b30] text-[#0d0c0a] text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      Reservable
                    </div>
                  )}
                  {/* Reserve overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-[#bf9b30] text-[#0d0c0a] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                      {item.bookable ? "Reserve This" : "Open Details"}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <span className="text-[9px] font-bold text-[#bf9b30] uppercase tracking-[0.2em]">
                    {item.category}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase mt-1 mb-2 group-hover:text-[#bf9b30] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-light leading-relaxed mb-4 line-clamp-2">
                    {item.desc}
                  </p>

                  {/* Amenity tags */}
                  {item.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {item.amenities.slice(0, 4).map((a, j) => (
                        <span key={j} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#bf9b30]/8 border border-[#bf9b30]/15 text-[8px] font-bold text-[#bf9b30] uppercase tracking-widest">
                          {getAmenityIcon(a)} {a}
                        </span>
                      ))}
                      {item.amenities.length > 4 && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                          +{item.amenities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                    {[
                      { label: "SQM",    val: item.specs.sqm },
                      { label: "Guests", val: item.specs.guests },
                      { label: "Price",  val: item.specs.price },
                      { label: "Score",  val: item.specs.rating },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex flex-col">
                        <span className="text-xs font-bold text-[#bf9b30] truncate">{val}</span>
                        <span className="text-[7px] text-slate-400 dark:text-gray-600 uppercase font-black">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <Link
                      to={buildTourTarget(item)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-center py-3 rounded-xl border border-[#bf9b30]/40 text-[#8a6f2a] dark:text-[#e5e1d8] text-[10px] font-black uppercase tracking-widest hover:bg-[#bf9b30]/10 transition-all"
                    >
                      360 Tour
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(item);
                      }}
                      className="flex-1 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[10px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all"
                    >
                      {item.bookable ? "Reserve" : "Request"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* RESERVATION MODAL */}
      <AnimatePresence>
        {selected && (
          <ReserveModal facility={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}
