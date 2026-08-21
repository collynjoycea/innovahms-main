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
  ThumbsUp,
  User,
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

// Helper function to mask usernames like Shopee (e.g. "john_doe" -> "j*****e")
const maskUsername = (name) => {
  if (!name) return "g*****t";
  const str = String(name).trim();
  if (str.length <= 2) return str[0] + "*";
  return str[0] + "*".repeat(Math.min(str.length - 2, 5)) + str[str.length - 1];
};

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [helpfulCounts, setHelpfulCounts] = useState({});

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
      if (rev.roomId && String(rev.roomId) === String(room.id)) return true;
      if (rev.roomId == null) {
        return (
          (roomName && rev.roomName?.toLowerCase().includes(roomName.toLowerCase())) ||
          (hotelName && rev.hotelName?.toLowerCase().includes(hotelName.toLowerCase())) ||
          (hotelName && rev.roomName?.toLowerCase().includes(hotelName.toLowerCase()))
        );
      }
      return false;
    });
  }, [room, reviews]);

  // Review Summary Stats
  const reviewStats = useMemo(() => {
    if (!roomReviews.length) return { average: 5.0, count: 0, countsByStar: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    const countsByStar = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    roomReviews.forEach((rev) => {
      const r = Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5)));
      countsByStar[r] = (countsByStar[r] || 0) + 1;
      sum += Number(rev.rating) || 5;
    });
    return {
      average: (sum / roomReviews.length).toFixed(1),
      count: roomReviews.length,
      countsByStar,
    };
  }, [roomReviews]);

  // Filtered reviews based on active chip filter
  const filteredReviews = useMemo(() => {
    if (activeFilter === "All") return roomReviews;
    if (activeFilter.includes("Star")) {
      const targetStar = parseInt(activeFilter);
      return roomReviews.filter((r) => Math.round(Number(r.rating) || 5) === targetStar);
    }
    return roomReviews;
  }, [roomReviews, activeFilter]);

  const toggleHelpful = (revId) => {
    setHelpfulCounts((prev) => ({
      ...prev,
      [revId]: {
        count: (prev[revId]?.count || 0) + (prev[revId]?.active ? -1 : 1),
        active: !prev[revId]?.active,
      },
    }));
  };

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
    if (viewerRef.current) {
      try { viewerRef.current.destroy(); } catch {}
      viewerRef.current = null;
    }
  };

  useEffect(() => {
    if (!tourActive || !tourData || !panoRef.current) return;
    let isCleanedUp = false;
    
    try {
      panoRef.current.innerHTML = "";
      const viewer = new Marzipano.Viewer(panoRef.current, { controls: { mouseViewMode: "drag" } });
      viewerRef.current = viewer;
      
      const source = Marzipano.ImageUrlSource.fromString(tourData.panoramaUrl);
      const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
      const limiter = Marzipano.RectilinearView.limit.traditional(2048, (120 * Math.PI) / 180);
      const view = new Marzipano.RectilinearView(
        { 
          yaw: Number(tourData.initialYaw || 0), 
          pitch: Number(tourData.initialPitch || 0), 
          fov: Number(tourData.initialFov || Math.PI / 2) 
        },
        limiter
      );

      if (!isCleanedUp) {
        viewer.createScene({ source, geometry, view, pinFirstLevel: true }).switchTo();
      }
    } catch {
      setTourNotice("Unable to initialize 360° viewer.");
      setTourActive(false);
    }

    return () => {
      isCleanedUp = true;
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [tourActive, tourData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#1F6F5F] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] px-6 py-24 text-center">
        <p className="text-base font-semibold text-slate-800 dark:text-zinc-100">{error || "Room unavailable."}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-3 rounded-xl bg-[#1F6F5F] hover:bg-[#2FA084] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-lg"
        >
          Back to Home
        </button>
      </main>
    );
  }

  const guestCount = Number(room.maxAdults || 0) + Number(room.maxChildren || 0) || 2;
  const price = Number(room.base_price_php || room.price_per_night || room.price || 0);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0d1412] text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      <section className="max-w-7xl mx-auto px-6 py-8">
        <nav className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-[#1F6F5F] dark:text-[#2FA084] text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-slate-300 dark:text-zinc-700">/</span>
          <Link
            to="/"
            className="text-xs font-medium text-slate-400 dark:text-zinc-500 hover:text-[#1F6F5F] dark:hover:text-[#2FA084] transition-colors"
          >
            Home
          </Link>
          <span className="text-slate-300 dark:text-zinc-700">/</span>
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate max-w-[200px]">
            {room.roomName || room.name || "Room Detail"}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SINGLE ROOM IMAGE */}
          <div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-md bg-slate-100 dark:bg-[#0f1a17] h-[420px]">
              <img
                src={currentImg}
                alt={room.roomName || "Room"}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
              <button
                onClick={openTour}
                className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/70 hover:bg-[#1F6F5F] text-white backdrop-blur-md rounded-full px-4 py-2 transition-all shadow-md"
              >
                <ScanEye size={15} />
                <span className="text-[11px] font-semibold">360° Tour</span>
              </button>
            </div>
          </div>

          {/* ROOM INFO */}
          <div className="bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1F6F5F] dark:text-[#2FA084] mb-2">
              {String(room.status || "AVAILABLE").toUpperCase()} — {room.roomType || "Suite"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight mb-3">{room.roomName || room.name || "Innova Room"}</h1>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed mb-6">
              {room.description || `${room.roomType || "Premium"} room crafted for smart hospitality and elevated guest comfort.`}
            </p>

            <div className="space-y-2.5 mb-6">
              <p className="text-xs flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <MapPin size={15} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" />
                {room.location_description || "Innova Smart Hotel"}
              </p>
              <p className="text-xs flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <Users size={15} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" />
                Up to {Math.max(guestCount, 1)} guests
              </p>
              <p className="text-xs flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <CalendarDays size={15} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" />
                Flexible stay dates available
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: <Wifi size={16} />, label: "WiFi", active: amenities.wifi },
                { icon: <Waves size={16} />, label: "Pool", active: amenities.pool },
                { icon: <Utensils size={16} />, label: "Dining", active: amenities.dining },
              ].map(({ icon, label, active }) => (
                <div key={label} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 text-center">
                  <div className={`mx-auto mb-1 flex justify-center ${active ? "text-[#1F6F5F] dark:text-[#2FA084]" : "text-slate-300 dark:text-zinc-600"}`}>
                    {icon}
                  </div>
                  <p className="text-[11px] font-medium">{label}</p>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-2">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {amenities.list.map((item, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-zinc-300 capitalize"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <div>
                <p className="text-2xl font-bold text-[#1F6F5F] dark:text-[#2FA084]">PHP {price.toLocaleString()}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500">per night</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openTour}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/20 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
                >
                  <ScanEye size={14} /> 360°
                </button>
                <button
                  onClick={() => navigate(`/booking?roomId=${room.id}`)}
                  className="px-5 py-2.5 rounded-lg bg-[#1F6F5F] hover:bg-[#2FA084] text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  Reserve Now
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
                <p className="text-[#2FA084] text-xs font-semibold">360° Virtual Tour</p>
                <h3 className="text-white text-lg font-bold">{room.roomName || room.name}</h3>
              </div>
              <button
                onClick={closeTour}
                className="h-9 w-9 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-[#2FA084] flex items-center justify-center transition-all"
                aria-label="Close tour"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10" style={{ height: "60vh" }}>
              <div ref={panoRef} className="absolute inset-0" />

              {tourLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
                  <div className="w-8 h-8 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!tourLoading && !tourData && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-900 text-center px-6">
                  <ScanEye size={36} className="text-white/20" />
                  <p className="text-white/60 text-sm font-semibold">No 360° tour configured for this room yet.</p>
                  <p className="text-white/30 text-xs">{tourNotice}</p>
                </div>
              )}

              {!tourLoading && tourData && !tourActive && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/60">
                  <ScanEye size={32} className="text-[#2FA084]" />
                  <p className="text-white/70 text-xs font-semibold">360° panorama ready</p>
                  <button
                    onClick={() => setTourActive(true)}
                    className="px-6 py-3 rounded-full bg-[#1F6F5F] hover:bg-[#2FA084] text-white text-xs font-semibold transition-colors shadow-lg"
                  >
                    Start 360°
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={closeTour}
                className="px-4 py-2 rounded-lg border border-white/20 text-white text-xs font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { closeTour(); navigate(`/booking?roomId=${room.id}`); }}
                className="px-4 py-2 rounded-lg bg-[#1F6F5F] hover:bg-[#2FA084] text-white text-xs font-semibold transition-colors"
              >
                Reserve This Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOPEE-STYLE REVIEWS SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#0f1a17] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Hotel Ratings & Reviews</h2>

          {/* OVERVIEW RATING BANNER (Shopee Style) */}
          <div className="bg-red-50/30 dark:bg-[#13221e] border border-slate-200 dark:border-white/5 rounded-xl p-6 mb-8 flex flex-col md:flex-row items-center gap-8">
            <div className="text-center md:text-left shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#1F6F5F] dark:text-[#2FA084]">
                  {reviewStats.count > 0 ? reviewStats.average : "5.0"}
                </span>
                <span className="text-sm font-medium text-slate-400 dark:text-zinc-400">out of 5</span>
              </div>
              <div className="flex gap-1 mt-1 justify-center md:justify-start">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={18}
                    fill={s <= Math.round(Number(reviewStats.average)) ? "#1F6F5F" : "transparent"}
                    className={s <= Math.round(Number(reviewStats.average)) ? "text-[#1F6F5F] dark:text-[#2FA084]" : "text-slate-300 dark:text-zinc-700"}
                  />
                ))}
              </div>
            </div>

            {/* FILTER CHIPS */}
            <div className="flex flex-wrap gap-2">
              {["All", "5 Star", "4 Star", "3 Star", "2 Star", "1 Star"].map((filter) => {
                let label = filter;
                if (filter === "All") label = `All (${reviewStats.count})`;
                else if (filter.includes("Star")) {
                  const starNum = parseInt(filter);
                  label = `${filter} (${reviewStats.countsByStar[starNum] || 0})`;
                }
                const isSelected = activeFilter === filter;

                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium border transition-all ${
                      isSelected
                        ? "border-[#1F6F5F] text-[#1F6F5F] bg-white dark:bg-[#1F6F5F]/20 dark:text-[#2FA084] dark:border-[#2FA084] shadow-sm"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 bg-white dark:bg-white/5 hover:border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAHABANG REVIEWS LIST (FULL WIDTH / SINGLE COLUMN) */}
          {filteredReviews.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredReviews.map((rev) => {
                const nameInitial = rev.guestName ? rev.guestName[0].toUpperCase() : "G";
                const displayUsername = maskUsername(rev.guestName);
                const reviewDate = rev.createdAt
                  ? new Date(rev.createdAt).toISOString().replace("T", " ").substring(0, 16)
                  : "2026-04-12 14:20";
                const currentHelpful = helpfulCounts[rev.id] || { count: 0, active: false };

                return (
                  <div key={rev.id} className="py-6 first:pt-0 last:pb-0">
                    <div className="flex gap-4 items-start">
                      {/* USER AVATAR */}
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-white/10 flex items-center justify-center shrink-0 text-slate-600 dark:text-zinc-300 text-xs font-semibold">
                        {nameInitial ? nameInitial : <User size={16} />}
                      </div>

                      {/* REVIEW CONTENT PAHABA */}
                      <div className="flex-1 min-w-0">
                        {/* USERNAME */}
                        <p className="text-xs font-medium text-slate-800 dark:text-zinc-200">{displayUsername}</p>

                        {/* STARS */}
                        <div className="flex gap-0.5 mt-1 mb-1.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              fill={s <= (rev.rating || 5) ? "#1F6F5F" : "transparent"}
                              className={s <= (rev.rating || 5) ? "text-[#1F6F5F] dark:text-[#2FA084]" : "text-slate-300 dark:text-zinc-700"}
                            />
                          ))}
                        </div>

                        {/* TIMESTAMP & VARIATION */}
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-3">
                          {reviewDate} | Variation: {room.roomType || "Standard Suite"}
                        </p>

                        {/* STRUCTURED SPECS (SHOPEE STYLE) */}
                        <div className="space-y-1 text-xs text-slate-600 dark:text-zinc-300 mb-3">
                          <p><span className="text-slate-400 dark:text-zinc-500">Performance:</span> Excellent</p>
                          <p><span className="text-slate-400 dark:text-zinc-500">Room Quality:</span> Clean, spacious, and accurate as advertised.</p>
                          {rev.title && <p><span className="text-slate-400 dark:text-zinc-500">Best Feature:</span> {rev.title}</p>}
                        </div>

                        {/* COMMENT BODY */}
                        <p className="text-xs leading-relaxed text-slate-700 dark:text-zinc-200 mb-4">
                          {rev.comment || "Great experience staying here! Smooth check-in and friendly staff."}
                        </p>

                        {/* HELPFUL BUTTON */}
                        <button
                          onClick={() => toggleHelpful(rev.id)}
                          className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                            currentHelpful.active
                              ? "text-[#1F6F5F] dark:text-[#2FA084] font-semibold"
                              : "text-slate-400 dark:text-zinc-500 hover:text-slate-600"
                          }`}
                        >
                          <ThumbsUp size={13} />
                          <span>Helpful? {currentHelpful.count > 0 && `(${currentHelpful.count})`}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-zinc-500 text-xs">
              No reviews match the selected rating filter.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}