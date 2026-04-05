import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import NeighborhoodMap from '../../components/NeighborhoodMap';

const MapServices = () => {
  const { isDarkMode } = useOutletContext();
  const [hotels, setHotels] = useState([]);
  const [landmarks, setLandmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [hotelsRes, lmRes] = await Promise.all([
          fetch('/api/vision/nearby-hotels'),
          fetch('/api/vision/landmarks'),
        ]);
        const hotelsPayload = await hotelsRes.json().catch(() => ({}));
        const lmPayload = await lmRes.json().catch(() => ({}));

        if (!mounted) return;

        const hotelsData = hotelsPayload.hotels || [];
        const allHotels = hotelsData.map(hotel => ({
          id: hotel.id,
          name: hotel.name || 'Hotel',
          lat: hotel.lat,
          lng: hotel.lng,
          address: hotel.address || '',
        }));

        // Also add the main hotel from vision/hotel endpoint
        const hotelRes = await fetch('/api/vision/hotel');
        const hotelPayload = await hotelRes.json().catch(() => ({}));
        const mainHotel = hotelPayload.hotel;
        if (mainHotel?.location) {
          allHotels.unshift({
            id: mainHotel.id || 1,
            name: mainHotel.name || 'Main Hotel',
            lat: mainHotel.location.lat,
            lng: mainHotel.location.lng,
            address: mainHotel.locationLabel || '',
          });
        }

        setHotels(allHotels);
        setLandmarks(lmPayload.landmarks || []);
      } catch {
        // silently fall back to empty — map still renders
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f0f0f3]',
    card: isDarkMode ? 'bg-[#111111]/80' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
  };

  return (
    <div className={`p-6 space-y-6 min-h-screen transition-colors duration-500 ${theme.bg}`}>

      {/* HEADER */}
      <div className={`flex justify-between items-end border-b pb-5 ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Map <span className="text-[#c9a84c]">Services</span>
          </h1>
          <p className={`text-[9px] font-bold ${theme.textSub} uppercase tracking-widest mt-1`}>
            Geospatial tracking · Hotel distribution · Place search
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${theme.border} ${theme.textSub}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          OSM Live
        </div>
      </div>

      {/* MAP */}
      <div className={`rounded-2xl border p-4 ${theme.card} ${theme.border}`}>
        {loading ? (
          <div className="h-[520px] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <NeighborhoodMap
            hotels={hotels}
            landmarks={landmarks}
            isDarkMode={isDarkMode}
            className="w-full"
          />
        )}
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Hotels Mapped', value: hotels.length || '—' },
          { label: 'Landmarks', value: landmarks.length || '—' },
          { label: 'Map Engine', value: 'OSM' },
          { label: 'Search API', value: 'Nominatim' },
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl border p-4 ${theme.card} ${theme.border}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>{stat.label}</p>
            <p className={`text-2xl font-black mt-1 text-[#c9a84c]`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapServices;
