import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Marzipano from "marzipano";
import resolveImg from "../utils/resolveImg";

const FALLBACK_PANORAMA = "/images/my-room-360.jpg";

export default function VirtualTour() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const panoRef = useRef(null);
  const viewerRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [roomName, setRoomName] = useState("Innova Suite");
  const [tour, setTour] = useState({
    panoramaUrl: FALLBACK_PANORAMA,
    initialYaw: 0,
    initialPitch: 0,
    initialFov: Math.PI / 2,
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
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
    let isMounted = true;
    const loadTourData = async () => {
      setLoading(true);
      setNotice("");
      try {
        if (roomId) {
          const roomListRes = await fetch("/api/rooms");
          const roomListPayload = await roomListRes.json().catch(() => ({}));
          const rooms = Array.isArray(roomListPayload?.rooms)
            ? roomListPayload.rooms
            : Array.isArray(roomListPayload)
              ? roomListPayload
              : [];
          const currentRoom = rooms.find((item) => String(item.id) === String(roomId));
          if (currentRoom && isMounted) {
            setRoomName(currentRoom.roomName || currentRoom.name || "Innova Suite");
            const raw = (currentRoom.images && currentRoom.images[0]) || "";
            const panoramaUrl = resolveImg(raw, FALLBACK_PANORAMA);
            setTour({ panoramaUrl, initialYaw: 0, initialPitch: 0, initialFov: Math.PI / 2 });
          } else if (isMounted) {
            setNotice("Room not found. Showing default preview.");
          }
        } else if (isMounted) {
          setNotice("Room id is missing. Showing default preview.");
        }
      } catch {
        if (isMounted) setNotice("Unable to load tour. Showing local preview.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadTourData();
    return () => { isMounted = false; };
  }, [roomId]);

  useEffect(() => {
    if (!isActive || !panoRef.current || !tour?.panoramaUrl) return;

    try {
      panoRef.current.innerHTML = "";
      const viewer = new Marzipano.Viewer(panoRef.current, {
        controls: { mouseViewMode: "drag" },
      });
      viewerRef.current = viewer;

      const source = Marzipano.ImageUrlSource.fromString(tour.panoramaUrl);
      const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
      const limiter = Marzipano.RectilinearView.limit.traditional(2048, (120 * Math.PI) / 180);
      const view = new Marzipano.RectilinearView(
        {
          yaw: Number(tour.initialYaw || 0),
          pitch: Number(tour.initialPitch || 0),
          fov: Number(tour.initialFov || Math.PI / 2),
        },
        limiter
      );

      const scene = viewer.createScene({
        source,
        geometry,
        view,
        pinFirstLevel: true,
      });
      scene.switchTo();
    } catch (error) {
      setNotice("Unable to initialize 360 viewer. Preview mode remains available.");
    }

    return () => {
      try {
        viewerRef.current?.destroy?.();
      } catch {
        // ignore cleanup errors
      }
      viewerRef.current = null;
    };
  }, [isActive, tour]);

  return (
    <section className={`py-20 overflow-hidden text-left min-h-screen transition-colors duration-300 ${
      isDark
        ? "bg-[#0a0f1a] text-white"
        : "bg-[#f6f1e5] text-[#1a160d]"
    }`}>
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative group h-[500px] w-full">
          <div
            ref={panoRef}
            className="absolute inset-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black"
          />

          {!isActive && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl overflow-hidden">
              <img
                src={tour.panoramaUrl || FALLBACK_PANORAMA}
                alt={`${roomName} preview`}
                className="absolute inset-0 w-full h-full object-cover opacity-70 transition-opacity duration-500 group-hover:opacity-85"
              />
              <div className="absolute inset-0 bg-black/35" />
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className="relative z-30 px-6 py-4 rounded-full border border-white/30 bg-[#bf9b30] hover:scale-105 transition-transform shadow-2xl text-sm font-black uppercase tracking-widest text-white"
              >
                Start 360
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <p className="text-[#bf9b30] font-black tracking-widest text-sm uppercase">Immersive Exploration</p>
          <h2 className={`text-4xl md:text-5xl font-black leading-tight ${
            isDark ? "text-white" : "text-[#1a160d]"
          }`}>Explore Before You Arrive</h2>
          <p className={`text-lg leading-relaxed font-semibold ${
            isDark ? "text-gray-300" : "text-[#4a3f2f]"
          }`}>
            Room: <span className="text-[#bf9b30]">{roomName}</span>
          </p>
          <p className={`text-base leading-relaxed ${
            isDark ? "text-gray-400" : "text-[#6b5f4e]"
          }`}>
            Drag to explore every corner of this room in full 360°.
          </p>

          {loading ? <p className={`text-sm ${isDark ? "text-gray-400" : "text-[#7a6f5e]"}`}>Loading tour data...</p> : null}
          {notice ? <p className="text-sm text-[#f5d17a]">{notice}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsActive(true)}
              className="px-8 py-3 rounded-xl font-black transition-all duration-300 uppercase tracking-widest text-sm bg-[#bf9b30] hover:bg-[#a68628] text-white"
            >
              {isActive ? "360 Active" : "Start Virtual Tour"}
            </button>
            <Link
              to={roomId ? `/hoteldetail/${roomId}` : "/"}
              className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${
                isDark
                  ? "border border-white/30 hover:bg-white/10 text-white"
                  : "border border-[#1a160d]/30 hover:bg-[#1a160d]/10 text-[#1a160d]"
              }`}
            >
              Back to Room
            </Link>
            <button
              type="button"
              onClick={() => navigate(`/booking${roomId ? `?roomId=${roomId}` : ""}`)}
              className="border border-[#bf9b30]/50 text-[#bf9b30] px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-[#bf9b30]/10 transition-all"
            >
              Reserve
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
