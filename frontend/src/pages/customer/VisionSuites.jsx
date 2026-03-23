import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, MessageCircle, X, Send } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Marzipano from "marzipano";
import resolveImg from "../../utils/resolveImg";
import NeighborhoodMap from "../../components/NeighborhoodMap";

const php = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
};

function TourModal({ open, onClose, roomName, tour, loading }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [viewerError, setViewerError] = useState(false);

  // Resolve panorama URL once — handles relative paths, full URLs, and null
  const panoramaUrl = tour?.panoramaUrl ? resolveImg(tour.panoramaUrl, null) : null;

  useEffect(() => {
    if (!open) return;
    if (!containerRef.current) return;
    if (!panoramaUrl) return;

    try {
      setViewerError(false);
      containerRef.current.innerHTML = "";
      const viewer = new Marzipano.Viewer(containerRef.current, { controls: { mouseViewMode: "drag" } });
      viewerRef.current = viewer;

      const source = Marzipano.ImageUrlSource.fromString(panoramaUrl);
      const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
      const limiter = Marzipano.RectilinearView.limit.traditional(2048, (120 * Math.PI) / 180);
      const view = new Marzipano.RectilinearView(
        { yaw: tour.initialYaw ?? 0, pitch: tour.initialPitch ?? 0, fov: tour.initialFov ?? Math.PI / 2 },
        limiter
      );

      const scene = viewer.createScene({ source, geometry, view });
      scene.switchTo({ transitionDuration: 350 });
    } catch (error) {
      console.error("VisionSuites Marzipano init failed:", error);
      setViewerError(true);
    }

    return () => {
      try { viewerRef.current?.destroy?.(); } catch { }
      viewerRef.current = null;
    };
  }, [open, panoramaUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6 bg-gradient-to-b from-black/70 to-transparent">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#bf9b30]">Virtual Tour</p>
          <h3 className="text-2xl font-black text-white">{roomName}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-12 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all"
        >
          <X size={24} />
        </button>
      </div>

      <div className="h-full w-full">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-white/80 text-sm font-semibold">
            Loading 360 tour...
          </div>
        ) : panoramaUrl && !viewerError ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : panoramaUrl ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
            <img
              src={panoramaUrl}
              alt={roomName}
              className="max-h-[70vh] max-w-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <p className="text-white/70 text-sm font-semibold">Preview mode loaded for this tour.</p>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/80 text-sm font-semibold">
            No 360 tour configured for this room yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisionSuites() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [hotel, setHotel] = useState(null);
  const [locationLabel, setLocationLabel] = useState("Hotel Location");
  const [searchContext, setSearchContext] = useState({
    from: "",
    to: "",
    guests: "",
    view: "All",
    hasFilters: false,
  });

  const [rooms, setRooms] = useState([]);
  const [hotelSearch, setHotelSearch] = useState("");
  const [activeHotelFilter, setActiveHotelFilter] = useState("all");
  const [landmarks, setLandmarks] = useState([]);

  const [tourOpen, setTourOpen] = useState(false);
  const [tourRoom, setTourRoom] = useState(null);
  const [tourData, setTourData] = useState(null);
  const [tourLoading, setTourLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      from: "bot",
      text: "Hi. I can help with room availability, tours, and nearby landmarks.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const hotelCenter = useMemo(() => {
    if (!hotel?.location) return { lat: 14.5995, lng: 120.9842 };
    return hotel.location;
  }, [hotel]);

  const loadVision = async (query = {}) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams(query).toString();
      const suffix = qs ? `?${qs}` : "";

      const [hotelRes, roomsRes, lmRes] = await Promise.all([
        fetch(`/api/vision/hotel${suffix}`),
        fetch(`/api/vision/rooms${suffix}`),
        fetch(`/api/vision/landmarks${suffix}`),
      ]);

      const hotelPayload = await hotelRes.json().catch(() => ({}));
      const roomsPayload = await roomsRes.json().catch(() => ({}));
      const lmPayload = await lmRes.json().catch(() => ({}));

      if (!hotelRes.ok) throw new Error(hotelPayload?.error || `Hotel load failed (HTTP ${hotelRes.status})`);
      if (!roomsRes.ok) throw new Error(roomsPayload?.error || `Rooms load failed (HTTP ${roomsRes.status})`);
      if (!lmRes.ok) throw new Error(lmPayload?.error || `Landmarks load failed (HTTP ${lmRes.status})`);

      setHotel(hotelPayload.hotel);
      setLocationLabel(hotelPayload.hotel?.locationLabel || "Hotel Location");
      setRooms(roomsPayload.rooms || []);
      setLandmarks(lmPayload.landmarks || []);
    } catch (e) {
      setError(e?.message || "Failed to load Vision Suites.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const from = params.get("from") || params.get("checkIn") || "";
    const to = params.get("to") || params.get("checkOut") || "";
    const guests = params.get("guests") || "";
    const requestedView = params.get("view") || params.get("roomType") || "";
    const hotelId = params.get("hotel_id") || "";

    const query = {};
    if (from) query.from = from;
    if (to) query.to = to;
    if (hotelId) query.hotel_id = hotelId;
    if (requestedView && requestedView.toLowerCase() !== "any") {
      query.view = requestedView;
    }

    setSearchContext({
      from,
      to,
      guests,
      view: query.view || "All",
      hasFilters: Boolean(from || to || guests || query.view || hotelId),
      hotelId,
    });
    if (hotelId) setActiveHotelFilter(hotelId);

    loadVision(query);
  }, [location.search]);

  const openTour = async (room) => {
    setTourRoom(room);
    setTourData(null);
    setTourOpen(true);
    setTourLoading(true);
    try {
      const res = await fetch(`/api/vision/rooms/${room.id}/tour`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Tour load failed (HTTP ${res.status}).`);
      setTourData(payload.tour || null);
    } catch {
      setTourData(null);
    } finally {
      setTourLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatMessages((prev) => [...prev, { id: `u-${Date.now()}`, from: "user", text: message }]);
    setChatInput("");

    try {
      setChatLoading(true);
      const response = await fetch("/api/chatbot/rasa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "vision-suites", message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Assistant unavailable.");

      const replies = Array.isArray(payload.messages) ? payload.messages : [];
      setChatMessages((prev) => [
        ...prev,
        ...(replies.length
          ? replies.map((text, index) => ({ id: `b-${Date.now()}-${index}`, from: "bot", text }))
          : [{ id: `b-${Date.now()}`, from: "bot", text: "No reply from assistant." }]),
      ]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { id: `e-${Date.now()}`, from: "bot", text: error.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const hotelMarkers = useMemo(() => {
    if (!hotel?.location) return [];
    return [{
      id: hotel.id || 1,
      name: hotel.name || "Vision Suites",
      lat: hotel.location.lat,
      lng: hotel.location.lng,
      address: locationLabel,
    }];
  }, [hotel, locationLabel]);

  const computedLandmarks = useMemo(() => {
    const walkingKmh = 4.8;
    const drivingKmh = 22;
    return (landmarks || []).map((l) => {
      const km = haversineKm(hotelCenter, { lat: l.lat, lng: l.lng });
      const walkMin = Math.max(1, Math.round((km / walkingKmh) * 60));
      const driveMin = Math.max(1, Math.round((km / drivingKmh) * 60));
      return { ...l, km, walkMin, driveMin };
    });
  }, [hotelCenter, landmarks]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0d0c0a] text-[#1a160d] dark:text-[#e8e2d5] transition-colors duration-300">
      <TourModal open={tourOpen} onClose={() => setTourOpen(false)} roomName={tourRoom?.name} tour={tourData} loading={tourLoading} />

      <button
        type="button"
        onClick={() => setChatOpen((v) => !v)}
        className="fixed right-6 bottom-6 z-[50] h-14 w-14 rounded-full bg-[#bf9b30] text-white shadow-2xl shadow-[#bf9b30]/30 flex items-center justify-center hover:brightness-95"
        title="AI Guest Assistant"
      >
        <MessageCircle size={22} />
      </button>

      {chatOpen ? (
        <div className="fixed right-6 bottom-24 z-[50] w-[320px] rounded-2xl bg-white dark:bg-[#12110d] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-[#d8c8a6]">AI Guest Assistant</p>
            <button type="button" onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-slate-900">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-4 space-y-3 bg-[#fcfaf4] dark:bg-[#14120d]">
            {chatMessages.slice(-6).map((message) => (
              <div key={message.id} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.from === "user" ? "bg-[#1a160d] text-white" : "bg-white dark:bg-[#1a1812] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#d2c7b2]"}`}>
                  {message.text}
                </div>
              </div>
            ))}
            {chatLoading ? (
              <div className="text-xs font-semibold text-slate-400 dark:text-[#9b8f79]">Assistant is typing...</div>
            ) : null}
          </div>
          <div className="p-3 border-t border-slate-100 dark:border-white/10 flex items-center gap-2 bg-white dark:bg-[#12110d]">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleChatSubmit();
                }
              }}
              placeholder="Ask about tours, rates, and landmarks..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#14120d] px-3 py-2 text-sm text-slate-700 dark:text-[#e6dece] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleChatSubmit}
              disabled={!chatInput.trim() || chatLoading}
              className="h-10 w-10 rounded-xl bg-[#1a160d] text-white disabled:opacity-50 flex items-center justify-center hover:bg-[#bf9b30] transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* SECTION 1 */}
