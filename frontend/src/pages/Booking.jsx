import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, Users, MapPin, Star, ArrowRight, CheckCircle2, X, Sparkles, CreditCard, Banknote, QrCode, Loader2 } from 'lucide-react';
import resolveImg from '../utils/resolveImg';

const API_BASE = 'http://localhost:5000';

// ── QR PH PAYMENT MODAL ──────────────────────────────────────────────────────
function QrPaymentModal({ open, qrData, bookingResult, onSuccess, onClose }) {
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!open || !qrData?.intentId) return;
    // Poll every 4s to check if payment is done
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/verify/${qrData.intentId}`);
        const data = await res.json();
        if (data.status === 'succeeded' || data.status === 'paid') {
          clearInterval(interval);
          setPaid(true);
          setTimeout(() => onSuccess(), 1500);
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => clearInterval(interval);
  }, [open, qrData?.intentId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-[2rem] border border-[#bf9b30]/40 bg-white/10 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />
        <div className="p-8 text-center">
          <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors"><X size={18} /></button>

          {paid ? (
            <>
              <CheckCircle2 size={52} className="text-[#bf9b30] mx-auto mb-4" />
              <h3 className="text-xl font-black text-white">Payment Confirmed!</h3>
            </>
          ) : (
            <>
              <QrCode size={28} className="text-[#bf9b30] mx-auto mb-3" />
              <h3 className="text-xl font-black text-white mb-1">Scan to Pay</h3>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-5">QR Ph · ₱{Number(qrData?.amount || 0).toLocaleString()}</p>

              {qrData?.qrCodeUrl ? (
                <div className="bg-white rounded-2xl p-4 mx-auto w-fit mb-5">
                  <img src={qrData.qrCodeUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto mb-5 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Loader2 size={32} className="text-[#bf9b30] animate-spin" />
                </div>
              )}

              <p className="text-white/40 text-[11px] mb-1">Open your banking app and scan the QR code above.</p>
              <p className="text-white/30 text-[10px] uppercase tracking-widest flex items-center justify-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Waiting for payment...
              </p>

              <p className="text-[10px] text-[#bf9b30] mt-4 font-bold">Booking #{qrData?.bookingNumber}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── POST-BOOKING REVIEW MODAL ─────────────────────────────────────────────────
function ReviewModal({ open, onClose, bookingResult, sessionUser }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: sessionUser?.id,
          roomId: bookingResult?.roomId,
          hotelId: bookingResult?.hotelId,
          rating, title, comment,
        }),
      });
      setDone(true);
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-[#bf9b30]/40 bg-white/10 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />
        <div className="p-8">
          <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>

          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="text-[#bf9b30] mx-auto mb-4" />
              <h3 className="text-xl font-black text-white mb-2">Thank You!</h3>
              <p className="text-white/60 text-sm mb-6">Your review has been submitted.</p>
              <button onClick={onClose} className="px-8 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all">
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <Sparkles size={28} className="text-[#bf9b30] mx-auto mb-3" />
                <h3 className="text-xl font-black text-white">Share Your Experience</h3>
                <p className="text-white/50 text-xs mt-1 uppercase tracking-widest">Optional — takes 30 seconds</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30] mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button"
                        onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(s)}
                        className="transition-transform hover:scale-110">
                        <Star size={24} fill={(hover || rating) >= s ? '#bf9b30' : 'transparent'}
                          className={(hover || rating) >= s ? 'text-[#bf9b30]' : 'text-white/30'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30] mb-1.5">Title (optional)</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Summarize your stay..."
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-3 px-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#bf9b30]/70 transition-all" />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30] mb-1.5">Comment</label>
                  <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Tell future guests about your experience..."
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-3 px-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#bf9b30]/70 transition-all resize-none" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose}
                    className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    Skip
                  </button>
                  <button type="submit" disabled={submitting || !rating || !comment.trim()}
                    className="flex-1 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all disabled:opacity-40">
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SUCCESS MODAL ─────────────────────────────────────────────────────────────
function SuccessModal({ open, bookingResult, onReview, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1900] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-[#bf9b30]/40 bg-white/10 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 text-center">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />
        <div className="p-10">
          <CheckCircle2 size={56} className="text-[#bf9b30] mx-auto mb-5" />
          <h3 className="text-2xl font-black text-white mb-2">Booking Confirmed!</h3>
          <p className="text-white/50 text-xs uppercase tracking-widest mb-6">Reservation Successful</p>

          <div className="rounded-xl border border-white/15 bg-white/5 p-5 mb-8 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/50 font-medium">Booking #</span>
              <span className="text-[#bf9b30] font-black">{bookingResult?.bookingNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50 font-medium">Nights</span>
              <span className="text-white font-bold">{bookingResult?.totalNights}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50 font-medium">Total</span>
              <span className="text-white font-black">₱{Number(bookingResult?.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={onReview}
              className="w-full py-3.5 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all flex items-center justify-center gap-2">
              <Star size={14} /> Leave a Review
            </button>
            <button onClick={onClose}
              className="w-full py-3.5 rounded-xl border border-white/20 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN BOOKING PAGE ─────────────────────────────────────────────────────────
export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomIdParam = searchParams.get('roomId');

  const [room, setRoom] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [checkInTime, setCheckInTime] = useState('14:00');   // default 2PM
  const [checkOutTime, setCheckOutTime] = useState('12:00'); // default 12PM noon
  const [guests, setGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [preferences, setPreferences] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [qrData, setQrData] = useState(null); // { qrCodeUrl, intentId, bookingNumber, amount }
  const [isDark, setIsDark] = useState(() => {
    const s = localStorage.getItem('theme');
    return s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const sync = () => {
      const s = localStorage.getItem('theme');
      setIsDark(s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    window.addEventListener('themeChanged', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('themeChanged', sync); window.removeEventListener('storage', sync); };
  }, []);

  const nights = Math.max(0, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000));
  const total = room ? nights * Number(room.price || 0) : 0;

  useEffect(() => {
    const raw = localStorage.getItem('user') || localStorage.getItem('customerSession');
    if (raw) {
      try {
        const p = JSON.parse(raw);
        setSessionUser(p?.user && typeof p.user === 'object' ? p.user : p);
      } catch { setSessionUser(null); }
    }
  }, []);

  useEffect(() => {
    if (!roomIdParam) return;
    setLoadingRoom(true);
    fetch('/api/rooms')
      .then(r => r.json())
      .then(d => {
        const rooms = d.rooms || [];
        const found = rooms.find(r => String(r.id) === String(roomIdParam));
        setRoom(found || null);
      })
      .catch(() => {})
      .finally(() => setLoadingRoom(false));
  }, [roomIdParam]);

  const togglePref = (p) => setPreferences(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!sessionUser?.id) {
      sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
      navigate('/login');
      return;
    }
    if (!room) { setError('No room selected.'); return; }
    if (nights < 1) { setError('Check-out must be after check-in.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: sessionUser.id,
          roomId: room.id,
          checkIn, checkOut,
          checkInTime, checkOutTime,
          guests,
          specialRequests: [preferences.join(', '), specialRequests].filter(Boolean).join(' | '),
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed.');

      // Online payment — redirect to PayMongo
      if (['card', 'gcash', 'maya', 'qrph', 'online'].includes(paymentMethod)) {
        const payRes = await fetch('/api/payment/create-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: data.bookingId, paymentMethod }),
        });
        const payData = await payRes.json();
        if (payRes.status === 503) throw new Error('PayMongo is not configured yet. Please use Cash on Arrival or contact support.');
        if (!payRes.ok) throw new Error(payData.error || 'Payment link creation failed.');

        // QR Ph — show QR code modal
        if (payData.isQrPayment && payData.qrCodeUrl) {
          setBookingResult(data);
          setQrData({ qrCodeUrl: payData.qrCodeUrl, intentId: payData.intentId, bookingNumber: payData.bookingNumber, amount: payData.amount });
          return;
        }

        // Other online — redirect to PayMongo checkout
        window.location.href = payData.checkoutUrl;
        return;
      }

      // Cash — show success modal directly
      setBookingResult(data);
      setShowSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-white/20 bg-white/10 py-3.5 px-4 text-sm font-semibold text-white placeholder:text-white/25 outline-none focus:border-[#bf9b30]/70 focus:bg-white/15 transition-all";
  const selectCls = `w-full rounded-xl border border-white/20 py-3.5 px-4 text-sm font-semibold outline-none focus:border-[#bf9b30]/70 transition-all appearance-none cursor-pointer ${
    isDark ? 'bg-[#1a1208] text-white' : 'bg-[#2a1f08] text-white'
  }`;
  const labelCls = "block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30] mb-1.5";
  const stepBadge = "w-7 h-7 rounded-full bg-[#bf9b30] text-[#0d0c0a] flex items-center justify-center text-[11px] font-black flex-shrink-0";

  return (
    <>
      <SuccessModal open={showSuccess} bookingResult={bookingResult}
        onReview={() => { setShowSuccess(false); setShowReview(true); }}
        onClose={() => { setShowSuccess(false); navigate('/'); }} />
      <ReviewModal open={showReview} onClose={() => { setShowReview(false); navigate('/'); }}
        bookingResult={bookingResult} sessionUser={sessionUser} />
      <QrPaymentModal open={!!qrData} qrData={qrData} bookingResult={bookingResult}
        onSuccess={() => { setQrData(null); setShowSuccess(true); }}
        onClose={() => setQrData(null)} />

      <div className="booking-page-shell min-h-screen font-sans relative">
        <div className="fixed inset-0 bg-black/60 pointer-events-none z-0" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,155,48,0.12)_0%,transparent_60%)] pointer-events-none z-0" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-24">

          {/* HEADER */}
          <div className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#bf9b30] mb-3">Innova HMS</p>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
              Reserve Your <span className="text-[#bf9b30] font-serif italic font-light">Room Now</span>
            </h1>
            <p className="text-white/50 text-sm mt-4 font-light">Smart room assignment for a personalized experience.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── FORM ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* ROOM CARD */}
              {loadingRoom ? (
                <div className="rounded-[1.5rem] border border-white/15 bg-white/8 backdrop-blur-xl p-6 flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#bf9b30] border-t-transparent rounded-full animate-spin" />
                  <span className="text-white/50 text-sm">Loading room...</span>
                </div>
              ) : room ? (
                <div className="rounded-[1.5rem] border border-[#bf9b30]/30 bg-white/8 backdrop-blur-xl overflow-hidden">
                  <div className="flex gap-4 p-5">
                    <img src={resolveImg(room.images?.[0])} alt={room.roomName}
                      onError={e => { e.currentTarget.src = '/images/room1.jpg'; }}
                      className="w-24 h-20 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#bf9b30] mb-1">{room.roomType}</p>
                      <h3 className="text-lg font-black text-white truncate">{room.roomName}</h3>
                      <p className="text-white/50 text-xs flex items-center gap-1 mt-1">
                        <MapPin size={10} className="text-[#bf9b30]" /> {room.location_description || 'Innova HMS'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-black text-[#bf9b30]">₱{Number(room.price || 0).toLocaleString()}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest">/ night</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-white/15 bg-white/8 backdrop-blur-xl p-6 text-center text-white/40 text-sm">
                  No room selected. <button onClick={() => navigate('/recommendations')} className="text-[#bf9b30] underline">Browse rooms</button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* STEP 1 — DATES & ARRIVAL TIME */}
                <div className="rounded-[1.5rem] border border-white/15 bg-white/8 backdrop-blur-xl p-6 mb-4">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={stepBadge}>1</span>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Stay Duration & Arrival Time</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Check-In Date</label>
                      <input type="date" value={checkIn} min={today}
                        onChange={e => setCheckIn(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Check-Out Date</label>
                      <input type="date" value={checkOut} min={checkIn}
                        onChange={e => setCheckOut(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Expected Arrival Time</label>
                      <input type="time" value={checkInTime}
                        onChange={e => setCheckInTime(e.target.value)} className={inputCls} />
                      <p className="text-[9px] text-white/30 mt-1">Standard check-in: 2:00 PM</p>
                    </div>
                    <div>
                      <label className={labelCls}>Expected Check-Out Time</label>
                      <input type="time" value={checkOutTime}
                        onChange={e => setCheckOutTime(e.target.value)} className={inputCls} />
                      <p className="text-[9px] text-white/30 mt-1">Standard check-out: 12:00 PM</p>
                    </div>
                  </div>
                </div>

                {/* STEP 2 — GUESTS */}
                <div className="rounded-[1.5rem] border border-white/15 bg-white/8 backdrop-blur-xl p-6 mb-4">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={stepBadge}>2</span>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Guests & Payment</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Number of Guests</label>
                      <div className="flex items-center gap-0 rounded-xl border border-white/20 bg-white/10 overflow-hidden">
                        <button type="button" onClick={() => setGuests(g => Math.max(1, g - 1))}
                          className="px-4 py-3.5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-lg font-black leading-none flex-shrink-0">
                          −
                        </button>
                        <span className="flex-1 text-center text-sm font-black text-white">{guests}</span>
                        <button type="button" onClick={() => setGuests(g => Math.min(10, g + 1))}
                          className="px-4 py-3.5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-lg font-black leading-none flex-shrink-0">
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Payment Method</label>
                      <div className="relative">
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                        className={selectCls}>
                        <option value="cash">Cash on Arrival</option>
                        <option value="qrph">QR Ph (QR Code Payment)</option>
                        <option value="card">Credit / Debit Card</option>
                        <option value="gcash" disabled>GCash (needs account activation)</option>
                        <option value="maya" disabled>Maya (needs account activation)</option>
                      </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 3 — PREFERENCES */}
                <div className="rounded-[1.5rem] border border-white/15 bg-white/8 backdrop-blur-xl p-6 mb-4">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={stepBadge}>3</span>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Smart Preferences</h2>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['High Floor','Quiet Zone','Near Elevator','City View','Sun-facing','Work-friendly','Away from Stairs'].map(p => (
                      <button key={p} type="button" onClick={() => togglePref(p)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                          preferences.includes(p)
                            ? 'bg-[#bf9b30] border-[#bf9b30] text-[#0d0c0a]'
                            : 'border-white/20 text-white/60 hover:border-[#bf9b30]/50 hover:text-white'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className={labelCls}>Special Requests</label>
                    <textarea rows={3} value={specialRequests} onChange={e => setSpecialRequests(e.target.value)}
                      placeholder="e.g., traveling with seniors, need extra desk space..."
                      className={`${inputCls} resize-none`} />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 mb-4">
                    <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">!</span>
                    <p className="text-[11px] font-bold text-red-300 uppercase tracking-tight">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={submitting || !room}
                  className="group w-full flex items-center justify-center gap-2 rounded-xl bg-[#bf9b30] py-4 text-[11px] font-black uppercase tracking-[0.25em] text-[#0d0c0a] shadow-[0_8px_32px_rgba(191,155,48,0.4)] hover:bg-[#d4ac37] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50">
                  {submitting ? 'Processing...' : sessionUser?.id ? 'Confirm Reservation' : 'Sign In to Reserve'}
                  {!submitting && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            </div>

            {/* ── SUMMARY SIDEBAR ── */}
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-[#bf9b30]/30 bg-white/8 backdrop-blur-xl p-6 sticky top-24">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#bf9b30] mb-5">Booking Summary</h3>

                <div className="space-y-3 mb-5">
                  {[
                    { label: 'Room',        val: room?.roomName || '—' },
                    { label: 'Check-in',    val: checkIn ? `${checkIn} at ${checkInTime}` : '—' },
                    { label: 'Check-out',   val: checkOut ? `${checkOut} at ${checkOutTime}` : '—' },
                    { label: 'Nights',      val: nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : '—' },
                    { label: 'Guests',      val: guests },
                    { label: 'Payment',     val: paymentMethod },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex-shrink-0">{label}</span>
                      <span className="text-[11px] font-bold text-white text-right">{val}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Total</span>
                    <span className="text-2xl font-black text-[#bf9b30]">
                      {total > 0 ? `₱${total.toLocaleString()}` : '—'}
                    </span>
                  </div>
                  {room && nights > 0 && (
                    <p className="text-[9px] text-white/30 mt-1 text-right">
                      ₱{Number(room.price || 0).toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {!sessionUser?.id && (
                  <div className="mt-5 p-3 rounded-xl border border-[#bf9b30]/25 bg-[#bf9b30]/8 text-center">
                    <p className="text-[10px] text-white/50 mb-2">Sign in to complete your booking</p>
                    <button onClick={() => { sessionStorage.setItem('returnTo', window.location.pathname + window.location.search); navigate('/login'); }}
                      className="text-[10px] font-black uppercase tracking-widest text-[#bf9b30] hover:text-[#d4ac37] transition-colors underline underline-offset-2">
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <style>{`
          .booking-page-shell {
            background-attachment: fixed;
            background-image: url("/images/herobg.jpg");
            background-position: center;
            background-repeat: no-repeat;
            background-size: cover;
          }
        `}</style>
      </div>
    </>
  );
}
