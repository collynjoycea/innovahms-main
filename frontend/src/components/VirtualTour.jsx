import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Marzipano from "marzipano";
import { X } from "lucide-react";
import resolveImg from "../utils/resolveImg";

const FALLBACK_PANORAMA = "/images/deluxe-room.jpg";

const getPreviewImage = (room, fallback = FALLBACK_PANORAMA) => {
  const rawImage =
    room?.imageUrl ||
    room?.image_url ||
    room?.img ||
    room?.image ||
    (Array.isArray(room?.images) ? room.images[0] : room?.images) ||
    "";

  return resolveImg(rawImage, fallback);
};

export default function VirtualTour() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const panoRef = useRef(null);
  const viewerRef = useRef(null);
  const isNumericRoomId = /^\d+$/.test(String(roomId || ""));
  const backToPath = location.state?.backToPath || (isNumericRoomId ? `/hoteldetail/${roomId}` : "/facilities");
  const backToLabel = location.state?.backToLabel || (isNumericRoomId ? "Back to Room" : "Back to Facilities");
  const bookingPath = location.state?.bookingPath || (isNumericRoomId ? `/booking?roomId=${roomId}` : "");
  const canReserve = Boolean(bookingPath);

  const [isActive, setIsActive] = useState(false);
  const [hasInteractiveTour, setHasInteractiveTour] = useState(false);
  const [roomName, setRoomName] = useState("Innova Room");
  const [tour, setTour] = useState({
    panoramaUrl: FALLBACK_PANORAMA,
    previewUrl: FALLBACK_PANORAMA,
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
      setIsActive(false);
      setHasInteractiveTour(false);

      const previewFromState = resolveImg(location.state?.previewImage || "", FALLBACK_PANORAMA);
      if (isMounted) {
        setRoomName(location.state?.roomName || "Innova Room");
        setTour({
          panoramaUrl: previewFromState,
          previewUrl: previewFromState,
          initialYaw: 0,
          initialPitch: 0,
          initialFov: Math.PI / 2,
        });
      }

      try {
        if (!roomId) {
          if (isMounted) setNotice("Room id is missing. Showing default preview.");
          return;
        }

        const roomListRes = await fetch("/api/rooms");
        const roomListPayload = await roomListRes.json().catch(() => ({}));
        const rooms = Array.isArray(roomListPayload?.rooms)
          ? roomListPayload.rooms
          : Array.isArray(roomListPayload)
            ? roomListPayload
            : [];
        const currentRoom = rooms.find((item) => String(item.id) === String(roomId));
        const currentPreview = currentRoom ? getPreviewImage(currentRoom, previewFromState) : previewFromState;

        if (currentRoom && isMounted) {
          setRoomName(currentRoom.roomName || currentRoom.name || "Innova Room");
          setTour({
            panoramaUrl: currentPreview,
            previewUrl: currentPreview,
            initialYaw: 0,
            initialPitch: 0,
            initialFov: Math.PI / 2,
          });
        } else if (isMounted) {
          setNotice("Room not found. Showing the selected preview.");
        }

        const tourRes = await fetch(`/api/rooms/${roomId}/tour`);
        const tourPayload = await tourRes.json().catch(() => ({}));

        if (tourRes.ok && tourPayload?.tour && isMounted) {
          setHasInteractiveTour(Boolean(tourPayload.tour.isInteractive));
          setTour({
            panoramaUrl: resolveImg(tourPayload.tour.panoramaUrl, currentPreview),
            previewUrl: resolveImg(tourPayload.tour.previewUrl, currentPreview),
            initialYaw: Number(tourPayload.tour.initialYaw || 0),
            initialPitch: Number(tourPayload.tour.initialPitch || 0),
            initialFov: Number(tourPayload.tour.initialFov || Math.PI / 2),
          });
          if (!tourPayload.tour.isInteractive) {
            setNotice("This room currently has a preview image only. A dedicated 360 panorama has not been configured yet.");
          }
        } else if (isMounted) {
          setNotice("No dedicated 360 tour is configured for this room, suite, or amenity yet. Showing its current preview.");
        }
      } catch {
        if (isMounted) setNotice("Unable to load tour data. Showing the current room preview.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTourData();

    return () => {
      isMounted = false;
    };
  }, [location.state, roomId]);

  useEffect(() => {
    if (!isActive || !hasInteractiveTour || !panoRef.current || !tour?.panoramaUrl) return;

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
    } catch {
      setNotice("Unable to initialize the 360 viewer. Preview mode remains available.");
      setHasInteractiveTour(false);
      setIsActive(false);
    }

    return () => {
      try {
        viewerRef.current?.destroy?.();
      } catch {
        // ignore cleanup errors
      }
      viewerRef.current = null;
    };
  }, [hasInteractiveTour, isActive, tour]);

  return (
    <section
      className={`py-20 overflow-hidden text-left min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#0a0f1a] text-white" : "bg-[#f6f1e5] text-[#1a160d]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative group h-[500px] w-full">
          <div
            ref={panoRef}
            className={`absolute inset-0 rounded-2xl overflow-hidden border shadow-2xl ${
              hasInteractiveTour && isActive ? "border-white/10 bg-black" : "border-white/10 bg-black/60"
            }`}
          />

          {hasInteractiveTour && isActive && (
            <button
              type="button"
              onClick={() => setIsActive(false)}
              className="absolute right-4 top-4 z-30 inline-flex items-center justify-center h-12 w-12 rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition-all hover:bg-[#bf9b30] hover:text-[#0d0c0a]"
              aria-label="Close 360 tour"
              title="Close 360 tour"
            >
              <X size={22} />
            </button>
          )}

          {(!isActive || !hasInteractiveTour) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl overflow-hidden">
              <img
                src={tour.previewUrl || tour.panoramaUrl || FALLBACK_PANORAMA}
                alt={`${roomName} preview`}
                className="absolute inset-0 w-full h-full object-cover opacity-70 transition-opacity duration-500 group-hover:opacity-85"
              />
              <div className="absolute inset-0 bg-black/35" />
              {hasInteractiveTour ? (
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className="relative z-30 px-6 py-4 rounded-full border border-white/30 bg-[#bf9b30] hover:scale-105 transition-transform shadow-2xl text-sm font-black uppercase tracking-widest text-white"
                >
                  Start 360
                </button>
              ) : (
                <div className="relative z-30 px-6 py-4 rounded-full border border-white/20 bg-black/45 backdrop-blur-md text-sm font-black uppercase tracking-widest text-white">
                  Preview Mode
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <p className="text-[#bf9b30] font-black tracking-widest text-sm uppercase">Immersive Exploration</p>
          <h2 className={`text-4xl md:text-5xl font-black leading-tight ${isDark ? "text-white" : "text-[#1a160d]"}`}>
            Explore Before You Arrive
          </h2>
          <p className={`text-lg leading-relaxed font-semibold ${isDark ? "text-gray-300" : "text-[#4a3f2f]"}`}>
            Space: <span className="text-[#bf9b30]">{roomName}</span>
          </p>
          <p className={`text-base leading-relaxed ${isDark ? "text-gray-400" : "text-[#6b5f4e]"}`}>
            Drag to explore every corner of this suite or amenity in full 360 when a dedicated tour is available.
          </p>

          {loading ? <p className={`text-sm ${isDark ? "text-gray-400" : "text-[#7a6f5e]"}`}>Loading tour data...</p> : null}
          {notice ? <p className="text-sm text-[#f5d17a]">{notice}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (hasInteractiveTour) setIsActive(true);
              }}
              disabled={!hasInteractiveTour}
              className={`px-8 py-3 rounded-xl font-black transition-all duration-300 uppercase tracking-widest text-sm ${
                hasInteractiveTour
                  ? "bg-[#bf9b30] hover:bg-[#a68628] text-white"
                  : "bg-white/10 text-white/50 cursor-not-allowed border border-white/10"
              }`}
            >
              {hasInteractiveTour ? (isActive ? "360 Active" : "Start Virtual Tour") : "Preview Only"}
            </button>
            <Link
              to={backToPath}
              className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${
                isDark
                  ? "border border-white/30 hover:bg-white/10 text-white"
                  : "border border-[#1a160d]/30 hover:bg-[#1a160d]/10 text-[#1a160d]"
              }`}
            >
              {backToLabel}
            </Link>
            <button
              type="button"
              onClick={() => {
                if (canReserve) navigate(bookingPath);
              }}
              disabled={!canReserve}
              className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${
                canReserve
                  ? "border border-[#bf9b30]/50 text-[#bf9b30] hover:bg-[#bf9b30]/10"
                  : "border border-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              {canReserve ? "Reserve" : "Preview Only"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
