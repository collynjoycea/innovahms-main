import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { AlertTriangle, Locate, Search, X, MapPin, Navigation } from "lucide-react";

// ─── Fix Leaflet default icon paths broken by bundlers ───────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const hotelIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "hotel-marker",
});

const userIcon = new L.DivIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: "",
});

const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

// ─── Inner component: flies map to a given center ────────────────────────────
function FlyTo({ center, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo([center.lat, center.lng], zoom, { duration: 0.9 });
  }, [center, zoom, map]);
  return null;
}

// ─── Nominatim place search (free, no API key) ───────────────────────────────
async function searchPlace(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

/**
 * NeighborhoodMap
 *
 * Props:
 *   hotels      – array of { id, name, lat, lng, address? }
 *   landmarks   – array of { id, name, category, lat, lng }
 *   hotelCenter – { lat, lng }  (fallback center when no hotels)
 *   isDarkMode  – boolean
 *   className   – extra Tailwind classes for the wrapper
 */
export default function NeighborhoodMap({
  hotels = [],
  landmarks = [],
  hotelCenter = { lat: 10.3247, lng: 123.9091 },
  focusedHotelId = null,
  isDarkMode = false,
  className = "",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [flyTarget, setFlyTarget] = useState(null);
  const [flyZoom, setFlyZoom] = useState(14);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [nearestHotel, setNearestHotel] = useState(null);
  const [mapsEnabled, setMapsEnabled] = useState(true);
  const debounceRef = useRef(null);
  const markerRefs = useRef({});

  const mapCenter = useMemo(
    () => (hotels[0] ? { lat: hotels[0].lat, lng: hotels[0].lng } : hotelCenter),
    [hotels, hotelCenter]
  );

  useEffect(() => {
    let mounted = true;

    const loadIntegrationState = async () => {
      try {
        const response = await fetch("/api/integrations/status");
        const payload = await response.json().catch(() => ({}));
        if (!mounted) return;
        setMapsEnabled(payload?.mainApis?.maps !== false);
      } catch {
        if (mounted) setMapsEnabled(true);
      }
    };

    loadIntegrationState();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Debounced search ──────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    if (!mapsEnabled) {
      setSearchQuery("");
      setSearchResults([]);
      setSearchError("Map services are temporarily disabled.");
      return;
    }

    const val = e.target.value;
    setSearchQuery(val);
    setSearchError("");
    if (!val.trim()) { setSearchResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlace(val);
        setSearchResults(results);
        if (results.length === 0) setSearchError("No places found.");
      } catch {
        setSearchError("Search unavailable. Check your connection.");
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const selectResult = (result) => {
    setFlyTarget({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setFlyZoom(15);
    setSearchQuery(result.display_name.split(",").slice(0, 2).join(", "));
    setSearchResults([]);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  };

  // ── Geolocation ───────────────────────────────────────────────────────────
  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(userPos);
        setFlyTarget(userPos);
        setFlyZoom(14);
        setLocating(false);

        // Find nearest hotel
        if (hotels.length > 0) {
          const sorted = [...hotels].sort(
            (a, b) => haversineKm(userPos, a) - haversineKm(userPos, b)
          );
          const nearest = sorted[0];
          setNearestHotel({
            ...nearest,
            km: haversineKm(userPos, nearest),
          });
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) setLocError("Location access denied. Please allow location in your browser.");
        else setLocError("Unable to retrieve your location.");
      },
      { timeout: 10000 }
    );
  }, [hotels]);

  const flyToNearest = () => {
    if (!nearestHotel) return;
    setFlyTarget({ lat: nearestHotel.lat, lng: nearestHotel.lng });
    setFlyZoom(16);
  };

  useEffect(() => {
    if (!focusedHotelId) return;

    const selectedHotel = hotels.find((hotel) => String(hotel.id) === String(focusedHotelId));
    if (!selectedHotel) return;

    setFlyTarget({ lat: selectedHotel.lat, lng: selectedHotel.lng });
    setFlyZoom(16);

    const timer = setTimeout(() => {
      markerRefs.current[String(focusedHotelId)]?.openPopup?.();
    }, 250);

    return () => clearTimeout(timer);
  }, [focusedHotelId, hotels]);

  const th = isDarkMode;

  if (!mapsEnabled) {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div
          className={`rounded-2xl border px-5 py-6 shadow-xl ${
            th ? "border-white/10 bg-[#111]" : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${th ? "text-white" : "text-gray-900"}`}>
                Map services offline
              </p>
              <p className={`mt-2 text-sm leading-relaxed ${th ? "text-gray-400" : "text-gray-500"}`}>
                OpenStreetMap access has been temporarily disabled by the admin. Live map tiles, place search, and map-based navigation are unavailable until it is turned back on.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search
            size={15}
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${th ? "text-gray-500" : "text-gray-400"}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search a place, landmark, or address…"
            className={`w-full pl-9 pr-9 py-2.5 rounded-xl border text-sm font-medium outline-none transition-colors focus:ring-2 focus:ring-[#c9a84c]/40 ${
              th
                ? "bg-[#111] border-white/10 text-white placeholder:text-gray-600"
                : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}

          {/* Dropdown results */}
          {(searchResults.length > 0 || searching || searchError) && (
            <div
              className={`absolute z-[1000] top-full mt-1 left-0 right-0 rounded-xl border shadow-xl overflow-hidden ${
                th ? "bg-[#111] border-white/10" : "bg-white border-gray-200"
              }`}
            >
              {searching && (
                <div className={`px-4 py-3 text-xs font-semibold ${th ? "text-gray-400" : "text-gray-500"}`}>
                  Searching…
                </div>
              )}
              {searchError && !searching && (
                <div className="px-4 py-3 text-xs font-semibold text-red-500">{searchError}</div>
              )}
              {searchResults.map((r) => (
                <button
                  key={r.place_id}
                  type="button"
                  onClick={() => selectResult(r)}
                  className={`w-full text-left px-4 py-3 text-xs font-medium flex items-start gap-2 transition-colors ${
                    th
                      ? "text-gray-300 hover:bg-white/5"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <MapPin size={13} className="text-[#c9a84c] mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Locate me button */}
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          title="Use my location"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-[11px] uppercase tracking-wide transition-all ${
            locating
              ? "opacity-60 cursor-not-allowed"
              : "hover:scale-[1.02] active:scale-95"
          } ${
            th
              ? "bg-[#c9a84c]/10 border-[#c9a84c]/20 text-[#c9a84c] hover:bg-[#c9a84c]/20"
              : "bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#a07c28] hover:bg-[#c9a84c]/20"
          }`}
        >
          <Locate size={15} className={locating ? "animate-spin" : ""} />
          {locating ? "Locating…" : "My Location"}
        </button>
      </div>

      {/* Location error */}
      {locError && (
        <p className="text-xs font-semibold text-red-500 px-1">{locError}</p>
      )}

      {/* Nearest hotel banner */}
      {nearestHotel && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
            th
              ? "bg-[#c9a84c]/10 border-[#c9a84c]/20 text-white"
              : "bg-[#c9a84c]/10 border-[#c9a84c]/30 text-gray-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <Navigation size={15} className="text-[#c9a84c] shrink-0" />
            <span className="font-bold text-xs">
              Nearest hotel:{" "}
              <span className="text-[#c9a84c]">{nearestHotel.name}</span>
              {" — "}
              <span className={th ? "text-gray-300" : "text-gray-600"}>
                {nearestHotel.km.toFixed(1)} km away
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={flyToNearest}
            className="text-[10px] font-black uppercase tracking-widest text-[#c9a84c] hover:underline shrink-0"
          >
            Show on map
          </button>
        </div>
      )}

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className={`w-full rounded-2xl overflow-hidden border shadow-xl ${th ? "border-white/10" : "border-gray-200"}`} style={{ height: 480 }}>
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={13}
          className="h-full w-full"
          style={{ zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {flyTarget && <FlyTo center={flyTarget} zoom={flyZoom} />}

          {/* Hotel markers */}
          {hotels.map((h) => (
            <Marker
              key={h.id}
              position={[h.lat, h.lng]}
              icon={hotelIcon}
              ref={(marker) => {
                if (marker) {
                  markerRefs.current[String(h.id)] = marker;
                } else {
                  delete markerRefs.current[String(h.id)];
                }
              }}
            >
              <Popup>
                <b className="text-sm">{h.name}</b>
                {h.address && <div className="text-xs text-gray-500 mt-1">{h.address}</div>}
              </Popup>
            </Marker>
          ))}

          {/* Fallback center marker when no hotels array provided */}
          {hotels.length === 0 && (
            <Marker position={[hotelCenter.lat, hotelCenter.lng]} icon={hotelIcon}>
              <Popup><b>Hotel Location</b></Popup>
            </Marker>
          )}

          {/* Landmark markers */}
          {landmarks.map((lm) => (
            <Marker key={lm.id} position={[lm.lat, lm.lng]}>
              <Popup>
                <b className="text-sm">{lm.name}</b>
                <div className="text-xs text-gray-500 mt-1">{lm.category}</div>
              </Popup>
            </Marker>
          ))}

          {/* User location marker */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup><b>You are here</b></Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <p className={`text-[10px] font-bold uppercase tracking-widest text-center ${th ? "text-gray-600" : "text-gray-400"}`}>
        Powered by OpenStreetMap · Nominatim Search
      </p>
    </div>
  );
}
