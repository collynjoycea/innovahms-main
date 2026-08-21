import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Users, Wifi, Waves, Utensils, Search, Bot, Lock, MapPin, ArrowLeft, Leaf, Car, Wine, Coffee } from 'lucide-react';

// --- SUB-COMPONENTS ---

const CategoryCard = ({ category, onExplore }) => (
  <div 
    onClick={() => onExplore(category)}
    className="relative aspect-[4/5] overflow-hidden group cursor-pointer shadow-md rounded-xl transition-all hover:scale-[1.02] border border-slate-200 dark:border-white/10"
  >
    <img 
      src={category.image_url} 
      alt={category.title} 
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4 flex flex-col justify-end">
      <h3 className="serif text-white text-lg font-bold mb-0.5 group-hover:text-[#2FA084] transition-colors">{category.title}</h3>
      <p className="text-gray-300 text-xs opacity-90 font-light truncate">{category.subtitle}</p>
      <div className="mt-2 flex items-center gap-1 text-[#2FA084] opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest">
        Explore <ChevronLeft className="rotate-180" size={10} />
      </div>
    </div>
  </div>
);

// Compact RoomCard specifically tuned for 6-column layout
const RoomCard = ({ room, onAskAI }) => {
  const navigate = useNavigate();
  return (
    <div className="group bg-white dark:bg-[#0f1a17] rounded-2xl shadow-md overflow-hidden border border-slate-200 dark:border-white/10 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
      <div>
        {/* Compact Image Header */}
        <div className="relative h-40 bg-slate-100 dark:bg-zinc-800 overflow-hidden">
          <img 
            src={room.image_url || "https://via.placeholder.com/1200x800?text=No+Image+Available"} 
            alt={room.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {room.tag && (
            <span className={`absolute top-2 left-2 ${room.tag_color === 'green' ? 'bg-[#2FA084]' : 'bg-[#1F6F5F]'} text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-md tracking-wider uppercase`}>
              {room.tag}
            </span>
          )}
          <button className="absolute top-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white/80 hover:text-red-400 transition-colors">
            <Heart size={13} />
          </button>
        </div>

        {/* Compact Content */}
        <div className="p-3.5 border-t border-slate-100 dark:border-white/5">
          <div className="mb-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight truncate" title={room.name}>
              {room.name}
            </h3>
            <p className="text-slate-400 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider mt-1 flex items-center gap-1 truncate">
              <MapPin size={10} className="text-[#1F6F5F] dark:text-[#2FA084] shrink-0" /> {room.location_description}
            </p>
          </div>

          <div className="flex items-center justify-between mb-3 bg-slate-50 dark:bg-[#0d1412] p-2 rounded-lg border border-slate-100 dark:border-white/5">
            <div>
              <p className="text-[8px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Per Night</p>
              <p className="text-[#1F6F5F] dark:text-[#2FA084] text-base font-black tracking-tight">
                ₱{Number(room.base_price_php || 0).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[9px] font-bold">
              <Users size={12} /> {room.max_guests} Pax
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3 text-slate-400 dark:text-zinc-500 text-xs">
            {room.has_wifi && <Wifi size={13} />}
            {room.has_pool && <Waves size={13} />}
            {room.has_dining && <Utensils size={13} />}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3.5 pt-0 grid grid-cols-2 gap-1.5">
        <button
          onClick={() => navigate(`/hoteldetail/${room.id}`)}
          className="flex items-center justify-center gap-1 py-2 border border-slate-800 dark:border-white/30 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 font-black rounded-lg transition-all active:scale-95 uppercase tracking-wider text-[8px]"
        >
          <Search size={11} /> View
        </button>
        <button
          type="button"
          onClick={() => onAskAI(room)}
          className="flex items-center justify-center gap-1 py-2 bg-[#1F6F5F] text-white font-black rounded-lg hover:bg-[#2FA084] transition-all shadow-md active:scale-95 uppercase tracking-wider text-[8px]"
        >
          <Bot size={11} /> AI
        </button>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

const ViewRecommendations = ({ isLoggedIn, userType }) => {
  const navigate = useNavigate();
  const filters = ['All', 'Single', 'Suite', 'Double', 'Deluxe'];
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [recommendedRooms, setRecommendedRooms] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCategories([
      { id: 1, title: "Guest Favorites", subtitle: "Top-rated cinematic retreats", image_url: "/images/guests-fav.png" },
      { id: 2, title: "Best for Couples", subtitle: "Intimate minimal aesthetics", image_url: "/images/best-couple.jpg" },
      { id: 3, title: "Family Choice", subtitle: "Expansive modern living", image_url: "/images/family-choice.jpg" },
      { id: 4, title: "Wellness Retreats", subtitle: "Glassmorphism spa designs", image_url: "/images/wellness-retreats.jpg" },
    ]);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAddOns = async () => {
      try {
        const response = await fetch('/api/guest-offers');
        if (!response.ok) throw new Error('Failed to fetch offers');
        const offersData = await response.json();
        if (isMounted) setAddOns(Array.isArray(offersData) ? offersData.slice(0, 4) : []);
      } catch (error) {
        if (isMounted) setAddOns([]);
      }
    };
    fetchAddOns();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCustomerProfile = async () => {
      if (!isLoggedIn) {
        setCustomerProfile(null);
        return;
      }
      try {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return;
        const parsedUser = JSON.parse(rawUser);
        const customerId = parsedUser?.id || parsedUser?.customer_id || parsedUser?.user_id;
        if (!customerId) return;

        const response = await fetch(`/api/customer/dashboard/${customerId}`);
        if (!response.ok) throw new Error('Failed to fetch customer profile');
        const data = await response.json();
        if (isMounted) setCustomerProfile(data?.user || null);
      } catch (error) {
        if (isMounted) setCustomerProfile(null);
      }
    };
    fetchCustomerProfile();
    return () => { isMounted = false; };
  }, [isLoggedIn]);

  const getOfferIcon = (offerType, index) => {
    const iconProps = { size: 20, className: 'text-[#1F6F5F] dark:text-[#2FA084]' };
    if (offerType === 'seasonal') return <Leaf {...iconProps} />;
    if (offerType === 'flash_deal') return <Coffee {...iconProps} />;
    if (offerType === 'holiday_package') return <Wine {...iconProps} />;
    return <Car {...iconProps} />;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        let queryParam = selectedCategory ? `category=${selectedCategory.title}` : `type=${activeFilter}`;
        const response = await fetch(`/api/recommendations?${queryParam}`);
        if (!response.ok) throw new Error('Failed to fetch rooms');
        const roomsData = await response.json();
        if (isMounted) setRecommendedRooms(roomsData);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [activeFilter, selectedCategory]);

  const handleAskAI = (room) => {
    const roomName = room?.name || "this room";
    const locationLabel = room?.location_description || room?.location || "Innova HMS";
    const basePrice = Number(room?.base_price_php || 0);
    const prompt = [
      `I want to know more about ${roomName}.`,
      `Location: ${locationLabel}.`,
      basePrice > 0 ? `Price starts at PHP ${basePrice.toLocaleString()} per night.` : null,
      "Please help me decide if this room is a good fit for me.",
    ].filter(Boolean).join(" ");

    window.dispatchEvent(
      new CustomEvent("openGlobalAIAssistant", { detail: { prompt } })
    );
  };

  if (selectedCategory) {
    return (
      <div className="bg-slate-50 dark:bg-[#0d1412] min-h-screen p-6 md:p-10 text-slate-900 dark:text-zinc-100">
        <div className="max-w-[1600px] mx-auto">
          <button 
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-[#1F6F5F] dark:hover:text-[#2FA084] transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Recommendations
          </button>

          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <p className="uppercase tracking-[0.4em] text-[9px] text-[#1F6F5F] dark:text-[#2FA084] font-black mb-1">Curated Experience</p>
              <h1 className="serif text-4xl text-slate-900 dark:text-white italic">{selectedCategory.title}</h1>
            </div>
          </div>

          {/* 6-COLUMN GRID HERE */}
          {loading ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 opacity-30">
               {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <div key={i} className="h-64 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse"></div>)}
             </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {recommendedRooms.length > 0 ? (
                recommendedRooms.map(room => <RoomCard key={room.id} room={room} onAskAI={handleAskAI} />)
              ) : (
                <div className="col-span-full text-center py-24 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl text-slate-400 font-black uppercase tracking-widest text-xs">
                  No specialized units found for this category.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#0d1412] min-h-screen font-sans text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      
      {/* CATEGORIES SECTION */}
      <section className="py-12 px-6 bg-white dark:bg-[#0f1a17] border-b border-slate-200 dark:border-white/10">
        <div className="max-w-[1600px] mx-auto">
          <p className="uppercase tracking-[0.4em] text-[9px] text-[#1F6F5F] dark:text-[#2FA084] font-black mb-2">Curated Collections</p>
          <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
            <h1 className="serif text-slate-900 dark:text-white text-4xl md:text-5xl leading-tight max-w-xl italic">Our Exclusive Recommendations</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(cat => (
              <CategoryCard 
                key={cat.id} 
                category={cat} 
                onExplore={(c) => setSelectedCategory(c)} 
              />
            ))}
          </div>
        </div>
      </section>

      {/* 6 COLUMNS X MAX 4 ROWS GRID SECTION */}
      <section className="py-12 px-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-slate-200 dark:border-white/10 gap-4">
            <h2 className="serif text-3xl text-slate-900 dark:text-white">Discover Stays</h2>
            <div className="flex flex-wrap justify-center items-center gap-2">
              {filters.map(filter => (
                <button 
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeFilter === filter 
                      ? 'bg-[#1F6F5F] text-white shadow-md' 
                      : 'bg-white dark:bg-[#0f1a17] text-slate-500 dark:text-zinc-400 hover:bg-slate-100 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Layout: 6 columns on Large Screens (lg:grid-cols-6) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recommendedRooms.slice(0, 24).map(room => (
              <RoomCard key={room.id} room={room} onAskAI={handleAskAI} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ViewRecommendations;