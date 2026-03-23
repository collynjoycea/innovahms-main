import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Trophy, Search, MapPin, Clock, Compass,
  Box, GlassWater, BellRing, ShieldCheck, Sparkles, RefreshCw, CalendarDays, Wallet,
  Bot, Send, QrCode, Gift, Star, KeyRound, ArrowRightLeft, XCircle, CreditCard, Loader2
} from 'lucide-react';

const formatDateRange = (checkInDate, checkOutDate) => {
  if (!checkInDate) {
    return 'Date unavailable';
  }

  const start = String(checkInDate);
  const end = checkOutDate ? String(checkOutDate) : '';
  return end ? `${start} - ${end}` : start;
};

const normalizeRoomType = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return 'Suite';
  }

  const roomMap = {
    single: 'Single',
    double: 'Double',
    suite: 'Suite',
    deluxe: 'Deluxe',
    standard: 'Single',
  };

  return roomMap[raw] || String(value);
};

const getDaysUntilCheckIn = (date) => {
  if (!date) return -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
};

const getPolicyForBooking = (booking) => {
  const daysUntil = getDaysUntilCheckIn(booking.checkInDate);
  const normalizedStatus = String(booking.status || '').toLowerCase();
  const isLocked = ['cancelled', 'completed', 'checked_out'].includes(normalizedStatus);
  const canModify = !isLocked && daysUntil >= 2;
  const canCancel = !isLocked && daysUntil >= 1;

  return {
    daysUntil,
    canModify,
    canCancel,
    policyLabel: canModify
      ? 'Free modification up to 48 hours before check-in'
      : canCancel
        ? 'Cancellation still allowed before arrival'
        : 'Booking locked based on hotel policy window',
  };
};

const extractSessionUser = () => {
  const rawCandidates = [
    localStorage.getItem('customerSession'),
    localStorage.getItem('user'),
  ].filter(Boolean);

  for (const raw of rawCandidates) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.user && typeof parsed.user === 'object') return parsed.user;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (error) {
      console.warn('Invalid stored session payload:', error);
    }
  }

  return null;
};


