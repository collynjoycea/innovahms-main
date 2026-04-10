import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Users,
  Wifi,
  Waves,
  Utensils,
  CalendarDays,
  Star,
  X,
  ScanEye,
} from "lucide-react";
import Marzipano from "marzipano";
import resolveImg from "../utils/resolveImg";

const FALLBACKS = [
  "/images/deluxe-room.jpg",
  "/images/single-room.jpg",
  "/images/standard-room.jpg",
  "/images/ocean-suite.jpg",
];

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((i) => i.trim()).filter(Boolean);
  return [];
};

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);
  const [reviews, setReviews] = useState([]);

  // 360 tour state
  const [tourOpen, setTourOpen] = useState(false);
  const [tourLoading, setTourLoading] = useState(false);
  const [tourData, setTourData] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [tourNotice, setTourNotice] = useState("");
  const panoRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    setImgError(false);

    fetch("/api/rooms")
      .then((r) => r.json())
      .then((payload) => {
        if (!mounted) return;
        const rooms = Array.isArray(payload?.rooms) ? payload.rooms : Array.isArray(payload) ? payload : [];
        const found = rooms.find((item) => String(item.id) === String(id));
        if (!found) throw new Error("Room not found.");
        setRoom(found);
      })
      .catch((err) => { if (mounted) setError(err?.message || "Unable to load room."); })
      .finally(() => { if (mounted) setLoading(false); });

    fetch("/api/reviews")
      .then((r) => r.json())
      .then((data) => { if (mounted) setReviews(data.reviews || []); })
      .catch(() => {});

    return () => { mounted = false; };
  }, [id]);

  const amenities = useMemo(() => {
    const parsed = toList(room?.amenities).map((item) => String(item).toLowerCase());
    return {
      wifi: parsed.some((item) => item.includes("wifi")),
      pool: parsed.some((item) => item.includes("pool")),
      dining: parsed.some((item) => item.includes("dining") || item.includes("breakfast")),
      list: parsed.length ? parsed : ["smart controls", "premium comfort", "24/7 support"],
    };
  }, [room]);

  // Single image for this room only — first image or fallback
  const roomImg = useMemo(() => {
    const raw = Array.isArray(room?.images) ? room.images.filter(Boolean) : [];
    const first = raw[0] || room?.imageUrl || room?.image_url || "";
    return first ? resolveImg(first) : FALLBACKS[0];
  }, [room]);

  const currentImg = imgError ? FALLBACKS[0] : roomImg;

  const roomReviews = useMemo(() => {
    if (!room || !reviews.length) return [];
    const roomName = room.roomName || room.name || "";
    const hotelName = room.location_description || "";
    return reviews.filter((rev) => {
      if (rev.roomId && rev.roomId === room.id) return true;
      if (rev.roomId == null) {
        return rev.roomName?.toLowerCase().includes(roomName.toLowerCase()) ||
               rev.hotelName?.toLowerCase().includes(hotelName.toLowerCase()) ||
               rev.roomName?.toLowerCase().includes(hotelName.toLowerCase());
      }
      return false;
    });
  }, [room, reviews]);

  // --- 360 Tour handlers ---
  const openTour = async () => {
    setTourOpen(true);
    setTourActive(false);
    setTourData(null);
    setTourNotice("");
    setTourLoading(true);
    try {
      const res = await fetch(`/api/rooms/${id}/tour`);
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.tour) {
        setTourData(payload.tour);
      } else {
        setTourNotice("No 360° tour configured for this room yet. Showing preview.");
      }
    } catch {
      setTourNotice("Could not load tour data.");
    } finally {
      setTourLoading(false);
    }
  };

  const closeTour = () => {
    setTourOpen(false);
    setTourActive(false);
    try { viewerRef.current?.destroy?.(); } catch {}
    viewerRef.current = null;
  };

  useEffect(() => {
    if (!tourActive || !tourData || !panoRef.current) return;
    try {
      panoRef.current.innerHTML = "";
      const viewer = new Marzipano.Viewer(panoRef.current, { controls: { mouseViewMode: "drag" } });
      viewerRef.current = viewer;
      const source = Marzipano.ImageUrlSource.fromString(tourData.panoramaUrl);
      const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
      const limiter = Marzipano.RectilinearView.limit.traditional(2048, (120 * Math.PI) / 180);
      const view = new Marzipano.RectilinearView(
        { yaw: Number(tourData.initialYaw || 0), pitch: Number(tourData.initialPitch || 0), fov: Number(tourData.initialFov || Math.PI / 2) },
        limiter
      );
      viewer.createScene({ source, geometry, view, pinFirstLevel: true }).switchTo();
    } catch {
      setTourNotice("Unable to initialize 360° viewer.");
      setTourActive(false);
    }
    return () => {
      try { viewerRef.current?.destroy?.(); } catch {}
      viewerRef.current = null;
    };
  }, [tourActive, tourData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#bf9b30] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-zinc-900 px-6 py-24 text-center">
        <p className="text-lg font-black text-slate-800 dark:text-zinc-100">{error || "Room unavailable."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-xs font-black uppercase tracking-widest"
        >
          Back to Home
        </button>
      </main>
    );
  }

  const guestCount = Number(room.maxAdults || 0) + Number(room.maxChildren || 0) || 2;
  const price = Number(room.base_price_php || room.price_per_night || room.price || 0);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      <section className="max-w-7xl mx-auto px-6 py-10">
        <nav className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-[#bf9b30] text-xs font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-slate-300 dark:text-zinc-600">/</span>
          <Link
            to="/"
            className="text-xs font-bold text-slate-400 dark:text-zinc-500 hover:text-[#bf9b30] transition-colors uppercase tracking-widest"
          >
            Home
          </Link>
          <span className="text-slate-300 dark:text-zinc-600">/</span>
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest truncate max-w-[200px]">
            {room.roomName || room.name || "Room Detail"}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SINGLE ROOM IMAGE */}
          <div>
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-xl bg-slate-100 dark:bg-zinc-800 h-[420px]">
              <img
                src={currentImg}
                alt={room.roomName || "Room"}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
              <button
                onClick={openTour}
                className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 hover:bg-[#bf9b30] hover:text-[#0d0c0a] text-white backdrop-blur-sm rounded-full px-3 py-1.5 transition-colors"
              >
                <ScanEye size={13} />
                <span className="text-[10px] font-black uppercase tracking-widest">360° Tour</span>
              </button>
            </div>
          </div>

          {/* ROOM INFO */}
          <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-3xl p-8 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#bf9b30] mb-3">
              {String(room.status || "AVAILABLE").toUpperCase()} - {room.roomType || "Suite"}
            </p>
            <h1 className="text-4xl font-black tracking-tight mb-3">{room.roomName || room.name || "Innova Room"}</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-300 leading-relaxed mb-6">
              {room.description || `${room.roomType || "Premium"} room crafted for smart hospitality and elevated guest comfort.`}
            </p>

            <div className="space-y-3 mb-8">
              <p className="text-sm flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <MapPin size={16} className="text-[#bf9b30] shrink-0" />
                {room.location_description || "Innova Smart Hotel"}
              </p>
              <p className="text-sm flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <Users size={16} className="text-[#bf9b30] shrink-0" />
                Up to {Math.max(guestCount, 1)} guests
              </p>
              <p className="text-sm flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <CalendarDays size={16} className="text-[#bf9b30] shrink-0" />
                Flexible stay dates available
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: <Wifi size={16} />, label: "WiFi", active: amenities.wifi },
                { icon: <Waves size={16} />, label: "Pool", active: amenities.pool },
                { icon: <Utensils size={16} />, label: "Dining", active: amenities.dining },
              ].map(({ icon, label, active }) => (
                <div key={label} className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3 text-center">
                  <div className={`mx-auto mb-2 flex justify-center ${active ? "text-[#bf9b30]" : "text-slate-300 dark:text-zinc-600"}`}>
                    {icon}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-400 mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {amenities.list.map((item, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-700 text-[11px] text-slate-600 dark:text-zinc-300 capitalize"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-slate-200 dark:border-zinc-700">
              <div>
                <p className="text-3xl font-black text-[#bf9b30]">PHP {price.toLocaleString()}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">per night</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={openTour}
                  className="px-5 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  <ScanEye size={14} /> 360° Tour
                </button>
                <button
                  onClick={() => navigate(`/booking?roomId=${room.id}`)}
                  className="px-6 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-xs font-black uppercase tracking-widest hover:bg-[#d8b454] transition-colors shadow-lg shadow-[#bf9b30]/20"
                >
                  Reserve This Room
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 360 TOUR MODAL */}
      {tourOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[#bf9b30] text-[10px] font-black uppercase tracking-widest">360° Virtual Tour</p>
                <h3 className="text-white text-xl font-black">{room.roomName || room.name}</h3>
              </div>
              <button
                onClick={closeTour}
                className="h-12 w-12 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-[#bf9b30] hover:text-[#0d0c0a] flex items-center justify-center transition-all"
                aria-label="Close tour"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10" style={{ height: "60vh" }}>
              <div ref={panoRef} className="absolute inset-0" />

              {tourLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
                  <div className="w-8 h-8 border-2 border-[#bf9b30] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!tourLoading && !tourData && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-900 text-center px-6">
                  <ScanEye size={40} className="text-white/20" />
                  <p className="text-white/60 text-sm font-bold">No 360° tour configured for this room yet.</p>
                  <p className="text-white/30 text-xs">{tourNotice}</p>
                </div>
              )}

              {!tourLoading && tourData && !tourActive && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/60">
                  <ScanEye size={36} className="text-[#bf9b30]" />
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest">360° panorama ready</p>
                  <button
                    onClick={() => setTourActive(true)}
                    className="px-8 py-4 rounded-full bg-[#bf9b30] text-[#0d0c0a] text-sm font-black uppercase tracking-widest hover:bg-[#d8b454] transition-colors shadow-2xl"
                  >
                    Start 360°
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={closeTour}
                className="px-5 py-3 rounded-xl border border-white/20 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { closeTour(); navigate(`/booking?roomId=${room.id}`); }}
                className="px-5 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-xs font-black uppercase tracking-widest hover:bg-[#d8b454] transition-colors"
              >
                Reserve This Room
              </button>
              <button
                onClick={() => { if (tourData) setTourActive((active) => !active); }}
                disabled={!tourData}
                className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${tourData ? (tourActive ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20") : "bg-white/10 text-white/40 cursor-not-allowed border border-white/20"}`}
              >
                {tourActive ? "Close 360" : "Start 360"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEWS SECTION */}
      {roomReviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#bf9b30] mb-2">Guest Voices</p>
            <h2 className="text-5xl md:text-6xl font-black text-[#1a160d] dark:text-white uppercase tracking-tighter leading-none">
              Guest <span className="font-serif italic font-light text-[#bf9b30] normal-case tracking-normal">Reviews</span>
            </h2>
            <p className="text-[#7a6f5d] dark:text-gray-400 text-xs mt-4 max-w-md font-light leading-relaxed">
              What guests say about this room.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {roomReviews.slice(0, 6).map((rev) => (
              <div key={rev.id} className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-6 rounded-2xl hover:border-[#bf9b30]/20 transition-all group shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#bf9b30]/10 flex items-center justify-center font-black text-[#bf9b30] text-sm">
                      {rev.guestName?.[0] || "G"}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-black text-[#1a160d] dark:text-white uppercase tracking-tight">{rev.guestName}</h4>
                      <p className="text-[9px] text-[#7d725f] dark:text-zinc-500 font-bold uppercase">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString("en-PH", { month: "short", year: "numeric" }) : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={10} fill={s <= rev.rating ? "#bf9b30" : "transparent"} className={s <= rev.rating ? "text-[#bf9b30]" : "text-slate-300 dark:text-zinc-600"} />
                    ))}
                  </div>
                </div>
                {rev.title && <p className="text-[12px] font-black text-[#1a160d] dark:text-white mb-1">{rev.title}</p>}
                <p className="text-[11px] text-[#726756] dark:text-zinc-400 font-light leading-relaxed italic">"{rev.comment}"</p>
              </div>
            ))}
          </div>

          {roomReviews.length > 6 && (
            <div className="text-center mt-8">
              <p className="text-sm text-slate-500 dark:text-zinc-400">Showing 6 of {roomReviews.length} reviews</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
