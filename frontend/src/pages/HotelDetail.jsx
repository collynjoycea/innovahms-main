import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Users, Wifi, Waves, Utensils, CalendarDays } from "lucide-react";
import resolveImg from "../utils/resolveImg";

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
};

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadRoom = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/rooms");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to fetch room list.");

        const rooms = Array.isArray(payload?.rooms)
          ? payload.rooms
          : Array.isArray(payload)
            ? payload
            : [];

        const selected = rooms.find((item) => String(item.id) === String(id));
        if (!selected) throw new Error("Room not found.");

        if (isMounted) {
          setRoom(selected);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || "Unable to load room details.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRoom();
    return () => {
      isMounted = false;
    };
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
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-xs font-black uppercase tracking-widest"
        >
          Back to Home
        </button>
      </main>
    );
  }

  const image = resolveImg((Array.isArray(room.images) && room.images[0]) || "");
  const guestCount = Number(room.maxAdults || 0) + Number(room.maxChildren || 0) || Number(room.max_guests || 2);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      <section className="max-w-7xl mx-auto px-6 py-10">
        <nav className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[#bf9b30] text-xs font-black uppercase tracking-widest">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-xl">
            <img
              src={image}
              alt={room.roomName || room.name || "Room"}
              onError={(e) => { e.currentTarget.src = "/images/room1.jpg"; }}
              className="w-full h-[420px] object-cover"
            />
          </div>

          <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-3xl p-8 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#bf9b30] mb-3">
              {String(room.status || "AVAILABLE").toUpperCase()}
            </p>
            <h1 className="text-4xl font-black tracking-tight mb-3">
              {room.roomName || room.name || "Innova Suite"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-300 leading-relaxed mb-6">
              {room.description || (room.roomType ? `${room.roomType} room crafted for smart hospitality and elevated guest comfort.` : "A premium room experience built for convenience and style.")}
            </p>

            <div className="space-y-3 mb-8">
              <p className="text-sm flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <MapPin size={16} className="text-[#bf9b30]" /> {room.location_description || "Innova Smart Hotel"}
              </p>
              <p className="text-sm flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <Users size={16} className="text-[#bf9b30]" /> Up to {Math.max(guestCount, 1)} guests
              </p>
              <p className="text-sm flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                <CalendarDays size={16} className="text-[#bf9b30]" /> Flexible stay dates available
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3 text-center">
                <Wifi size={16} className={`mx-auto mb-2 ${amenities.wifi ? "text-[#bf9b30]" : "text-slate-300 dark:text-zinc-600"}`} />
                <p className="text-[10px] font-black uppercase tracking-widest">WiFi</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3 text-center">
                <Waves size={16} className={`mx-auto mb-2 ${amenities.pool ? "text-[#bf9b30]" : "text-slate-300 dark:text-zinc-600"}`} />
                <p className="text-[10px] font-black uppercase tracking-widest">Pool</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3 text-center">
                <Utensils size={16} className={`mx-auto mb-2 ${amenities.dining ? "text-[#bf9b30]" : "text-slate-300 dark:text-zinc-600"}`} />
                <p className="text-[10px] font-black uppercase tracking-widest">Dining</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-400 mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {amenities.list.map((item, i) => (
                  <span key={i} className="px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-700 text-[11px] text-slate-600 dark:text-zinc-300 capitalize">{item}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-slate-200 dark:border-zinc-700">
              <p className="text-3xl font-black text-[#bf9b30]">
                PHP {Number(room.base_price_php || room.price_per_night || room.price || 0).toLocaleString()}
                <span className="text-xs text-slate-500 dark:text-zinc-400 ml-2">/ night</span>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/virtual-tour/${room.id}`}
                  className="px-5 py-3 rounded-xl border border-slate-300 dark:border-zinc-600 text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  View 360 Tour
                </Link>
                <button
                  type="button"
                  onClick={() => navigate(`/booking?roomId=${room.id}`)}
                  className="px-6 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-xs font-black uppercase tracking-widest hover:bg-[#d8b454] transition-colors"
                >
                  Reserve This Room
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