<section className="relative h-screen flex items-center justify-center overflow-hidden">
  <div className="absolute inset-0 z-0">
    <img 
      src="/images/vision-lobby.jpg" 
      alt="Refined Living" 
      className="w-full h-full object-cover" 
    />
    <div className="absolute inset-0 bg-black/45" /> 
    <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/80" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.6)_100%)]" />
  </div>

  <div className="relative z-10 text-center px-4 max-w-5xl w-full">
    <motion.h1
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
     
      className="text-5xl md:text-7xl font-serif tracking-tight leading-tight mb-10 text-white drop-shadow-lg"
    >
      Experience the Future of <br />
      <span className="italic text-[#bf9b30] font-light">Refined Living</span>
    </motion.h1>

    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-[#0f0d09]/78 backdrop-blur-xl p-4 rounded-3xl shadow-[0_28px_70px_rgba(0,0,0,0.62)] border border-[#bf9b30]/25 max-w-4xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#bf9b30] mb-1">Vision Suites Location</p>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[#c6b38a] shrink-0" />
            <p className="text-sm font-bold text-[#efe7d5] truncate">{locationLabel}</p>
          </div>
          <p className="mt-2 text-xs text-[#bcae92]">
            {searchContext.hotelId
              ? `Viewing rooms for: ${rooms[0]?.hotelName || 'Selected Hotel'}`
              : searchContext.hasFilters
                ? `Search applied: ${searchContext.view} room(s)${searchContext.guests ? `, ${searchContext.guests} guest(s)` : ""}${searchContext.from ? `, from ${searchContext.from}` : ""}${searchContext.to ? ` to ${searchContext.to}` : ""}.`
                : "Availability search is now in the Home hero for a faster booking flow."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate("/#hero")}
            className="px-6 py-3 rounded-full bg-[#1a160d] text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#bf9b30] transition-all"
          >
            Check Availability
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="px-6 py-3 rounded-full border border-[#bf9b30]/45 text-[#e8d9bb] bg-[#1a160f] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-[#bf9b30] hover:text-[#0d0c0a] transition-all"
          >
            AI Guest Assistant
          </button>
        </div>
      </div>
    </motion.div>

    {error ? (
      <div className="mt-6 max-w-3xl mx-auto rounded-2xl border border-red-200 bg-red-50/90 backdrop-blur-sm px-5 py-4 text-sm text-red-700 font-semibold shadow-lg">
        {error}
      </div>
    ) : null}
  </div>
</section>

      {/* SECTION 2 */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-serif mb-3">The Vision Collection</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
            Curated Architectural Excellence for the Modern Traveler
          </p>
        </div>

        {(() => {
          const hotelMap = {};
          (rooms || []).forEach(r => { if (r.hotelId) hotelMap[r.hotelId] = r.hotelName; });
          const filtered = (rooms || []).filter(r => {
            const matchHotel = activeHotelFilter === 'all' || String(r.hotelId) === String(activeHotelFilter);
            const q = hotelSearch.trim().toLowerCase();
            const matchSearch = !q || (r.hotelName || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q);
            return matchHotel && matchSearch;
          });
          return (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-8 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveHotelFilter('all')}
                    className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                      activeHotelFilter === 'all'
                        ? 'bg-[#bf9b30] text-white shadow-md'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#d2c7b2] hover:bg-[#bf9b30]/20'
                    }`}
                  >
                    All Hotels
                  </button>
                  {Object.entries(hotelMap).map(([id, name]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveHotelFilter(id)}
                      className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                        String(activeHotelFilter) === String(id)
                          ? 'bg-[#bf9b30] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#d2c7b2] hover:bg-[#bf9b30]/20'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={hotelSearch}
                  onChange={e => setHotelSearch(e.target.value)}
                  placeholder="Search hotel or room..."
                  className="w-full sm:w-64 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-2 text-sm text-slate-700 dark:text-[#e6dece] focus:outline-none focus:ring-2 focus:ring-[#bf9b30]/40"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {filtered.map((room) => (
                  <motion.div
                    key={room.id}
                    whileHover={{ y: -10 }}
                    className="group relative aspect-[4/5] rounded-[32px] overflow-hidden shadow-xl bg-slate-100"
                  >
                    <img
                      src={resolveImg(room.imageUrl)}
                      alt={room.name}
                      onError={(e) => { e.currentTarget.src = '/images/room1.jpg'; }}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-7 left-7 right-7 text-white">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#bf9b30] mb-1">{room.tagline || "Vision Suite"}</p>
                      <h3 className="text-2xl font-serif mb-1">{room.name}</h3>
                      <p className="text-[10px] text-[#bf9b30]/80 font-bold uppercase tracking-wider mb-2">{room.hotelName}</p>
                      <p className="text-xs text-white/75 font-semibold mb-5">
                        {room.capacity} guests · from <span className="text-white font-black">{php(room.basePricePhp)}</span>/night
                      </p>
                      <button
                        type="button"
                        onClick={() => openTour(room)}
                        className="w-full py-4 border border-white/30 backdrop-blur-md rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                      >
                        Explore in 360
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {loading && rooms.length === 0 && <div className="mt-10 text-center text-slate-500 font-semibold">Loading rooms...</div>}
              {!loading && filtered.length === 0 && <div className="mt-10 text-center text-slate-500 font-semibold">No rooms found.</div>}
            </>
          );
        })()}
      </section>

      {/* SECTION 3 — Neighborhood Discovery */}
      <section id="map" className="py-20 px-6 bg-[#F8F9FA] dark:bg-[#0d0c0a]">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#bf9b30] mb-2">Explore the Area</p>
              <h2 className="text-4xl font-serif text-slate-900 dark:text-white">Neighborhood Discovery</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-md leading-relaxed">
                Search any place, or turn on your location to instantly find the nearest hotel to you.
              </p>
            </div>
          </div>

          {/* Two-column layout: landmark list + map */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* Left: nearby hotels list */}
            <div className="w-full lg:w-[300px] shrink-0 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 px-1">Nearby Hotels</p>
              {computedLandmarks.slice(0, 8).map((loc) => (
                <div
                  key={loc.id}
                  className="bg-white dark:bg-[#14130f] border border-slate-100 dark:border-white/5 p-4 rounded-2xl shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{loc.name}</h4>
                      {loc.address && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug line-clamp-2">{loc.address}</p>
                      )}
                      <p className="text-[9px] text-[#bf9b30] font-black uppercase tracking-widest mt-1">{loc.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[#bf9b30]">{loc.km.toFixed(1)} km</p>
                      <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600">{loc.walkMin} min walk</p>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && computedLandmarks.length === 0 && (
                <p className="text-sm text-slate-400 font-semibold px-1">No hotels registered yet.</p>
              )}
            </div>

            {/* Right: interactive map with search + geolocation */}
            <div className="flex-1 min-w-0">
              <NeighborhoodMap
                hotels={hotelMarkers}
                landmarks={landmarks}
                hotelCenter={hotelCenter}
                isDarkMode={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Hook */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="rounded-[36px] border border-slate-200 bg-white p-10 md:p-14 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#bf9b30] mb-3">Unlock More</p>
              <h3 className="text-4xl font-serif text-slate-900">Join Innova-HMS to Unlock Full Features</h3>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Personalized AI recommendations, loyalty points, and exclusive route guides are available for registered users.
              </p>
              <div className="mt-8 flex gap-3">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-[#bf9b30] text-white font-black uppercase text-[11px] tracking-[0.25em] hover:brightness-95"
                >
                  Create Account
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-slate-200 bg-white text-slate-800 font-black uppercase text-[11px] tracking-[0.25em] hover:bg-slate-50"
                >
                  Login
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black text-slate-900">AI Recommendations</p>
                <p className="text-sm text-slate-600 mt-1 blur-[2px] select-none">Tailored rooms based on your preferences.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black text-slate-900">Loyalty Points Preview</p>
                <p className="text-sm text-slate-600 mt-1 blur-[2px] select-none">Book this and earn 500 Innova Points.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black text-slate-900">Exclusive Route Guide</p>
                <p className="text-sm text-slate-600 mt-1 blur-[2px] select-none">Unlock custom travel routes and shuttle tracking.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
