import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Users, Wifi, Waves, Utensils, Search, Bot, Lock, MapPin, Sparkles, ArrowLeft, Leaf, Car, Wine, Coffee } from 'lucide-react';

// --- SUB-COMPONENTS ---

const CategoryCard = ({ category, onExplore }) => (
  <div 
    onClick={() => onExplore(category)}
    className="relative aspect-[4/5] overflow-hidden group cursor-pointer shadow-lg rounded-sm transition-all hover:scale-[1.02]"
  >
    <img 
      src={category.image_url} 
      alt={category.title} 
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
      <h3 className="serif text-white text-2xl mb-1 group-hover:text-[#bf9b30] transition-colors">{category.title}</h3>
      <p className="text-gray-300 text-sm opacity-90 font-light">{category.subtitle}</p>
      <div className="mt-4 flex items-center gap-2 text-[#bf9b30] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest">
        Explore Collection <ChevronLeft className="rotate-180" size={12} />
      </div>
    </div>
  </div>
);

const RoomCard = ({ room, onAskAI }) => {
  const navigate = useNavigate();
  return (
    <div className="group bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all hover:shadow-2xl hover:-translate-y-1">
      <div className="relative h-72 bg-gray-200 overflow-hidden">
        <img 
          src={room.image_url || "https://via.placeholder.com/1200x800?text=No+Image+Available"} 
          alt={room.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {room.tag && (
          <span className={`absolute top-4 left-4 ${room.tag_color === 'green' ? 'bg-[#2ecc71]' : 'bg-[#e67e22]'} text-white text-[10px] font-black px-3 py-1.5 rounded shadow-lg tracking-widest uppercase`}>
            {room.tag}
          </span>
        )}
        <button className="absolute top-4 right-4 bg-white/70 backdrop-blur-sm p-2 rounded-full text-gray-400 hover:text-red-500 transition-colors">
          <Heart size={18} />
        </button>
      </div>

      <div className="p-8 border-t border-gray-50">
        <div className="flex justify-between items-start mb-6">
          <div className="w-2/3">
            <h3 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tighter italic">
              {room.name}
            </h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5">
              <MapPin size={12} className="text-[#bf9b30]" /> {room.location_description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#bf9b30] text-2xl font-black tracking-tighter">
              PHP {Number(room.base_price_php || 0).toLocaleString()}
            </p>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Per Night</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
           <div className="flex items-center gap-2 text-gray-400">
             <Users size={15} />
             <span className="text-[10px] font-black uppercase tracking-widest">{room.max_guests} Pax</span>
           </div>
           {room.has_wifi && <Wifi size={15} className="text-gray-300" />}
           {room.has_pool && <Waves size={15} className="text-gray-300" />}
           {room.has_dining && <Utensils size={15} className="text-gray-300" />}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/hoteldetail/${room.id}`)}
            className="flex items-center justify-center gap-2 py-3.5 border-2 border-gray-900 text-gray-900 hover:bg-gray-50 font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest text-[9px]"
          >
            <Search size={14} /> View & 360
          </button>
          <button
            type="button"
            onClick={() => onAskAI(room)}
            className="flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white font-black rounded-xl hover:bg-[#bf9b30] transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[9px]"
          >
            <Bot size={14} /> Ask AI
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

const ViewRecommendations = ({ isLoggedIn, userType }) => {
  const navigate = useNavigate();
  const filters = ['All', 'Single', 'Suite', 'Double', 'Deluxe'];
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState(null); // New State for "Other Page" feel
  
  const [categories, setCategories] = useState([]);
  const [recommendedRooms, setRecommendedRooms] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial UI Data
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
        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }

        const offersData = await response.json();
        if (isMounted) {
          setAddOns(Array.isArray(offersData) ? offersData.slice(0, 4) : []);
        }
      } catch (error) {
        console.error('Offer fetch error:', error);
        if (isMounted) {
          setAddOns([]);
        }
      }
    };

    fetchAddOns();
    return () => {
      isMounted = false;
    };
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
        if (!response.ok) {
          throw new Error('Failed to fetch customer profile');
        }

        const data = await response.json();
        if (isMounted) {
          setCustomerProfile(data?.user || null);
        }
      } catch (error) {
        console.error('Customer profile fetch error:', error);
        if (isMounted) {
          setCustomerProfile(null);
        }
      }
    };

    fetchCustomerProfile();
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const getOfferIcon = (offerType, index) => {
    const iconProps = { size: 24, className: 'text-[#8a6b07]' };
    const iconMap = [
      <Leaf {...iconProps} key="leaf" />,
      <Coffee {...iconProps} key="coffee" />,
      <Car {...iconProps} key="car" />,
      <Wine {...iconProps} key="wine" />,
    ];

    if (offerType === 'seasonal') return <Leaf {...iconProps} />;
    if (offerType === 'flash_deal') return <Coffee {...iconProps} />;
    if (offerType === 'holiday_package') return <Wine {...iconProps} />;
    return iconMap[index % iconMap.length];
  };

  // Fetch Logic - Updates based on Filter OR Selected Category
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Dynamic fetch: priority sa selectedCategory title, fallback sa type filter
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
    ]
      .filter(Boolean)
      .join(" ");

    window.dispatchEvent(
      new CustomEvent("openGlobalAIAssistant", {
        detail: { prompt },
      })
    );
  };

  // View Controller: Ano ang ipapakita sa screen?
  if (selectedCategory) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen p-8 md:p-16 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto">
          {/* Back Button & Header */}
          <button 
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black transition-colors mb-12 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </button>

          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <p className="uppercase tracking-[0.4em] text-[9px] text-[#bf9b30] font-black mb-2">Curated Experience</p>
              <h1 className="serif text-6xl text-gray-900 italic">{selectedCategory.title}</h1>
            </div>
            <p className="text-gray-500 text-sm max-w-xs font-light italic border-l-2 border-gray-200 pl-4">
              Showing our exclusive collection for "{selectedCategory.subtitle}".
            </p>
          </div>

          {/* Grid of Dynamic Rooms for the Category */}
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-10 opacity-30">
               {[1,2,3].map(i => <div key={i} className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>)}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {recommendedRooms.length > 0 ? (
                recommendedRooms.map(room => <RoomCard key={room.id} room={room} onAskAI={handleAskAI} />)
              ) : (
                <div className="col-span-3 text-center py-40 border-2 border-dashed border-gray-200 rounded-3xl text-gray-300 font-black uppercase tracking-widest text-xs">
                  No specialized units found for this category.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- DEFAULT DASHBOARD VIEW ---
  return (
    <div className="bg-[#f9f9f9] min-h-screen font-sans">
      
      {/* SECTION 1: TOP PICK CATEGORIES */}
      <section className="py-16 px-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <p className="uppercase tracking-[0.4em] text-[9px] text-[#bf9b30] font-black mb-4">Curated Collections</p>
          <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-8">
            <h1 className="serif text-gray-900 text-5xl md:text-7xl leading-tight max-w-2xl italic">Our Exclusive Recommendations</h1>
            <blockquote className="border-l-2 border-[#bf9b30] pl-6 py-2 max-w-sm text-gray-500 italic text-sm leading-relaxed font-light">
              "A stay defined by the golden hour, designed for those who seek the extraordinary in every detail."
            </blockquote>
          </div>

          <div className="flex justify-between items-center mb-10">
            <h2 className="serif text-3xl text-gray-800 tracking-tight">Top Pick Categories</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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

      {/* SECTION 2: ALL RECOMMENDATIONS (Visible only on main view) */}
      <section className="py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 pb-6 border-b border-gray-100 gap-6">
            <h2 className="serif text-4xl text-gray-900">Discover All Stays</h2>
            <div className="flex flex-wrap justify-center items-center gap-3">
              {filters.map(filter => (
                <button 
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter ? 'bg-[#bf9b30] text-white shadow-xl scale-105' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {recommendedRooms.map(room => <RoomCard key={room.id} room={room} onAskAI={handleAskAI} />)}
          </div>
        </div>
      </section>

      {/* SECTION 3: FOOTER PROMO */}
      <section className="mx-8 md:mx-20 mb-20">
        {(!isLoggedIn || userType === 'guest') ? (
          <div className="p-16 md:p-20 text-white text-center rounded-2xl shadow-2xl relative overflow-hidden bg-gradient-to-r from-[#8d6e03] via-[#af8d17] to-[#d4af37]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_52%)]" />
            <div className="relative z-10 max-w-4xl mx-auto">
              <div className="bg-white/10 border border-white/25 text-white w-fit mx-auto px-6 py-3 rounded-2xl text-[11px] font-black tracking-[0.2em] uppercase flex items-center gap-2 mb-10">
                <Lock size={12} /> Best Price Guaranteed
              </div>
              <h2 className="serif text-4xl md:text-6xl mb-6 leading-none">Unlock Member-Exclusive Rates</h2>
              <p className="text-base md:text-lg text-white/90 max-w-3xl mx-auto mb-10 font-light">
                Sign in to your Innova-HMS account to access preferred pricing, complimentary upgrades, and earn Gold Points on every stay.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="bg-white text-[#8d6e03] min-w-[240px] px-10 py-4 uppercase text-[10px] tracking-[0.3em] font-black hover:bg-[#f6f1df] transition-all rounded-lg"
                >
                  Login to Account
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="border border-white/50 text-white min-w-[240px] px-10 py-4 uppercase text-[10px] tracking-[0.3em] font-black hover:bg-white hover:text-[#8d6e03] transition-all rounded-lg"
                >
                  Join Membership
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#eee7d4] rounded-2xl p-10 md:p-14 shadow-sm">
            <div className="text-center mb-12">
              <p className="uppercase tracking-[0.35em] text-[10px] text-[#bf9b30] font-black mb-3">Enhance Your Journey</p>
              <h2 className="serif text-4xl md:text-6xl text-gray-900">Bespoke Add-on Offers</h2>
              <p className="mt-4 text-gray-500 text-sm max-w-2xl mx-auto">
                Curated extras matched to your {customerProfile?.membershipLevel || 'member'} privileges, available while your preferred rates are active.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {addOns.length > 0 ? addOns.map((offer, index) => (
                <div key={offer.id} className="border border-[#eee7d4] rounded-sm bg-[#fffdf8] p-8 text-center min-h-[320px] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-center mb-6">{getOfferIcon(offer.offer_type, index)}</div>
                    <h3 className="serif text-3xl text-gray-800 mb-3">{offer.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed min-h-[72px]">
                      {offer.description}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 line-through mb-2">
                      Original PHP {Number(offer.original_price || 0).toLocaleString()}
                    </p>
                    <p className="text-[#8a6b07] text-4xl font-black tracking-tight">
                      PHP {Number(offer.discounted_price || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-1">
                      {offer.offer_type === 'holiday_package' ? 'per package' : 'with stay'}
                    </p>
                    <button className="mt-6 border border-[#e7d9ae] px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6b07] hover:bg-[#8a6b07] hover:text-white transition-all">
                      Add to Stay
                    </button>
                  </div>
                </div>
              )) : (
                <div className="xl:col-span-4 border border-dashed border-[#e7d9ae] rounded-sm p-12 text-center text-gray-400 uppercase tracking-[0.2em] text-[11px] font-black">
                  No active add-on offers available right now.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ViewRecommendations;

