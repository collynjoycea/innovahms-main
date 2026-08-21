import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MessageCircle, X, Search, Sparkles, Send } from "lucide-react";
import Marzipano from "marzipano";
import resolveImg from "../utils/resolveImg";

const php = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

function TourModal({ open, onClose, roomName, tour, loading }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const isInteractive = Boolean(tour?.isInteractive);

  const panoramaUrl = tour?.panoramaUrl ? resolveImg(tour.panoramaUrl, null) : null;
  const previewUrl = tour?.previewUrl ? resolveImg(tour.previewUrl, panoramaUrl) : panoramaUrl;

  useEffect(() => {
    if (!open) return;
    if (!containerRef.current) return;
    if (!isInteractive) return;
    if (!panoramaUrl) return;

    try {
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
    } catch {
      // keep preview mode available when the image is not a valid panorama
    }

    return () => {
      try { viewerRef.current?.destroy?.(); } catch { }
      viewerRef.current = null;
    };
  }, [open, panoramaUrl, isInteractive]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-zinc-950">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6 bg-gradient-to-b from-zinc-950/80 to-transparent">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Virtual Tour</p>
          <h3 className="text-xl font-bold text-white">{roomName}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all"
          aria-label="Close tour"
        >
          <X size={20} />
        </button>
      </div>

      <div className="h-full w-full">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-zinc-400 text-xs font-medium">
            Loading 360° tour...
          </div>
        ) : isInteractive && panoramaUrl ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : previewUrl ? (
          <div className="h-full w-full flex items-center justify-center bg-zinc-950 px-6">
            <img src={previewUrl} alt={roomName} className="max-h-[70vh] max-w-full object-contain" />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-zinc-400 text-xs font-medium">
            No 360° tour configured for this room yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default function InnovaSuites() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [category, setCategory] = useState("All");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [tourOpen, setTourOpen] = useState(false);
  const [tourRoom, setTourRoom] = useState(null);
  const [tourData, setTourData] = useState(null);
  const [tourLoading, setTourLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      from: "bot",
      text: "Hello. Ask me about suites, prices, and virtual tours.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // States for Intelligent Room Assignment Engine
  const [engineOpen, setEngineOpen] = useState(false);
  const [engineStep, setEngineStep] = useState(1);
  const [guestCount, setGuestCount] = useState(1);
  const [budget, setBudget] = useState(5000);
  const [recommendedRoom, setRecommendedRoom] = useState(null);

  const categories = ["All", "Single", "Double", "Suite", "Deluxe"];

  const fetchSummary = async (userId) => {
    try {
      const res = await fetch(`/api/innova/summary/${userId}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Summary failed (HTTP ${res.status})`);
      setSummary(payload);
    } catch (e) {
      // ignore
    }
  };

  const fetchRooms = async (opts = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (opts.view && opts.view !== "All") params.set("view", opts.view);
      if (opts.from) params.set("from", opts.from);
      if (opts.to) params.set("to", opts.to);

      const res = await fetch(`/api/vision/rooms?${params.toString()}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Rooms failed (HTTP ${res.status})`);
      setRooms((payload.rooms || []).map((r) => ({ ...r, usePoints: false })));
    } catch (e) {
      setError(e?.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      navigate("/login", { replace: true });
      return;
    }

    let user = null;
    try {
      user = JSON.parse(raw);
    } catch {
      user = null;
    }

    if (!user?.id) {
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
      return;
    }

    fetchSummary(user.id);
    fetchRooms({ view: category });
  }, [navigate]);

  useEffect(() => {
    fetchRooms({ view: category, from: checkIn, to: checkOut });
  }, [category]);

  const openTour = async (room) => {
    setTourRoom(room);
    setTourData(null);
    setTourOpen(true);
    setTourLoading(true);
    const fallback = {
      panoramaUrl: resolveImg(room.imageUrl || room.images?.[0], '/images/my-room-360.jpg'),
      previewUrl: resolveImg(room.imageUrl || room.images?.[0], '/images/my-room-360.jpg'),
      isInteractive: false,
      initialYaw: 0, initialPitch: 0, initialFov: Math.PI / 2,
    };
    try {
      const res = await fetch(`/api/rooms/${room.id}/tour`);
      const payload = await res.json().catch(() => ({}));
      setTourData(res.ok && payload?.tour ? payload.tour : fallback);
    } catch {
      setTourData(fallback);
    } finally {
      setTourLoading(false);
    }
  };

  const reserveNow = (room) => {
    navigate(`/booking?roomId=${room.id}`);
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
        body: JSON.stringify({
          sender: "innova-suites",
          message,
        }),
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

  const handleAnalyze = () => {
    const matches = rooms.filter(r => r.capacity >= guestCount && r.basePricePhp <= budget);
    const best = matches.sort((a, b) => b.capacity - a.capacity)[0] || rooms[0];
    setRecommendedRoom(best);
    setEngineStep(2);
  };

  const selectedImages = rooms.flatMap((room) => room.imageUrl ? [room.imageUrl] : []).slice(0, 12);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <TourModal open={tourOpen} onClose={() => setTourOpen(false)} roomName={tourRoom?.name} tour={tourData} loading={tourLoading} />

      {/* Floating Buttons */}
      <div className="fixed right-6 bottom-6 z-[50] flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setEngineOpen(true);
            setEngineStep(1);
          }}
          className="h-12 w-12 rounded-2xl bg-zinc-900 border border-emerald-500/30 text-emerald-400 shadow-xl flex items-center justify-center hover:bg-emerald-950/50 transition-all"
          title="Find My Perfect Room"
        >
          <Search size={20} />
        </button>

        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className="h-12 w-12 rounded-2xl bg-emerald-700 text-white shadow-xl shadow-emerald-900/30 flex items-center justify-center hover:bg-emerald-800 transition-all"
          title="AI Chatbot"
        >
          <MessageCircle size={20} />
        </button>
      </div>

      {/* Assignment Engine Modal */}
      <AnimatePresence>
        {engineOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden relative"
            >
              <button 
                onClick={() => setEngineOpen(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="p-8">
                {engineStep === 1 ? (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Find My Perfect Room</h2>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">AI Assignment Engine</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Total Guests</label>
                          <span className="text-sm font-bold text-emerald-400">{guestCount} Pax</span>
                        </div>
                        <input 
                          type="range" min="1" max="10" value={guestCount}
                          onChange={(e) => setGuestCount(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Max Budget</label>
                          <span className="text-sm font-bold text-emerald-400">{php(budget)}</span>
                        </div>
                        <input 
                          type="range" min="1000" max="30000" step="500" value={budget}
                          onChange={(e) => setBudget(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                      </div>

                      <button 
                        onClick={handleAnalyze}
                        className="w-full py-3 bg-emerald-700 text-white font-semibold text-xs rounded-xl hover:bg-emerald-800 transition-all shadow-md shadow-emerald-950/50"
                      >
                        Analyze Matches
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">Recommendation</p>
                    <h2 className="text-2xl font-bold text-white mb-6">Best Match Found</h2>
                    
                    {recommendedRoom ? (
                      <div className="mb-6 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/50">
                        <img
                          src={resolveImg(recommendedRoom.imageUrl || recommendedRoom.images?.[0])}
                          className="w-full h-44 object-cover"
                          alt="Match"
                          onError={(e) => { e.target.src = '/images/room1.jpg'; }}
                        />
                        <div className="p-4 text-left">
                          <h3 className="text-lg font-bold text-white">{recommendedRoom.name}</h3>
                          <p className="text-xs font-semibold text-emerald-400">{php(recommendedRoom.basePricePhp)} / night</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-xs text-zinc-500">No perfect match found for your parameters.</div>
                    )}

                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => reserveNow(recommendedRoom)}
                        className="w-full py-3 bg-emerald-700 text-white font-semibold text-xs rounded-xl hover:bg-emerald-800 transition-all"
                      >
                        Book Now
                      </button>
                      <button 
                        onClick={() => setEngineStep(1)}
                        className="w-full py-2 text-[11px] font-medium text-zinc-400 hover:text-white"
                      >
                        Adjust Search Criteria
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chatbot Window */}
      {chatOpen ? (
        <div className="fixed right-6 bottom-20 z-[50] w-[340px] rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
            <p className="text-xs font-semibold text-emerald-400">AI Guest Assistant</p>
            <button type="button" onClick={() => setChatOpen(false)} className="text-zinc-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-4 space-y-3 bg-zinc-950/60">
            {chatMessages.slice(-6).map((message) => (
              <div key={message.id} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs ${message.from === "user" ? "bg-emerald-700 text-white" : "bg-zinc-800 border border-zinc-700/50 text-zinc-200"}`}>
                  {message.text}
                </div>
              </div>
            ))}
            {chatLoading ? (
              <div className="text-[11px] font-medium text-zinc-500">Assistant is typing...</div>
            ) : null}
          </div>
          <div className="p-3 border-t border-zinc-800 flex items-center gap-2 bg-zinc-900">
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
              placeholder={`Hello ${summary?.user?.firstName || "Guest"}, ask a question...`}
              className="flex-1 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={handleChatSubmit}
              disabled={!chatInput.trim() || chatLoading}
              className="h-8 w-8 rounded-xl bg-emerald-700 text-white disabled:opacity-40 flex items-center justify-center hover:bg-emerald-800 transition-all"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Hero Header */}
      <header className="relative h-[85vh] min-h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/innova-lobby.jpg"
            alt="Luxury lounge"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/30 via-zinc-950/60 to-zinc-950" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-center max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Sparkles size={14} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Refined Excellence</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-3xl leading-tight">
            Experience Unrivaled <span className="text-emerald-400">Comfort & Care</span>
          </h1>
          <p className="mt-4 max-w-xl text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Immerse yourself in a warm, welcoming atmosphere engineered for the most discerning guests. Our suites are tailored sanctuaries built for true rest.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                document.getElementById("suite-list")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition shadow-lg"
            >
              Check Availability
            </button>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="px-6 py-3 rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-200 text-xs font-semibold hover:bg-zinc-800 transition backdrop-blur-md"
            >
              View Gallery
            </button>
            <button
              type="button"
              onClick={() => navigate("/rewards")}
              className="px-6 py-3 rounded-xl border border-zinc-700 bg-zinc-900/60 text-zinc-200 text-xs font-semibold hover:bg-zinc-800 transition backdrop-blur-md"
            >
              View Rewards
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {error ? (
          <div className="mb-8 rounded-xl border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-xs text-rose-400 font-medium">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-zinc-800 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Suite Categories</p>
            <h2 className="mt-1 text-2xl font-bold text-white tracking-tight">Explore Accommodations</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                  category === cat
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div id="suite-list" className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full rounded-2xl bg-zinc-900/40 p-16 text-center text-xs text-zinc-500 border border-zinc-800">Loading suites…</div>
          ) : rooms.length === 0 ? (
            <div className="col-span-full rounded-2xl bg-zinc-900/40 p-16 text-center text-xs text-zinc-500 border border-zinc-800">No suites found.</div>
          ) : (
            rooms.map((room) => (
              <motion.div
                key={room.id}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-md overflow-hidden flex flex-col h-full transition-all"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={resolveImg(room.imageUrl || room.images?.[0])}
                    alt={room.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.target.src = '/images/room1.jpg'; }}
                  />
                  <div className="absolute top-3 left-3 rounded-md bg-zinc-950/80 px-3 py-1 text-[10px] font-semibold text-zinc-300 uppercase tracking-wider backdrop-blur-md">
                    {room.viewPreference || room.type || "Suite"}
                  </div>
                  <button
                    type="button"
                    onClick={() => openTour(room)}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-[10px] font-semibold text-white uppercase hover:bg-emerald-800 transition-colors"
                  >
                    Explore 360
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">{room.name}</h3>
                      <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{room.tagline || room.description || "Luxurious comfort."}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400">{php(room.basePricePhp)}</p>
                      <p className="text-[10px] font-medium text-zinc-500 uppercase">/ night</p>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 flex items-center justify-between border-t border-zinc-800/80">
                    <div className="flex gap-1.5">
                       <span className="rounded-md bg-zinc-800/60 border border-zinc-700/50 px-2.5 py-1 text-[10px] font-medium text-zinc-400">{room.capacity || 0} Guests</span>
                       {room.viewPreference && <span className="rounded-md bg-zinc-800/60 border border-zinc-700/50 px-2.5 py-1 text-[10px] font-medium text-zinc-400">{room.viewPreference}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/hoteldetail/${room.id}`}
                        className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                      >
                        Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => reserveNow(room)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <AnimatePresence>
          {galleryOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-zinc-950 overflow-y-auto"
            >
              <div className="sticky top-0 z-20 flex items-center justify-between px-8 py-6 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Photo Gallery</p>
                  <h3 className="text-2xl font-bold text-white">Innova Suite Collection</h3>
                </div>
                <button 
                  onClick={() => setGalleryOpen(false)} 
                  className="h-10 w-10 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-w-[1400px] mx-auto p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedImages.length === 0 ? (
                    <div className="col-span-full text-center text-zinc-500 py-32 text-xs">No images available for preview.</div>
                  ) : (
                      selectedImages.map((src, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-zinc-800 shadow-md"
                        >
                          <img
                            src={resolveImg(src)}
                            alt={`Gallery ${idx + 1}`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => { e.target.src = '/images/room1.jpg'; }}
                          />
                        </motion.div>
                      ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}