import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  BedDouble,
  CalendarDays,
  Hotel,
  MapPin,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Marzipano from "marzipano";
import resolveImg from "../../utils/resolveImg";
import NeighborhoodMap from "../../components/NeighborhoodMap";
import { extractCustomerSession } from "../../customer/customerHelpers";

const php = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const friendlyDate = (value) => {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

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
  const PAGE_SIZE = 6;
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionUser, setSessionUser] = useState(null);

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
  const [selectedRoomType, setSelectedRoomType] = useState("all");
  const [sortMode, setSortMode] = useState("recommended");
  const [currentPage, setCurrentPage] = useState(1);
  const [landmarks, setLandmarks] = useState([]);
  const [nearbyHotels, setNearbyHotels] = useState([]);
  const [focusedNearbyHotelId, setFocusedNearbyHotelId] = useState(null);

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

      const [hotelRes, roomsRes, lmRes, nearbyHotelsRes] = await Promise.all([
        fetch(`/api/vision/hotel${suffix}`),
        fetch(`/api/vision/rooms${suffix}`),
        fetch(`/api/vision/landmarks${suffix}`),
        fetch(`/api/vision/nearby-hotels${suffix}`),
      ]);

      const hotelPayload = await hotelRes.json().catch(() => ({}));
      const roomsPayload = await roomsRes.json().catch(() => ({}));
      const lmPayload = await lmRes.json().catch(() => ({}));
      const nearbyHotelsPayload = await nearbyHotelsRes.json().catch(() => ({}));

      if (!hotelRes.ok) throw new Error(hotelPayload?.error || `Hotel load failed (HTTP ${hotelRes.status})`);
      if (!roomsRes.ok) throw new Error(roomsPayload?.error || `Rooms load failed (HTTP ${roomsRes.status})`);
      if (!lmRes.ok) throw new Error(lmPayload?.error || `Landmarks load failed (HTTP ${lmRes.status})`);
      if (!nearbyHotelsRes.ok) throw new Error(nearbyHotelsPayload?.error || `Nearby hotels load failed (HTTP ${nearbyHotelsRes.status})`);

      setHotel(hotelPayload.hotel);
      setLocationLabel(hotelPayload.hotel?.locationLabel || "Hotel Location");
      setRooms(roomsPayload.rooms || []);
      setLandmarks(lmPayload.landmarks || []);
      setNearbyHotels(nearbyHotelsPayload.hotels || []);
      setFocusedNearbyHotelId(null);
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
    else setActiveHotelFilter("all");
    setHotelSearch("");
    setSelectedRoomType("all");
    setSortMode("recommended");
    setCurrentPage(1);

    loadVision(query);
  }, [location.search]);

  useEffect(() => {
    setSessionUser(extractCustomerSession());
  }, []);

  useEffect(() => {
    if (!location.hash) return;

    const sectionId = location.hash.replace("#", "");
    const timer = window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      const top = target.getBoundingClientRect().top + window.scrollY - 112;
      window.scrollTo({ top: Math.max(0, top) });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [location.hash, loading]);

  const openTour = async (room) => {
    setTourRoom(room);
    setTourData(null);
    setTourOpen(true);
    setTourLoading(true);
    const fallbackTour = {
      panoramaUrl: room?.imageUrl || (Array.isArray(room?.images) ? room.images[0] : room?.images) || "/images/deluxe-room.jpg",
      initialYaw: 0,
      initialPitch: 0,
      initialFov: Math.PI / 2,
    };
    try {
      const res = await fetch(`/api/vision/rooms/${room.id}/tour`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Tour load failed (HTTP ${res.status}).`);
      setTourData(payload.tour || fallbackTour);
    } catch {
      setTourData(fallbackTour);
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
    const markers = [];

    if (hotel?.location) {
      markers.push({
        id: hotel.id || 1,
        name: hotel.name || "Vision Suites",
        lat: hotel.location.lat,
        lng: hotel.location.lng,
        address: locationLabel,
      });
    }

    (nearbyHotels || []).forEach((hotelItem) => {
      const lat = Number(hotelItem?.lat || 0);
      const lng = Number(hotelItem?.lng || 0);
      if (!lat && !lng) return;
      markers.push({
        id: hotelItem.id,
        name: hotelItem.name || "Hotel",
        lat,
        lng,
        address: hotelItem.address || "",
      });
    });

    return markers.filter((marker, index, list) => list.findIndex((item) => String(item.id) === String(marker.id)) === index);
  }, [hotel, locationLabel, nearbyHotels]);

  const computedNearbyHotels = useMemo(() => {
    const walkingKmh = 4.8;
    return (nearbyHotels || []).map((item) => {
      const hasCoords = Number(item?.lat || 0) !== 0 || Number(item?.lng || 0) !== 0;
      if (!hasCoords) {
        return { ...item, km: null, walkMin: null };
      }
      const km = haversineKm(hotelCenter, { lat: Number(item.lat), lng: Number(item.lng) });
      const walkMin = Math.max(1, Math.round((km / walkingKmh) * 60));
      return { ...item, km, walkMin };
    }).sort((a, b) => {
      if (a.km == null && b.km == null) return String(a.name || "").localeCompare(String(b.name || ""));
      if (a.km == null) return 1;
      if (b.km == null) return -1;
      return a.km - b.km;
    });
  }, [hotelCenter, nearbyHotels]);

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

  const handleNearbyHotelFocus = (hotelItem) => {
    const lat = Number(hotelItem?.lat || 0);
    const lng = Number(hotelItem?.lng || 0);
    if (!lat && !lng) return;
    setFocusedNearbyHotelId(String(hotelItem.id));
  };

  const hotelFilterOptions = useMemo(() => {
    const map = new Map();
    (rooms || []).forEach((room) => {
      if (room.hotelId && room.hotelName) {
        map.set(String(room.hotelId), room.hotelName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rooms]);

  const roomTypeOptions = useMemo(
    () => Array.from(new Set((rooms || []).map((room) => room.type).filter(Boolean))),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const query = hotelSearch.trim().toLowerCase();
    const next = (rooms || []).filter((room) => {
      const matchHotel = activeHotelFilter === "all" || String(room.hotelId) === String(activeHotelFilter);
      const matchRoomType = selectedRoomType === "all" || String(room.type || "").toLowerCase() === String(selectedRoomType).toLowerCase();
      const matchSearch =
        !query ||
        String(room.hotelName || "").toLowerCase().includes(query) ||
        String(room.name || "").toLowerCase().includes(query) ||
        String(room.type || "").toLowerCase().includes(query);

      return matchHotel && matchRoomType && matchSearch;
    });

    if (sortMode === "price-asc") {
      next.sort((a, b) => Number(a.basePricePhp || 0) - Number(b.basePricePhp || 0));
    } else if (sortMode === "price-desc") {
      next.sort((a, b) => Number(b.basePricePhp || 0) - Number(a.basePricePhp || 0));
    } else if (sortMode === "capacity") {
      next.sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0));
    }

    return next;
  }, [rooms, hotelSearch, activeHotelFilter, selectedRoomType, sortMode]);

  const clearCollectionFilters = () => {
    setHotelSearch("");
    setSelectedRoomType("all");
    setSortMode("recommended");
    setActiveHotelFilter(searchContext.hotelId || "all");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [hotelSearch, activeHotelFilter, selectedRoomType, sortMode, searchContext.from, searchContext.to, searchContext.guests, searchContext.view]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRooms.slice(start, start + PAGE_SIZE);
  }, [filteredRooms, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeFilterTags = [
    searchContext.view && searchContext.view !== "All" ? `${searchContext.view} rooms` : null,
    searchContext.guests ? `${searchContext.guests} guest${Number(searchContext.guests) > 1 ? "s" : ""}` : null,
    searchContext.from ? `From ${friendlyDate(searchContext.from)}` : null,
    searchContext.to ? `To ${friendlyDate(searchContext.to)}` : null,
  ].filter(Boolean);

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
<section className="relative min-h-[54vh] flex items-center justify-center overflow-hidden">
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

  <div className="relative z-10 text-center px-4 max-w-5xl w-full py-12">
    <motion.h1
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
     
      className="text-4xl md:text-6xl font-serif tracking-tight leading-tight mb-8 text-white drop-shadow-lg"
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
      <section className="py-12 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-serif mb-3">The Vision Collection</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
            Curated Architectural Excellence for the Modern Traveler
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start relative">
         <aside className="self-start">
          <div className="lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto"></div> 
            <div className="rounded-[2rem] border border-[#e9decb] bg-white/95 p-4 shadow-[0_20px_55px_rgba(15,23,42,0.08)] lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto dark:border-white/10 dark:bg-[#15130f]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#bf9b30]">Filters</p>
                  <h3 className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">Find your fit</h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6efe1] text-[#bf9b30] dark:bg-white/5">
                  <SlidersHorizontal size={17} />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-[#a89b84]">
                    <Search size={14} />
                    Search
                  </span>
                  <input
                    type="text"
                    value={hotelSearch}
                    onChange={(e) => setHotelSearch(e.target.value)}
                    placeholder="Hotel or room name"
                    className="w-full rounded-2xl border border-slate-200 bg-[#fbfaf7] px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-[#bf9b30]/40 focus:ring-2 focus:ring-[#bf9b30]/10 dark:border-white/10 dark:bg-white/5 dark:text-[#e6dece]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-[#a89b84]">
                    <Hotel size={14} />
                    Hotel
                  </span>
                  <select
                    value={activeHotelFilter}
                    onChange={(e) => setActiveHotelFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#fbfaf7] px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-[#bf9b30]/40 focus:ring-2 focus:ring-[#bf9b30]/10 dark:border-white/10 dark:bg-white/5 dark:text-[#e6dece]"
                  >
                    <option value="all">All Hotels</option>
                    {hotelFilterOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-[#a89b84]">
                    <BedDouble size={14} />
                    Room type
                  </span>
                  <select
                    value={selectedRoomType}
                    onChange={(e) => setSelectedRoomType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#fbfaf7] px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-[#bf9b30]/40 focus:ring-2 focus:ring-[#bf9b30]/10 dark:border-white/10 dark:bg-white/5 dark:text-[#e6dece]"
                  >
                    <option value="all">All Room Types</option>
                    {roomTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-[#a89b84]">
                    <ArrowUpDown size={14} />
                    Sort by
                  </span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-[#fbfaf7] px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-[#bf9b30]/40 focus:ring-2 focus:ring-[#bf9b30]/10 dark:border-white/10 dark:bg-white/5 dark:text-[#e6dece]"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="capacity">Capacity</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-[#eee4d1] bg-[#fcfaf5] p-3.5 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bf9b30]">Search summary</p>
                <div className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-[#cfc2aa]">
                  <div className="flex items-start gap-3">
                    <CalendarDays size={16} className="mt-0.5 text-[#bf9b30]" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {searchContext.from ? friendlyDate(searchContext.from) : "Flexible dates"}
                        {searchContext.to ? ` - ${friendlyDate(searchContext.to)}` : ""}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#9e9178]">Stay dates from the home search</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users size={16} className="mt-0.5 text-[#bf9b30]" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {searchContext.guests ? `${searchContext.guests} guest(s)` : "Guest count not specified"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#9e9178]">
                        Refine more using the filters above
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={clearCollectionFilters}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d8c9a4] px-4 py-2.5 text-sm font-black uppercase tracking-[0.22em] text-[#8f732d] transition-all hover:bg-[#f6efdf] dark:border-white/10 dark:text-[#e8dcc1] dark:hover:bg-white/5"
              >
                <RotateCcw size={15} />
                Clear filters
              </button>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-[2rem] border border-[#e9decb] bg-white/95 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#15130f]">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#bf9b30]">Available rooms</p>
                  <h3 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    {filteredRooms.length} stay option{filteredRooms.length === 1 ? "" : "s"} ready to browse
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-[#a89b84]">
                    Showing 6 rooms per page with a cleaner 3-column layout.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeFilterTags.length ? activeFilterTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#ead9b4] bg-[#fcf6e8] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#9b7619] dark:border-white/10 dark:bg-white/5 dark:text-[#e6d7b8]"
                    >
                      {tag}
                    </span>
                  )) : (
                    <span className="rounded-full border border-[#ead9b4] bg-[#fcf6e8] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#9b7619] dark:border-white/10 dark:bg-white/5 dark:text-[#e6d7b8]">
                      Flexible browsing
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginatedRooms.map((room, index) => (
                <motion.article
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className="group overflow-hidden rounded-[1.7rem] border border-[#e7dcc8] bg-white shadow-[0_20px_42px_rgba(15,23,42,0.08)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#14120e]"
                >
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={resolveImg(room.imageUrl)}
                      alt={room.name}
                      onError={(e) => { e.currentTarget.src = "/images/room1.jpg"; }}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#9b7619] shadow-lg">
                      {php(room.basePricePhp)} per night
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#f3d37d]">
                          {room.tagline || "Vision Suite"}
                        </p>
                        <h4 className="mt-1.5 text-xl font-black leading-tight text-white">{room.name}</h4>
                      </div>
                      <div className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                        {room.type || "Suite"}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-[#b9ac93]">
                      <MapPin size={14} className="text-[#bf9b30]" />
                      <span className="truncate">{room.hotelName || locationLabel}</span>
                    </div>

                    <p className="mt-3 text-[13px] leading-relaxed text-slate-600 dark:text-[#cdbfa8]">
                      {room.description || "Designed for comfort with smart hospitality features."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#ead9b4] bg-[#fcf6e8] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#9b7619] dark:border-white/10 dark:bg-white/5 dark:text-[#e6d7b8]">
                        {room.capacity} guests
                      </span>
                      {room.type ? (
                        <span className="rounded-full border border-[#ead9b4] bg-[#fcf6e8] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#9b7619] dark:border-white/10 dark:bg-white/5 dark:text-[#e6d7b8]">
                          {room.type}
                        </span>
                      ) : null}
                      {room.hasVirtualTour ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          360 tour available
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => openTour(room)}
                        className="flex-1 rounded-2xl border border-[#d8c9a4] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8f732d] transition-all hover:bg-[#f6efdf] dark:border-white/10 dark:text-[#e8dcc1] dark:hover:bg-white/5"
                      >
                        {room.hasVirtualTour ? "Explore in 360" : "Open Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/booking?roomId=${room.id}`)}
                        className="flex-1 rounded-2xl bg-[#bf9b30] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-[#aa882a]"
                      >
                        Reserve now
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {!loading && filteredRooms.length > 0 ? (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[1.5rem] border border-[#e9decb] bg-white/90 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-[#15130f] md:flex-row">
                <p className="text-sm font-medium text-slate-500 dark:text-[#b8ab93]">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-full border border-[#dccba3] px-4 py-2 text-sm font-semibold text-[#8f732d] transition-all disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#f6efdf] dark:border-white/10 dark:text-[#e8dcc1] dark:hover:bg-white/5"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 min-w-10 rounded-full px-3 text-sm font-bold transition-all ${
                        currentPage === page
                          ? "bg-[#bf9b30] text-white shadow-md"
                          : "border border-[#e0d3b6] text-[#7b683e] hover:bg-[#faf4e8] dark:border-white/10 dark:text-[#e8dcc1] dark:hover:bg-white/5"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-full border border-[#dccba3] px-4 py-2 text-sm font-semibold text-[#8f732d] transition-all disabled:cursor-not-allowed disabled:opacity-45 hover:bg-[#f6efdf] dark:border-white/10 dark:text-[#e8dcc1] dark:hover:bg-white/5"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}

            {loading && rooms.length === 0 ? (
              <div className="mt-10 text-center text-slate-500 font-semibold">Loading rooms...</div>
            ) : null}
            {!loading && filteredRooms.length === 0 ? (
              <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-[#b5a88e]">
                No rooms found for the current filters.
              </div>
            ) : null}
          </div>
        </div>
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
              {computedNearbyHotels.slice(0, 8).map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  disabled={loc.km == null}
                  onClick={() => handleNearbyHotelFocus(loc)}
                  className={`w-full text-left bg-white dark:bg-[#14130f] border p-4 rounded-2xl shadow-sm transition-all ${
                    String(focusedNearbyHotelId) === String(loc.id)
                      ? "border-[#bf9b30] ring-2 ring-[#bf9b30]/20 shadow-md"
                      : "border-slate-100 dark:border-white/5 hover:border-[#bf9b30]/40"
                  } ${loc.km == null ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{loc.name}</h4>
                      {loc.address && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug line-clamp-2">{loc.address}</p>
                      )}
                      <p className="text-[9px] text-[#bf9b30] font-black uppercase tracking-widest mt-1">Hotel Owner Address</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[#bf9b30]">{loc.km != null ? `${loc.km.toFixed(1)} km` : "No map pin"}</p>
                      <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600">
                        {loc.walkMin != null ? `${loc.walkMin} min walk` : "Address only"}
                      </p>
                      {loc.km != null && (
                        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Show on map
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {!loading && computedNearbyHotels.length === 0 && (
                <p className="text-sm text-slate-400 font-semibold px-1">No nearby hotels registered yet.</p>
              )}
            </div>

            {/* Right: interactive map with search + geolocation */}
            <div className="flex-1 min-w-0">
              <NeighborhoodMap
                hotels={hotelMarkers}
                landmarks={landmarks}
                hotelCenter={hotelCenter}
                focusedHotelId={focusedNearbyHotelId}
                isDarkMode={false}
              />
            </div>
          </div>
        </div>
      </section>

      {!sessionUser?.id ? (
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
      ) : null}
    </div>
  );
}