export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loyaltySummary, setLoyaltySummary] = useState(null);
  const [bookingActionState, setBookingActionState] = useState({});
  const [bookingDrafts, setBookingDrafts] = useState({});
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [digitalKey, setDigitalKey] = useState(null);
  const [digitalKeyLoading, setDigitalKeyLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      from: 'bot',
      text: 'Rasa is your 24/7 virtual assistant for hotel FAQs, reservation guidance, and guest experience support.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatNotice, setChatNotice] = useState('');

  const handleSessionReset = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('customerSession');
    navigate('/login', { replace: true });
  };

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      setLoadError('');
      if (!silent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const savedUser = extractSessionUser();

      if (!savedUser) {
        setUser(null);
        setLoadError('No saved customer session found.');
        return;
      }

      setUser((prev) => prev || {
        id: savedUser.id || savedUser.customer_id || savedUser.user_id || '',
        firstName: savedUser.firstName || savedUser.first_name || 'Guest',
        email: savedUser.email || '',
        loyaltyPoints: 0,
        membershipLevel: 'STANDARD',
        tierProgress: 0,
        bookings: [],
        rewards: [],
      });

      let cleanId = '';
      const rawId = savedUser.id || savedUser.customer_id || savedUser.user_id;
      if (rawId) {
        cleanId = String(rawId).split(':')[0];
      } else if (savedUser.email) {
        const resolveResponse = await fetch(`/api/customers/resolve?email=${encodeURIComponent(savedUser.email)}`);
        const resolvePayload = await resolveResponse.json().catch(() => ({}));
        if (!resolveResponse.ok || !resolvePayload?.user?.id) {
          throw new Error(resolvePayload?.error || 'Unable to resolve customer session.');
        }
        cleanId = String(resolvePayload.user.id);
        localStorage.setItem('user', JSON.stringify({
          ...savedUser,
          ...resolvePayload.user,
        }));
      }

      if (!cleanId) {
        throw new Error('Customer ID is missing from session.');
      }
      const [dashboardRes, summaryRes, recommendedRes] = await Promise.allSettled([
        fetch(`/api/customer/dashboard/${cleanId}`),
        fetch(`/api/innova/summary/${cleanId}`),
        fetch(`/api/innova/recommended/${cleanId}`),
      ]);

      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.ok) {
        const data = await dashboardRes.value.json();
        setUser(data.user);
        setLastUpdated(new Date());
      } else {
        setLoadError('Dashboard data is temporarily unavailable.');
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
        setLoyaltySummary(await summaryRes.value.json());
      } else {
        setLoyaltySummary(null);
      }

      if (recommendedRes.status === 'fulfilled' && recommendedRes.value.ok) {
        const payload = await recommendedRes.value.json();
        setRecommendations(payload.rooms || []);
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Network error:', error);
      setLoadError(error.message || 'Network error while loading dashboard.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();

    const handleFocusRefresh = () => fetchDashboardData(true);
    const handleStorageRefresh = () => fetchDashboardData(true);
    const refreshInterval = window.setInterval(() => fetchDashboardData(true), 15000);

    window.addEventListener('focus', handleFocusRefresh);
    window.addEventListener('storage', handleStorageRefresh);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocusRefresh);
      window.removeEventListener('storage', handleStorageRefresh);
    };
  }, [fetchDashboardData]);

  const today = new Date().toISOString().slice(0, 10);

  const normalizedBookings = (user?.bookings || []).map((booking) => ({
    ...booking,
    hotelName: booking.hotelName || 'Innova HMS',
    roomType: normalizeRoomType(booking.roomType),
    totalPrice: Number(booking.totalPrice || 0),
    ...getPolicyForBooking(booking),
  }));

  const currentBookings = normalizedBookings.filter((booking) => String(booking.checkOutDate || booking.checkInDate || '') >= today);

  const historyBookings = normalizedBookings.filter((booking) => String(booking.checkOutDate || booking.checkInDate || '') < today);

  const visibleBookings = activeTab === 'history' ? historyBookings : currentBookings;
  const totalSpent = normalizedBookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);
  const filteredRecommendations = recommendations.filter((room) =>
    `${room.name || ''} ${room.tagline || ''} ${room.badge || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const guestPoints = Number(loyaltySummary?.points ?? user?.loyaltyPoints ?? 0);
  const guestTier = loyaltySummary?.tier || user?.membershipLevel || 'STANDARD';
  const pointsThisMonth = Number(loyaltySummary?.pointsThisMonth || 0);
  const rewardProgress = Math.min(100, Number(loyaltySummary?.nextRewardProgressPercent || user?.tierProgress || 0));
  const primaryBooking = currentBookings[0] || null;
  const rewardsAvailable = Array.isArray(user?.rewards) ? user.rewards : [];

  useEffect(() => {
    setBookingDrafts((prev) => {
      const next = { ...prev };
      normalizedBookings.forEach((booking) => {
        if (!next[booking.bookingId]) {
          next[booking.bookingId] = {
            checkInDate: booking.checkInDate || '',
            checkOutDate: booking.checkOutDate || '',
          };
        }
      });
      return next;
    });
  }, [normalizedBookings]);

  useEffect(() => {
    const loadDigitalKey = async () => {
      if (!primaryBooking?.bookingId || !user?.id) {
        setDigitalKey(null);
        return;
      }

      try {
        setDigitalKeyLoading(true);
        const response = await fetch(`/api/bookings/${primaryBooking.bookingId}/digital-key?customer_id=${user.id}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'Failed to load digital key.');
        const qrCodeDataUrl = await QRCode.toDataURL(payload.accessPayload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 220,
          color: {
            dark: '#1a160d',
            light: '#f8f0d3',
          },
        });
        setDigitalKey({ ...payload, qrCodeDataUrl });
      } catch (error) {
        setDigitalKey({ error: error.message });
      } finally {
        setDigitalKeyLoading(false);
      }
    };

    loadDigitalKey();
  }, [primaryBooking?.bookingId, user?.id]);

  const handleBookingDraftChange = (bookingId, field, value) => {
    setBookingDrafts((prev) => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || {}),
        [field]: value,
      },
    }));
  };

  const handleBookingAction = async (booking, action) => {
    const canProceed = action === 'modify' ? booking.canModify : booking.canCancel;
    if (!canProceed) {
      setBookingActionState((prev) => ({
        ...prev,
        [booking.bookingId]: action === 'modify'
          ? 'Modification window has closed based on the hotel policy.'
          : 'Cancellation is no longer available for this reservation.',
      }));
      return;
    }

    try {
      setBookingActionState((prev) => ({ ...prev, [booking.bookingId]: 'Processing request...' }));
      const endpoint = action === 'modify'
        ? `/api/bookings/${booking.bookingId}/modify`
        : `/api/bookings/${booking.bookingId}/cancel`;
      const body = action === 'modify'
        ? {
            customerId: user.id,
            checkInDate: bookingDrafts[booking.bookingId]?.checkInDate,
            checkOutDate: bookingDrafts[booking.bookingId]?.checkOutDate,
          }
        : { customerId: user.id };

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Request failed.');

      setBookingActionState((prev) => ({ ...prev, [booking.bookingId]: payload.message || 'Request completed.' }));
      fetchDashboardData(true);
    } catch (error) {
      setBookingActionState((prev) => ({ ...prev, [booking.bookingId]: error.message }));
    }
  };

  const handlePayNow = async (booking) => {
    setPayingBookingId(booking.bookingId);
    try {
      const res = await fetch('/api/payment/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: booking.bookingId, paymentMethod: booking.paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment link.');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setBookingActionState(prev => ({ ...prev, [booking.bookingId]: `Payment error: ${err.message}` }));
    } finally {
      setPayingBookingId(null);
    }
  };

  const handleChatSubmit = async () => {
    const message = chatInput.trim();
    if (!message) return;

    const userMessage = { id: `q-${Date.now()}`, from: 'user', text: message };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');

    try {
      setChatLoading(true);
      setChatNotice('');
      const response = await fetch('/api/chatbot/rasa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: `customer-${user?.id || 'guest'}`,
          message,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Rasa API request failed.');
      if (payload?.source === 'fallback') {
        setChatNotice('Rasa server is offline, using dashboard assistant fallback.');
      } else {
        setChatNotice('');
      }

      const apiMessages = Array.isArray(payload.messages) ? payload.messages : [];
      setChatMessages((prev) => [
        ...prev,
        ...(apiMessages.length
          ? apiMessages.map((text, index) => ({ id: `a-${Date.now()}-${index}`, from: 'bot', text }))
          : [{ id: `a-${Date.now()}`, from: 'bot', text: 'Rasa did not return a text reply.' }]),
      ]);
    } catch (error) {
      setChatNotice('Unable to reach chatbot service right now.');
      setChatMessages((prev) => [...prev, { id: `e-${Date.now()}`, from: 'bot', text: error.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#bf9b30] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#bf9b30] font-black tracking-[0.3em] uppercase text-[10px]">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F3EA] flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck size={60} className="text-[#bf9b30] mb-6 opacity-50" />
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#1a160d]">Access Denied</h2>
        <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-2 mb-8">
          {loadError || 'Invalid session or backend connection lost'}
        </p>
        <button
          onClick={handleSessionReset}
          className="px-8 py-3 bg-[#bf9b30] text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:shadow-lg hover:shadow-[#bf9b30]/30 transition-all"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe4] text-[#1a160d] font-sans selection:bg-[#bf9b30]/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,155,48,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(26,22,13,0.08),transparent_30%),linear-gradient(180deg,#faf6ee_0%,#f4efe4_50%,#efe7d8_100%)]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70rem] h-[24rem] bg-[radial-gradient(circle,rgba(255,255,255,0.65),transparent_60%)] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/60 pb-8">
          <div>
            <div className="flex items-center gap-2 text-[#bf9b30] mb-2">
              <Sparkles size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Privileged Access</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase">
              HELLO, <span className="text-[#bf9b30]">{user.firstName}!</span>
            </h1>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400 font-bold">
              {lastUpdated ? `Live sync ${lastUpdated.toLocaleTimeString()}` : 'Live sync ready'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchDashboardData(true)}
              className="p-3 bg-white/80 backdrop-blur border border-slate-200 rounded-full text-slate-400 hover:text-[#bf9b30] hover:border-[#bf9b30] transition-all shadow-sm"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button className="p-3 bg-white/80 backdrop-blur border border-slate-200 rounded-full text-slate-400 hover:text-[#bf9b30] hover:border-[#bf9b30] transition-all shadow-sm">
              <BellRing size={20} />
            </button>
          </div>
        </header>

        {loadError ? (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-800">
            {loadError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/85 backdrop-blur border border-white/70 rounded-[32px] p-8 relative overflow-hidden group shadow-xl shadow-black/[0.04]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(191,155,48,0.08),_transparent_48%)]"></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Loyalty Points</p>
                  <p className="text-5xl font-black text-[#bf9b30]">{guestPoints.toLocaleString()}</p>
                  <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-[#1a160d] uppercase tracking-wider bg-[#FDFCFB] border border-slate-100 w-fit px-3 py-1.5 rounded-full">
                    <Trophy size={12} className="text-[#bf9b30]" />
                    <span>{guestTier} Tier</span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[#bf9b30]/10 bg-[#fcfaf4] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Stays</p>
                      <p className="mt-2 text-2xl font-black text-[#1a160d]">{currentBookings.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[#bf9b30]/10 bg-[#fcfaf4] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">This Month</p>
                      <p className="mt-2 text-2xl font-black text-[#1a160d]">+{pointsThisMonth.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      <span>Reward Progress</span>
                      <span>{Math.round(rewardProgress)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#efe7d8] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#bf9b30] to-[#d8bf71]" style={{ width: `${rewardProgress}%` }} />
                    </div>
                  </div>
                </div>
                <Box className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-50 opacity-[0.08] -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
              </div>

              <div className="bg-white/85 backdrop-blur border border-white/70 rounded-[32px] p-8 flex flex-col justify-center shadow-xl shadow-black/[0.04] relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(191,155,48,0.06),transparent_55%)]"></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Find your next stay</p>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search rooms or promotions..."
                      className="w-full bg-[#F8F9FA] border border-[#bf9b30]/80 rounded-[1.75rem] py-4 pl-12 pr-4 text-xs focus:outline-none focus:border-[#bf9b30] focus:ring-4 focus:ring-[#bf9b30]/5 transition-all text-[#1a160d]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="rounded-2xl bg-[#f7f3e8] border border-[#bf9b30]/10 p-4">
                      <div className="flex items-center gap-2 text-[#bf9b30] mb-2">
                        <CalendarDays size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upcoming</span>
                      </div>
                      <p className="text-xl font-black">{currentBookings.length}</p>
                    </div>
                    <div className="rounded-2xl bg-[#f7f3e8] border border-[#bf9b30]/10 p-4">
                      <div className="flex items-center gap-2 text-[#bf9b30] mb-2">
                        <Wallet size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spent</span>
                      </div>
                      <p className="text-xl font-black">PHP {totalSpent.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white/85 backdrop-blur border border-white/70 rounded-[2rem] p-6 shadow-xl shadow-black/[0.04]">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Personalized Recommendations</p>
                      <h2 className="text-2xl font-black italic uppercase tracking-tight mt-2">AI Picks for You</h2>
                    </div>
                    <Sparkles className="text-[#bf9b30]" size={20} />
                  </div>
                  <div className="space-y-4">
                    {(filteredRecommendations.length ? filteredRecommendations : recommendations).slice(0, 3).map((room) => (
                      <div key={room.id} className="rounded-[1.75rem] border border-[#bf9b30]/10 bg-[#fcfaf4] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-lg font-black text-[#1a160d]">{room.name}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">{room.badge || 'Recommended'}</p>
                            <p className="mt-3 text-sm text-slate-600">{room.tagline || room.description}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-[#bf9b30] text-white text-[10px] font-black uppercase tracking-widest">
                            {room.discountPercent ? `${room.discountPercent}% Off` : 'AI Match'}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-sm font-black text-[#bf9b30]">
                            PHP {Number(room.memberPricePhp || room.basePricePhp || 0).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate('/innova-suites')}
                            className="inline-flex items-center gap-2 rounded-full bg-[#1a160d] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#bf9b30] transition-all"
                          >
                            View Offer <Compass size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!recommendations.length && (
                      <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                        AI recommendations will appear here as soon as preference and history data are available.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/85 backdrop-blur border border-white/70 rounded-[2rem] p-6 shadow-xl shadow-black/[0.04]">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Points Tracking</p>
                      <h2 className="text-2xl font-black italic uppercase tracking-tight mt-2">Your Earned Rewards</h2>
                    </div>
                    <Gift className="text-[#bf9b30]" size={20} />
                  </div>
                  <div className="space-y-4">
                    {rewardsAvailable.map((reward, index) => (
                      <div key={`${reward.title}-${index}`} className="rounded-[1.75rem] border border-[#bf9b30]/10 bg-[#fcfaf4] p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-base font-black text-[#1a160d]">{reward.title}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-slate-400 font-black">Reward Inventory</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#bf9b30]">{Number(reward.quantity || 0).toLocaleString()} available</p>
                          <span className="inline-flex mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#bf9b30] text-white">
                            Claimed Reward
                          </span>
                        </div>
                      </div>
                    ))}
                    {!rewardsAvailable.length && (
                      <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                        No reward rows were returned from your database yet. Loyalty points are live, but the rewards list is currently empty.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 gap-4 flex-wrap">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4 text-[#bf9b30]" /> {activeTab === 'history' ? 'Booking History' : 'Current Itinerary'}
                </h2>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    onClick={() => setActiveTab('current')}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'current' ? 'bg-[#bf9b30] text-white shadow-md' : 'text-[#bf9b30]'}`}
                  >
                    Current
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-[#1a160d] text-white shadow-md' : 'text-slate-500'}`}
                  >
                    View History
                  </button>
                </div>
              </div>

              {visibleBookings.length > 0 ? (
                visibleBookings.map((b) => (
                  <div key={b.bookingId} className="group bg-white/88 backdrop-blur border border-white/70 rounded-[2.5rem] p-6 hover:shadow-2xl hover:shadow-black/[0.03] transition-all flex flex-col gap-6 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-24 bg-[linear-gradient(180deg,rgba(191,155,48,0.08),transparent)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-20 h-20 bg-[#f7f1df] rounded-[1.6rem] flex items-center justify-center text-[#bf9b30] border border-[#bf9b30]/10 shadow-inner">
                          <MapPin size={28} />
                        </div>
                        <div>
                          <p className="font-black italic text-2xl uppercase tracking-tighter text-[#1a160d]">{b.hotelName}</p>
                          <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.22em] mt-1">{b.roomType}</p>
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-3">
                            {formatDateRange(b.checkInDate, b.checkOutDate)}
                          </p>
                          <p className="text-[11px] text-[#bf9b30] font-black uppercase tracking-[0.15em] mt-2">
                            PHP {Number(b.totalPrice || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <span className="flex-1 md:flex-none text-center px-6 py-3 rounded-full bg-[#FDFCFB] text-[#bf9b30] text-[10px] font-black uppercase border border-slate-100 shadow-sm min-w-[140px]">
                          {b.status}
                        </span>
                        {/* PAY NOW — show for PENDING bookings with online payment method */}
                        {b.status === 'PENDING' && ['card','gcash','maya','online','qrph'].includes(String(b.paymentMethod || '').toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => handlePayNow(b)}
                            disabled={payingBookingId === b.bookingId}
                            className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#bf9b30] text-[#0d0c0a] text-[10px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all shadow-lg shadow-[#bf9b30]/30 disabled:opacity-60"
                          >
                            {payingBookingId === b.bookingId
                              ? <><Loader2 size={14} className="animate-spin" /> Processing...</>
                              : <><CreditCard size={14} /> Pay Now</>}
                          </button>
                        )}
                        <button className="p-5 bg-[#1a160d] text-white rounded-[1.35rem] hover:bg-[#bf9b30] transition-all shadow-lg shadow-black/10">
                          <Compass size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
                      <div className="rounded-[1.75rem] border border-[#bf9b30]/10 bg-[#fcfaf4] p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowRightLeft size={16} className="text-[#bf9b30]" />
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Modification / Cancellation</p>
                        </div>
                        <p className="text-sm text-slate-600">{b.policyLabel}</p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                            <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">Check-in</span>
                            <input
                              type="date"
                              value={bookingDrafts[b.bookingId]?.checkInDate || ''}
                              onChange={(e) => handleBookingDraftChange(b.bookingId, 'checkInDate', e.target.value)}
                              className="w-full bg-transparent text-sm font-bold text-[#1a160d] focus:outline-none"
                            />
                          </label>
                          <label className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                            <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">Check-out</span>
                            <input
                              type="date"
                              value={bookingDrafts[b.bookingId]?.checkOutDate || ''}
                              onChange={(e) => handleBookingDraftChange(b.bookingId, 'checkOutDate', e.target.value)}
                              className="w-full bg-transparent text-sm font-bold text-[#1a160d] focus:outline-none"
                            />
                          </label>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleBookingAction(b, 'modify')}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${b.canModify ? 'bg-[#1a160d] text-white hover:bg-[#bf9b30]' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                          >
                            <ArrowRightLeft size={14} /> Modify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBookingAction(b, 'cancel')}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${b.canCancel ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        </div>
                        {bookingActionState[b.bookingId] && (
                          <p className="mt-4 text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em]">
                            {bookingActionState[b.bookingId]}
                          </p>
                        )}
                      </div>

                      <div className="rounded-[1.75rem] border border-[#bf9b30]/10 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Policy Snapshot</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                          <div className="flex items-center justify-between">
                            <span>Days before check-in</span>
                            <span className="font-black text-[#1a160d]">{b.daysUntil}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Modification</span>
                            <span className="font-black text-[#1a160d]">{b.canModify ? 'Allowed' : 'Closed'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Cancellation</span>
                            <span className="font-black text-[#1a160d]">{b.canCancel ? 'Allowed' : 'Closed'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 border-2 border-dashed border-slate-200 rounded-[3rem] text-center bg-white/60">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                    <Compass size={32} />
                  </div>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
                    {activeTab === 'history' ? 'No booking history found' : 'No active reservations found'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#bf9b30] rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-[#bf9b30]/20 transition-transform hover:scale-[1.01]">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/5 rounded-full blur-2xl"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%)]"></div>

              <div className="relative z-10">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8 leading-none">Member<br />Privileges</h2>
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-white/20 pb-5">
                    <span className="text-[11px] font-black uppercase tracking-wider">Late Check-out</span>
                    <span className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">AVAILABLE</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/20 pb-5">
                    <span className="text-[11px] font-black uppercase tracking-wider">Welcome Drink</span>
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <GlassWater size={16} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/20 pb-5">
                    <span className="text-[11px] font-black uppercase tracking-wider">High-Speed Wi-Fi</span>
                    <span className="text-[10px] font-black tracking-widest">ULTRA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider">Live Booking Sync</span>
                    <span className="text-[10px] font-black tracking-widest">{isRefreshing ? 'SYNCING' : 'ACTIVE'}</span>
                  </div>
                </div>

                <div className="mt-10 rounded-[2rem] bg-[#cfae45]/80 border border-white/15 p-5 backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Travel Snapshot</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase">
                      <span>Upcoming Stays</span>
                      <span>{currentBookings.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-black uppercase">
                      <span>History Count</span>
                      <span>{historyBookings.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-black uppercase">
                      <span>Total Spend</span>
                      <span>PHP {totalSpent.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-10 py-5 bg-[#1a160d] text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black hover:shadow-2xl transition-all active:scale-95">
                  Redeem Rewards
                </button>
              </div>
              <Sparkles className="absolute right-6 top-6 w-24 h-24 text-white/10 rotate-12" />
            </div>

            <div className="bg-white/88 backdrop-blur border border-white/70 rounded-[2.25rem] p-6 shadow-xl shadow-black/[0.04]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Digital Key</p>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight mt-2">Mobile Room Access</h2>
                </div>
                <KeyRound className="text-[#bf9b30]" size={20} />
              </div>

              <div className="rounded-[2rem] bg-[#1a160d] text-white p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,155,48,0.25),transparent_35%)]"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Assigned Room</p>
                      <p className="text-lg font-black">{primaryBooking ? primaryBooking.roomType : 'Awaiting Check-in'}</p>
                    </div>
                    <QrCode size={20} className="text-[#d9bf74]" />
                  </div>

                  <div className="w-[11rem] h-[11rem] rounded-[1.5rem] bg-[#f8f0d3] p-3 flex items-center justify-center">
                    {digitalKeyLoading ? (
                      <div className="w-10 h-10 border-2 border-[#bf9b30] border-t-transparent rounded-full animate-spin"></div>
                    ) : digitalKey?.qrCodeDataUrl ? (
                      <img src={digitalKey.qrCodeDataUrl} alt="Digital room key QR code" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <p className="text-xs text-[#1a160d] text-center px-2">{digitalKey?.error || 'Digital key unavailable.'}</p>
                    )}
                  </div>

                  <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/70 font-bold">
                    {digitalKey?.roomLabel ? `${digitalKey.roomLabel} - Booking #INV-${primaryBooking.bookingId}` : (primaryBooking ? `Booking #INV-${primaryBooking.bookingId}` : 'No active room assignment yet')}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                Guests can scan this QR-based digital key on their mobile device for room access instead of a traditional key card.
              </p>
            </div>

            <div className="bg-white/88 backdrop-blur border border-white/70 rounded-[2.25rem] p-6 shadow-xl shadow-black/[0.04]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">AI Chatbot Rasa</p>
                  <h2 className="text-2xl font-black italic uppercase tracking-tight mt-2">24/7 Virtual Assistant</h2>
                </div>
                <Bot className="text-[#bf9b30]" size={20} />
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3">
                <div className="rounded-[1.5rem] border border-[#bf9b30]/10 bg-[#fcfaf4] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">What Rasa Handles</p>
                  <p className="mt-2 text-sm text-slate-600">
                    FAQs about room availability, hotel amenities, breakfast hours, and check-in/check-out procedures.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#bf9b30]/10 bg-[#fcfaf4] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Smart Reservation Assistance</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Guides guests to the right room type before they continue to the booking form.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#bf9b30]/10 bg-[#fcfaf4] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">NLU + CRM Context</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Understands intent, extracts details like dates or guest count, and supports smart guest experience profiling.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[#bf9b30]/10 bg-[#fcfaf4] p-4 space-y-3">
                {chatMessages.slice(-4).map((message) => (
                  <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-[1.25rem] px-4 py-3 text-sm ${message.from === 'user' ? 'bg-[#1a160d] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              {chatNotice ? (
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-400 font-bold">
                  {chatNotice}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !chatLoading) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    placeholder="Ask about availability, amenities, check-in, dates, or room type..."
                    className="w-full bg-transparent text-sm text-[#1a160d] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleChatSubmit}
                  disabled={chatLoading || !chatInput.trim()}
                  className="inline-flex items-center justify-center rounded-[1.25rem] bg-[#1a160d] px-4 py-4 text-white disabled:opacity-50 hover:bg-[#bf9b30] transition-all"
                >
                  {chatLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>

            <div className="bg-white/88 backdrop-blur border border-white/70 rounded-[2.25rem] p-6 shadow-xl shadow-black/[0.04]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Personalized Perks</p>
                  <h2 className="text-xl font-black uppercase tracking-tight mt-2">Suggested Promotions</h2>
                </div>
                <Star className="text-[#bf9b30]" size={18} />
              </div>
              <div className="mt-4 space-y-3">
                {recommendations.slice(0, 2).map((promo) => (
                  <div key={`promo-${promo.id}`} className="rounded-[1.5rem] border border-[#bf9b30]/10 bg-[#fcfaf4] p-4">
                    <p className="text-sm font-black text-[#1a160d]">{promo.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{promo.badge || 'Custom Promo'}</p>
                  </div>
                ))}
                {!recommendations.length && (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                    Promotions will appear here once AI recommendation data is available for this guest.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
