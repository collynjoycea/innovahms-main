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

  const panoramaUrl = tour?.panoramaUrl ? resolveImg(tour.panoramaUrl, null) : null;

  useEffect(() => {
    if (!open) return;
    if (!containerRef.current) return;
    if (!panoramaUrl) return;

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
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f5d17a]">Virtual Tour</p>
          <h3 className="text-2xl font-black text-white">{roomName}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-12 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-[#bf9b30] hover:text-[#0d0c0a] flex items-center justify-center transition-all"
          aria-label="Close tour"
        >
          <X size={24} />
        </button>
      </div>

      <div className="h-full w-full">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center text-white/80 text-sm font-semibold">
            Loading 360° tour...
          </div>
        ) : tour?.panoramaUrl ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/80 text-sm font-semibold">
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
  const [engineStep, setEngineStep] = useState(1); // 1: Input, 2: Result
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

  // Logic for the Assignment Engine
  const handleAnalyze = () => {
    // Simple logic to find a room that matches pax and budget
    const matches = rooms.filter(r => r.capacity >= guestCount && r.basePricePhp <= budget);
    // Sort by best match (highest capacity within budget)
    const best = matches.sort((a, b) => b.capacity - a.capacity)[0] || rooms[0];
    setRecommendedRoom(best);
    setEngineStep(2);
  };

  const selectedImages = rooms.flatMap((room) => room.imageUrl ? [room.imageUrl] : []).slice(0, 12);

  return (
    <div className="min-h-screen bg-[#0b1229] text-white">
      <TourModal open={tourOpen} onClose={() => setTourOpen(false)} roomName={tourRoom?.name} tour={tourData} loading={tourLoading} />

      {/* Floating Buttons Container */}
      <div className="fixed right-6 bottom-6 z-[50] flex flex-col gap-4">
        {/* Intelligent Engine Search Icon */}
        <button
          type="button"
          onClick={() => {
            setEngineOpen(true);
            setEngineStep(1);
          }}
          className="h-14 w-14 rounded-full bg-[#1e293b] text-[#f5d17a] border border-[#f5d17a]/30 shadow-2xl flex items-center justify-center hover:bg-[#2d3a4f] transition-all"
          title="Find My Perfect Room"
        >
          <Search size={22} />
        </button>

        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          className="h-14 w-14 rounded-full bg-[#bf9b30] text-white shadow-2xl shadow-[#bf9b30]/30 flex items-center justify-center hover:brightness-95"
          title="AI Chatbot"
        >
          <MessageCircle size={22} />
        </button>
      </div>

      {/* Intelligent Assignment Engine Modal */}
      <AnimatePresence>
        {engineOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0f172a] w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden relative"
            >
              <button 
                onClick={() => setEngineOpen(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white"
              >
                <X size={24} />
              </button>

              <div className="p-10">
                {engineStep === 1 ? (
                  <>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="h-12 w-12 rounded-2xl bg-[#f5d17a]/10 flex items-center justify-center text-[#f5d17a]">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white">Find My Perfect Room</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">AI Assignment Engine</p>
                      </div>
                    </div>

                    <div className="space-y-10">
                      {/* Guest Slider */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Customers</label>
                          <span className="text-xl font-black text-[#f5d17a]">{guestCount} Pax</span>
                        </div>
                        <input 
                          type="range" min="1" max="10" value={guestCount}
                          onChange={(e) => setGuestCount(parseInt(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#bf9b30]"
                        />
                      </div>

                      {/* Budget Slider */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Budget</label>
                          <span className="text-xl font-black text-[#f5d17a]">{php(budget)}</span>
                        </div>
                        <input 
                          type="range" min="1000" max="30000" step="500" value={budget}
                          onChange={(e) => setBudget(parseInt(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#bf9b30]"
                        />
                      </div>

                      <button 
                        onClick={handleAnalyze}
                        className="w-full py-5 bg-[#bf9b30] text-[#0b1229] font-black uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-[#bf9b30]/20"
                      >
                        Analyze Matches
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <h2 className="text-3xl font-black text-white italic mb-6">Best Match Found</h2>
                    
                    {recommendedRoom ? (
                      <div className="mb-8 rounded-3xl overflow-hidden border border-white/10 bg-white/5">
                        <img
                          src={resolveImg(recommendedRoom.imageUrl || recommendedRoom.images?.[0])}
                          className="w-full h-48 object-cover"
                          alt="Match"
                          onError={(e) => { e.target.src = '/images/room1.jpg'; }}
                        />
                        <div className="p-6 text-left">
                          <h3 className="text-xl font-black text-white">{recommendedRoom.name}</h3>
                          <p className="text-sm text-[#f5d17a] font-bold">{php(recommendedRoom.basePricePhp)} / night</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-white/40">No perfect match found for your budget.</div>
                    )}

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => reserveNow(recommendedRoom)}
                        className="w-full py-5 bg-white text-[#0b1229] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/90 transition-all"
                      >
                        Book Now
                      </button>
                      <button 
                        onClick={() => setEngineStep(1)}
                        className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {chatOpen ? (
        <div className="fixed right-6 bottom-24 z-[50] w-[340px] rounded-2xl bg-white text-[#1a160d] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-slate-600">AI Guest Assistant</p>
            <button type="button" onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-slate-900">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-4 space-y-3 bg-[#fcfaf4]">
            {chatMessages.slice(-6).map((message) => (
              <div key={message.id} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.from === "user" ? "bg-[#1a160d] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                  {message.text}
                </div>
              </div>
            ))}
            {chatLoading ? (
              <div className="text-xs font-semibold text-slate-400">Assistant is typing...</div>
            ) : null}
          </div>
          <div className="p-3 border-t border-slate-100 flex items-center gap-2">
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
              placeholder={`Hello ${summary?.user?.firstName || "Guest"}, ask me anything...`}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none"
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

      <header className="relative h-screen min-h-[600px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/innova-lobby.jpg"
            alt="Luxury lounge"
            className="w-full h-full object-cover brightness-[0.85]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#0b1229]" />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-center max-w-6xl mx-auto px-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#f5d17a]">Refined Excellence</p>
          <h1 className="mt-4 text-5xl md:text-8xl font-serif font-black tracking-tight leading-none">
            Experience <br />Unrivaled <span className="text-[#f5d17a]">Luxury</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-white/80 leading-relaxed">
            Immerse yourself in a world of elegance and comfort designed for the most discerning guests. Our suites are more than just rooms; they are sanctuaries.
          </p>

          <div className="mt-12 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => {
                document.getElementById("suite-list")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-10 py-4 rounded-full bg-[#bf9b30] text-[#0b1229] font-black uppercase tracking-[0.2em] hover:brightness-110 transition shadow-xl"
            >
              Check Availability
            </button>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="px-10 py-4 rounded-full border border-white/30 bg-white/10 text-white font-black uppercase tracking-[0.2em] hover:bg-white/20 transition backdrop-blur-md"
            >
              View Gallery
            </button>
            <button
              type="button"
              onClick={() => navigate("/rewards")}
              className="px-10 py-4 rounded-full border border-white/30 bg-white/10 text-white font-black uppercase tracking-[0.2em] hover:bg-white/20 transition backdrop-blur-md"
            >
              View Rewards
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        {error ? (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-700 font-semibold">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-white/10 pb-10">
          <div>
            <h2 className="text-4xl font-serif font-black tracking-tight">Explore Categories</h2>
            <p className="mt-2 text-white/60">Browse suites by type and unlock curated perks.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                  category === cat
                    ? "bg-[#bf9b30] text-[#0b1229] scale-105 shadow-lg"
                    : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div id="suite-list" className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading ? (
            <div className="col-span-full rounded-2xl bg-white/5 p-20 text-center text-white/40 border border-white/5">Loading suites…</div>
          ) : rooms.length === 0 ? (
            <div className="col-span-full rounded-2xl bg-white/5 p-20 text-center text-white/40 border border-white/5">No suites found.</div>
          ) : (
            rooms.map((room) => (
              <motion.div
                key={room.id}
                whileHover={{ y: -10 }}
                className="group rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col h-full"
              >
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={resolveImg(room.imageUrl || room.images?.[0])}
                    alt={room.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { e.target.src = '/images/room1.jpg'; }}
                  />
                  <div className="absolute top-5 left-5 rounded-full bg-black/70 px-4 py-2 text-[10px] font-black tracking-widest text-white uppercase backdrop-blur-md">
                    {room.viewPreference || room.type || "Suite"}
                  </div>
                  <button
                    type="button"
                    onClick={() => openTour(room)}
                    className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full bg-[#bf9b30] px-5 py-2.5 text-[10px] font-black text-[#0b1229] uppercase hover:scale-105 transition-transform"
                  >
                    Explore 360
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-white leading-tight">{room.name}</h3>
                      <p className="mt-2 text-sm text-white/50 line-clamp-2">{room.tagline || room.description || "Luxurious comfort."}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#f5d17a]">{php(room.basePricePhp)}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">/ per night</p>
                    </div>
                  </div>

                  <div className="mt-auto pt-8 flex items-center justify-between">
                    <div className="flex gap-2">
                       <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-bold text-white/60">{room.capacity || 0} Guests</span>
                       {room.viewPreference && <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-bold text-white/60">{room.viewPreference}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/hoteldetail/${room.id}`}
                        className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                      >
                        Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => reserveNow(room)}
                        className="text-xs font-black uppercase tracking-widest text-[#bf9b30] hover:text-white transition-colors"
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
              className="fixed inset-0 z-[1000] bg-[#0b1229] overflow-y-auto"
            >
              <div className="sticky top-0 z-20 flex items-center justify-between px-10 py-8 bg-[#0b1229]/95 backdrop-blur-md border-b border-white/10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f5d17a]">Gallery</p>
                  <h3 className="text-3xl font-black text-white italic">Innova Collection</h3>
                </div>
                <button 
                  onClick={() => setGalleryOpen(false)} 
                  className="h-14 w-14 rounded-full bg-white/5 text-white border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="max-w-[1600px] mx-auto p-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {selectedImages.length === 0 ? (
                    <div className="col-span-full text-center text-white/30 py-40">No images available for preview.</div>
                  ) : (
                      selectedImages.map((src, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/5 shadow-2xl"
                        >
                          <img
                            src={resolveImg(src)}
                            alt={`Gallery ${idx + 1}`}
                            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
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
