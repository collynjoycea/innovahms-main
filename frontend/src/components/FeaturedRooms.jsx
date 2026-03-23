import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Tag, X } from 'lucide-react';
import Marzipano from 'marzipano';
import resolveImg from '../utils/resolveImg';

function TourModal({ open, onClose, roomName, tour, loadingTour }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!open || !containerRef.current || !tour?.panoramaUrl) return;

    containerRef.current.innerHTML = '';
    const viewer = new Marzipano.Viewer(containerRef.current, { controls: { mouseViewMode: 'drag' } });
    viewerRef.current = viewer;

    const source = Marzipano.ImageUrlSource.fromString(tour.panoramaUrl);
    const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
    const limiter = Marzipano.RectilinearView.limit.traditional(2048, (120 * Math.PI) / 180);
    const view = new Marzipano.RectilinearView(
      { yaw: tour.initialYaw ?? 0, pitch: tour.initialPitch ?? 0, fov: tour.initialFov ?? Math.PI / 2 },
      limiter
    );

    const scene = viewer.createScene({ source, geometry, view });
    scene.switchTo({ transitionDuration: 350 });

    return () => {
      try {
        viewerRef.current?.destroy?.();
      } catch {
        // ignore cleanup errors
      }
      viewerRef.current = null;
    };
  }, [open, tour]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6 bg-gradient-to-b from-black/70 to-transparent">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f1e5bc]">Virtual Tour</p>
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
        {loadingTour ? (
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

export default function FeaturedRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRoom, setTourRoom] = useState(null);
  const [tourData, setTourData] = useState(null);
  const [loadingTour, setLoadingTour] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        const resolvedRooms = Array.isArray(data?.rooms) ? data.rooms : Array.isArray(data) ? data : [];
        if (isMounted && res.ok) {
          setRooms(resolvedRooms.slice(0, 3));
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const openTour = async (room) => {
    setTourRoom(room);
    setTourData(null);
    setTourOpen(true);
    setLoadingTour(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}/tour`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Tour load failed (HTTP ${res.status}).`);
      setTourData(payload.tour || null);
    } catch (error) {
      console.error('Tour fetch error:', error);
      setTourData(null);
    } finally {
      setLoadingTour(false);
    }
  };

  if (loading) return null;

  return (
    <section className="py-16 px-8 bg-white text-left">
      <TourModal
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        roomName={tourRoom?.name || tourRoom?.title}
        tour={tourData}
        loadingTour={loadingTour}
      />
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Tailored for You</h2>
            <p className="text-gray-500 font-black mt-1 uppercase text-xs tracking-wider opacity-70">
              Based on your previous preferences and travel style.
            </p>
          </div>
          <button
            onClick={() => navigate('/recommendations')} // UPDATED: Papunta na sa Viewrecommendations.jsx
            className="text-[#bf9b30] font-black text-sm uppercase tracking-widest hover:underline transition-all"
          >
            View all recommendations →
          </button>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {rooms.length > 0 ? rooms.map((room, index) => {
            const displayCapacity = typeof room.capacity === 'object' 
              ? `${(room.capacity.adults || 0) + (room.capacity.children || 0)}` 
              : room.capacity || "2";

            return (
              <div key={room.id || index} className="group bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all hover:shadow-2xl hover:-translate-y-1">
                
                {/* Image Container */}
                <div className="relative h-72 bg-gray-200 overflow-hidden">
                  <img
                    src={resolveImg(room.images?.[0] || room.image_url || room.img)}
                    alt={room.roomName || room.title || 'Innova Room'}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/room1.jpg'; }}
                  />
                  {/* Badge */}
                  <span className="absolute top-4 left-4 bg-[#bf9b30] text-white text-[11px] font-black px-3 py-1.5 rounded shadow-lg tracking-widest uppercase">
                    {room.type || room.tag || 'Luxury'}
                  </span>
                </div>

                {/* Content Box */}
                <div className="p-8 border-t border-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight w-2/3 uppercase tracking-tighter">
                      {room.name || room.title || "Elite Suite"}
                    </h3>
                    <div className="text-right">
                      <p className="text-[#bf9b30] text-2xl font-black tracking-tighter">
                        ₱{Number(room.base_price_php || room.price || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Per Night</p>
                    </div>
                  </div>

                  {/* Room Details */}
                  <div className="flex items-center gap-3 mb-8">
                     <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        {displayCapacity} Pax
                     </span>
                     <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                     <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        High-Speed Wi-Fi
                     </span>
                  </div>

                  {/* BUTTON GROUP */}
                  <div className="flex flex-col gap-3">
                    {/* View Offer Button (Main Action) - LIGHT GOLD THEME */}
                    <button
                      onClick={() => navigate('/offers')}
                      className="group/btn flex items-center justify-center gap-2 w-full py-4 bg-[#f1e5bc] text-[#856a1d] font-black rounded-xl hover:bg-[#ebd99d] transition-all shadow-md active:scale-95 uppercase tracking-widest text-xs"
                    >
                      <Tag size={14} className="group-hover/btn:rotate-12 transition-transform" />
                      View Exclusive Offer
                    </button>

                    {/* Explore 360 Button (Secondary Action) - LIGHT GOLD THEME */}
                    <button
                      onClick={() => openTour(room)}
                      className="group/btn flex items-center justify-center gap-2 w-full py-4 bg-white text-[#856a1d] border-2 border-[#f1e5bc] font-black rounded-xl hover:bg-[#fdfbf3] transition-all active:scale-95 uppercase tracking-widest text-xs"
                    >
                      <Compass size={14} className="group-hover/btn:spin-slow" />
                      Explore 360° Tour
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-3 text-center py-20 text-gray-400 font-bold tracking-widest uppercase">
              No rooms found in database.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
