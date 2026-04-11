import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Loader2, MapPin, QrCode, Sparkles, Star, X } from 'lucide-react';
import resolveImg from '../utils/resolveImg';

const prefs = ['High Floor', 'Quiet Zone', 'Near Elevator', 'City View', 'Sun-facing', 'Work-friendly', 'Away from Stairs'];
const peso = (v) => `PHP ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const VAT_PERCENT = 12;
const TAX_PERCENT = 5;
const weekLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const buttonDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const getSession = () => {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('customerSession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user && typeof parsed.user === 'object' ? parsed.user : parsed;
  } catch {
    return null;
  }
};

const parseDateValue = (value) => {
  if (!value) return null;
  const parts = String(value).split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const formatDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateOrValue, days) => {
  const base = dateOrValue instanceof Date ? new Date(dateOrValue) : parseDateValue(dateOrValue);
  if (!base) return null;
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfMonth = (dateOrValue) => {
  const base = dateOrValue instanceof Date ? new Date(dateOrValue) : parseDateValue(dateOrValue);
  if (!base) return new Date();
  return new Date(base.getFullYear(), base.getMonth(), 1);
};

const sameDate = (left, right) => formatDateValue(left) === formatDateValue(right);

const dateButtonLabel = (value) => {
  const parsed = value instanceof Date ? value : parseDateValue(value);
  return parsed ? buttonDateFormatter.format(parsed) : 'Select a date';
};

const buildCalendarDays = (monthCursor) => {
  const firstDay = startOfMonth(monthCursor);
  const gridStart = addDays(firstDay, -firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

function QrModal({ open, data, onPaid, onClose }) {
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    if (!open || !data?.intentId) return undefined;
    setPaid(false);
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/verify/${data.intentId}`);
        const body = await res.json().catch(() => ({}));
        if (body.status === 'succeeded' || body.status === 'paid') {
          clearInterval(id);
          setPaid(true);
          setTimeout(onPaid, 1200);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(id);
  }, [open, data?.intentId, onPaid]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[2rem] border border-[#bf9b30]/40 bg-[#15120d]/95 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />
        <div className="p-8 text-center text-white">
          <button type="button" onClick={onClose} className="absolute right-5 top-5 text-white/40 hover:text-white"><X size={18} /></button>
          {paid ? (
            <>
              <CheckCircle2 size={52} className="mx-auto mb-4 text-[#bf9b30]" />
              <h3 className="text-xl font-black">Payment Confirmed!</h3>
            </>
          ) : (
            <>
              <QrCode size={28} className="mx-auto mb-3 text-[#bf9b30]" />
              <h3 className="text-xl font-black">Scan to Pay</h3>
              <p className="mb-5 mt-1 text-xs uppercase tracking-widest text-white/50">QR Ph · {peso(data?.amount || 0)}</p>
              {data?.qrCodeUrl ? (
                <div className="mx-auto mb-5 w-fit rounded-2xl bg-white p-4"><img src={data.qrCodeUrl} alt="QR Code" className="h-48 w-48 object-contain" /></div>
              ) : (
                <div className="mx-auto mb-5 flex h-48 w-48 items-center justify-center rounded-2xl bg-white/10"><Loader2 size={32} className="animate-spin text-[#bf9b30]" /></div>
              )}
              <p className="text-[11px] text-white/45">Open your banking app and scan the QR code above.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewModal({ open, booking, user, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (!open) { setRating(0); setHover(0); setTitle(''); setComment(''); setDone(false); setSubmitting(false); } }, [open]);
  if (!open) return null;
  const submit = async (e) => {
    e.preventDefault();
    if (!rating || !comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: user?.id, roomId: booking?.roomId || null, hotelId: booking?.hotelId || null, rating, title, comment }) });
      setDone(true);
    } catch {} finally { setSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-[#bf9b30]/40 bg-[#15120d]/95 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />
        <div className="p-8 text-white">
          <button type="button" onClick={onClose} className="absolute right-5 top-5 text-white/40 hover:text-white"><X size={18} /></button>
          {done ? (
            <div className="py-6 text-center"><CheckCircle2 size={48} className="mx-auto mb-4 text-[#bf9b30]" /><h3 className="text-xl font-black">Thank You!</h3><p className="mb-6 mt-2 text-sm text-white/60">Your review has been submitted.</p><button type="button" onClick={onClose} className="rounded-xl bg-[#bf9b30] px-8 py-3 text-[11px] font-black uppercase tracking-widest text-[#0d0c0a]">Close</button></div>
          ) : (
            <>
              <div className="mb-6 text-center"><Sparkles size={28} className="mx-auto mb-3 text-[#bf9b30]" /><h3 className="text-xl font-black">Share Your Experience</h3></div>
              <form onSubmit={submit} className="space-y-4">
                <div><label className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">Rating</label><div className="flex gap-2">{[1,2,3,4,5].map((n) => <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}><Star size={24} fill={(hover || rating) >= n ? '#bf9b30' : 'transparent'} className={(hover || rating) >= n ? 'text-[#bf9b30]' : 'text-white/30'} /></button>)}</div></div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarize your stay..." className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#bf9b30]/70" />
                <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell future guests about your experience..." className="w-full resize-none rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#bf9b30]/70" />
                <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/20 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Skip</button><button type="submit" disabled={submitting || !rating || !comment.trim()} className="flex-1 rounded-xl bg-[#bf9b30] py-3 text-[11px] font-black uppercase tracking-widest text-[#0d0c0a] disabled:opacity-40">{submitting ? 'Submitting...' : 'Submit'}</button></div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ open, booking, hasReviewed, onReview, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1900] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-[#bf9b30]/40 bg-[#15120d]/95 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />
        <div className="p-10 text-center text-white">
          <CheckCircle2 size={56} className="mx-auto mb-5 text-[#bf9b30]" />
          <h3 className="text-2xl font-black">Booking Confirmed!</h3>
          <div className="mb-8 mt-6 space-y-2 rounded-xl border border-white/15 bg-white/5 p-5 text-left">
            <div className="flex justify-between text-sm"><span className="text-white/50">Booking #</span><span className="font-black text-[#bf9b30]">{booking?.bookingNumber}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/50">Nights</span><span className="font-bold">{booking?.totalNights}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/50">Subtotal</span><span className="font-bold">{peso(booking?.subtotalAmount || booking?.baseAmount || 0)}</span></div>
            {!!Number(booking?.privilegeDiscountAmount || 0) && <div className="flex justify-between text-sm"><span className="text-white/50">Privilege savings</span><span className="font-bold text-emerald-300">-{peso(booking?.privilegeDiscountAmount || 0)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-white/50">VAT ({booking?.vatPercent || VAT_PERCENT}%)</span><span className="font-bold">{peso(booking?.vatAmount || 0)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/50">Tax ({booking?.taxPercent || TAX_PERCENT}%)</span><span className="font-bold">{peso(booking?.taxAmount || 0)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/50">Total</span><span className="font-black">{peso(booking?.totalAmount || 0)}</span></div>
          </div>
          <div className="flex flex-col gap-3">
            {hasReviewed ? <div className="flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-[11px] font-black uppercase tracking-widest"><CheckCircle2 size={14} />Review Submitted</div> : <button type="button" onClick={onReview} className="flex items-center justify-center gap-2 rounded-xl bg-[#bf9b30] py-3.5 text-[11px] font-black uppercase tracking-widest text-[#0d0c0a]"><Star size={14} />Leave a Review</button>}
            <button type="button" onClick={onClose} className="rounded-xl border border-white/20 py-3.5 text-[11px] font-black uppercase tracking-widest text-white/60">Back to Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatePickerField({ label, value, onChange, helperText, isDateDisabled, disabled, minMonthValue }) {
  const pickerRef = useRef(null);
  const fallbackMonth = parseDateValue(value) || parseDateValue(minMonthValue) || new Date();
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(fallbackMonth));
  const selectedDate = parseDateValue(value);

  useEffect(() => {
    setMonthCursor(startOfMonth(selectedDate || parseDateValue(minMonthValue) || new Date()));
  }, [value, minMonthValue, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const calendarDays = buildCalendarDays(monthCursor);

  return (
    <div ref={pickerRef} className="relative">
      <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-left text-sm font-semibold text-white outline-none transition hover:border-[#bf9b30]/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{dateButtonLabel(value)}</span>
        <CalendarDays size={16} className="text-[#bf9b30]" />
      </button>
      {helperText ? <p className="mt-2 text-[11px] leading-relaxed text-white/45">{helperText}</p> : null}

      {open && !disabled ? (
        <div className="absolute left-0 z-30 mt-3 w-[320px] max-w-[calc(100vw-2rem)] rounded-[1.4rem] border border-[#bf9b30]/25 bg-[#15120d] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-[#bf9b30]/40 hover:text-white"><ChevronLeft size={16} /></button>
            <p className="text-sm font-black text-white">{monthFormatter.format(monthCursor)}</p>
            <button type="button" onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-[#bf9b30]/40 hover:text-white"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            {weekLabels.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const isOutsideMonth = day.getMonth() !== monthCursor.getMonth();
              const isDisabled = isDateDisabled(day);
              const isSelected = selectedDate ? sameDate(day, selectedDate) : false;
              const baseClasses = isSelected
                ? 'border-[#bf9b30] bg-[#bf9b30] text-[#0d0c0a]'
                : isDisabled
                  ? 'cursor-not-allowed border-white/5 bg-white/[0.03] text-white/18'
                  : 'border-white/10 bg-white/[0.06] text-white transition hover:border-[#bf9b30]/40 hover:text-[#f2d485]';

              return (
                <button
                  key={formatDateValue(day)}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(formatDateValue(day));
                    setOpen(false);
                  }}
                  className={`aspect-square rounded-xl border text-sm font-bold ${baseClasses} ${isOutsideMonth && !isSelected ? 'opacity-50' : ''}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-white/35">Past dates and booked days are automatically locked.</p>
        </div>
      ) : null}
    </div>
  );
}

export default function Booking() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roomId = params.get('roomId');
  const today = formatDateValue(new Date());
  const tomorrow = formatDateValue(addDays(new Date(), 1));
  const [room, setRoom] = useState(null);
  const [sessionUser, setSessionUser] = useState(getSession());
  const [membership, setMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [blockedRanges, setBlockedRanges] = useState([]);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [guests, setGuests] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [preferences, setPreferences] = useState([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isDark, setIsDark] = useState(() => { const t = localStorage.getItem('theme'); return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; });
  useEffect(() => {
    const syncTheme = () => { const t = localStorage.getItem('theme'); setIsDark(t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches); };
    const syncUser = () => setSessionUser(getSession());
    window.addEventListener('themeChanged', syncTheme);
    window.addEventListener('storage', syncTheme);
    window.addEventListener('userUpdated', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('themeChanged', syncTheme);
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('userUpdated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);
  useEffect(() => {
    if (!roomId) return undefined;
    let dead = false;
    setLoadingRoom(true);
    fetch('/api/rooms').then((r) => r.json()).then((d) => { if (!dead) setRoom((d.rooms || []).find((x) => String(x.id) === String(roomId)) || null); }).catch(() => { if (!dead) setRoom(null); }).finally(() => { if (!dead) setLoadingRoom(false); });
    return () => { dead = true; };
  }, [roomId]);
  useEffect(() => {
    if (!room?.id) {
      setBlockedRanges([]);
      return undefined;
    }
    let dead = false;
    setAvailabilityLoading(true);
    fetch(`/api/rooms/${room.id}/availability`).then((r) => r.json().catch(() => ({})).then((body) => ({ ok: r.ok, body }))).then(({ ok, body }) => {
      if (!dead) setBlockedRanges(ok ? (body.blockedRanges || []) : []);
    }).catch(() => {
      if (!dead) setBlockedRanges([]);
    }).finally(() => {
      if (!dead) setAvailabilityLoading(false);
    });
    return () => { dead = true; };
  }, [room?.id]);
  useEffect(() => {
    if (!sessionUser?.id) { setMembership(null); return undefined; }
    let dead = false;
    setMembershipLoading(true);
    fetch(`/api/innova/summary/${sessionUser.id}`).then((r) => r.json().catch(() => ({})).then((body) => ({ ok: r.ok, body }))).then(({ ok, body }) => { if (!dead) setMembership(ok ? body : null); }).catch(() => { if (!dead) setMembership(null); }).finally(() => { if (!dead) setMembershipLoading(false); });
    return () => { dead = true; };
  }, [sessionUser?.id]);
  useEffect(() => {
    if (!sessionUser?.id || !room?.id) { setHasReviewed(false); return undefined; }
    let dead = false;
    fetch('/api/reviews').then((r) => r.json().catch(() => ({}))).then((body) => {
      if (dead) return;
      const reviews = body.reviews || [];
      setHasReviewed(reviews.some((review) => review.customerId === sessionUser.id && (review.roomId === room.id || (review.roomId == null && review.roomName?.toLowerCase().includes(room.roomName?.toLowerCase())))));
    }).catch(() => { if (!dead) setHasReviewed(false); });
    return () => { dead = true; };
  }, [sessionUser?.id, room?.id, room?.roomName]);
  const blockedNightKeys = new Set();
  blockedRanges.forEach((range) => {
    let cursor = parseDateValue(range.checkIn);
    const rangeEnd = parseDateValue(range.checkOut);
    while (cursor && rangeEnd && cursor < rangeEnd) {
      blockedNightKeys.add(formatDateValue(cursor));
      cursor = addDays(cursor, 1);
    }
  });
  const hasBookingConflict = (startValue, endValue) => blockedRanges.some((range) => {
    if (!range?.checkIn || !range?.checkOut) return false;
    return startValue < range.checkOut && endValue > range.checkIn;
  });
  const isCheckInDateDisabled = (date) => {
    const key = formatDateValue(date);
    return !key || key < today || blockedNightKeys.has(key);
  };
  const isCheckOutDateDisabled = (date, startValue = checkIn) => {
    const key = formatDateValue(date);
    if (!key || !startValue) return true;
    if (key <= startValue) return true;
    return hasBookingConflict(startValue, key);
  };
  const findNextAvailableCheckIn = (startValue = today) => {
    for (let offset = 0; offset < 370; offset += 1) {
      const candidateDate = addDays(startValue, offset);
      if (candidateDate && !isCheckInDateDisabled(candidateDate)) return formatDateValue(candidateDate);
    }
    return startValue;
  };
  const findNextAvailableCheckOut = (startValue) => {
    for (let offset = 1; offset < 370; offset += 1) {
      const candidateDate = addDays(startValue, offset);
      if (candidateDate && !isCheckOutDateDisabled(candidateDate, startValue)) return formatDateValue(candidateDate);
    }
    return formatDateValue(addDays(startValue, 1));
  };
  useEffect(() => {
    if (!room?.id) return;
    const parsedCheckIn = parseDateValue(checkIn);
    if (!parsedCheckIn || isCheckInDateDisabled(parsedCheckIn)) {
      const nextCheckIn = findNextAvailableCheckIn(today);
      if (nextCheckIn !== checkIn) setCheckIn(nextCheckIn);
      return;
    }
    const parsedCheckOut = parseDateValue(checkOut);
    if (!parsedCheckOut || isCheckOutDateDisabled(parsedCheckOut, checkIn)) {
      const nextCheckOut = findNextAvailableCheckOut(checkIn);
      if (nextCheckOut !== checkOut) setCheckOut(nextCheckOut);
    }
  }, [room?.id, blockedRanges, checkIn, checkOut, today]);
  const nights = Math.max(0, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000));
  const baseTotal = room ? nights * Number(room.price || 0) : 0;
  const activePrivilege = membership?.privilege?.isActive ? membership.privilege : null;
  const discountPercent = Number(membership?.bookingPrivilege?.discountPercent || 0);
  const discountAmount = discountPercent ? Number((baseTotal * discountPercent / 100).toFixed(2)) : 0;
  const subtotalAfterDiscount = Number(Math.max(0, baseTotal - discountAmount).toFixed(2));
  const vatAmount = Number((subtotalAfterDiscount * (VAT_PERCENT / 100)).toFixed(2));
  const taxAmount = Number((subtotalAfterDiscount * (TAX_PERCENT / 100)).toFixed(2));
  const total = Number((subtotalAfterDiscount + vatAmount + taxAmount).toFixed(2));
  const togglePref = (value) => setPreferences((prev) => prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]);
  const inputCls = 'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-[#bf9b30]/70';
  const selectCls = `w-full appearance-none rounded-xl border border-white/20 px-4 py-3.5 text-sm font-semibold outline-none focus:border-[#bf9b30]/70 ${isDark ? 'bg-[#1a1208] text-white' : 'bg-[#2a1f08] text-white'}`;
  const nextOpenDate = findNextAvailableCheckIn(today);
  const shownBlockedRanges = blockedRanges.slice(0, 3);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!sessionUser?.id) { sessionStorage.setItem('returnTo', window.location.pathname + window.location.search); navigate('/login'); return; }
    if (!room) { setError('No room selected.'); return; }
    if (nights < 1) { setError('Check-out must be after check-in.'); return; }
    if (isCheckInDateDisabled(parseDateValue(checkIn))) { setError('Selected check-in date is no longer available.'); return; }
    if (isCheckOutDateDisabled(parseDateValue(checkOut), checkIn)) { setError('Selected stay overlaps an existing booking. Please choose different dates.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: sessionUser.id, roomId: room.id, checkIn, checkOut, checkInTime, checkOutTime, guests, paymentMethod, specialRequests: [preferences.join(', '), specialRequests].filter(Boolean).join(' | ') }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Booking failed.');
      setBooking(body);
      if (['card', 'gcash', 'maya', 'qrph', 'online'].includes(paymentMethod)) {
        const payRes = await fetch('/api/payment/create-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reservationId: body.bookingId, paymentMethod }) });
        const pay = await payRes.json().catch(() => ({}));
        if (payRes.status === 503) throw new Error('PayMongo is not configured yet. Please use Cash on Arrival or contact support.');
        if (!payRes.ok) throw new Error(pay.error || 'Payment link creation failed.');
        if (pay.isQrPayment && pay.qrCodeUrl) { setQrData({ qrCodeUrl: pay.qrCodeUrl, intentId: pay.intentId, amount: pay.amount, bookingNumber: pay.bookingNumber }); return; }
        window.location.href = pay.checkoutUrl;
        return;
      }
      setShowSuccess(true);
    } catch (err) {
      setError(err.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <SuccessModal open={showSuccess} booking={booking} hasReviewed={hasReviewed} onReview={() => { setShowSuccess(false); setShowReview(true); }} onClose={() => { setShowSuccess(false); navigate('/'); }} />
      <ReviewModal open={showReview} booking={booking} user={sessionUser} onClose={() => { setShowReview(false); navigate('/'); }} />
      <QrModal open={!!qrData} data={qrData} onPaid={() => { setQrData(null); setShowSuccess(true); }} onClose={() => setQrData(null)} />
      <div className="booking-page-shell relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 bg-black/60" />
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,155,48,0.12)_0%,transparent_60%)]" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-24">
          <div className="mb-12 text-center"><p className="mb-3 text-[10px] font-black uppercase tracking-[0.4em] text-[#bf9b30]">Innova HMS</p><h1 className="text-5xl font-black tracking-tighter text-white md:text-6xl">Reserve Your <span className="font-serif font-light italic text-[#bf9b30]">Room Now</span></h1><p className="mt-4 text-sm text-white/50">Privilege-aware pricing, payment, and booking in one flow.</p></div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {loadingRoom ? <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/15 bg-white/8 p-6 backdrop-blur-xl"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#bf9b30] border-t-transparent" /><span className="text-sm text-white/50">Loading room...</span></div> : room ? <div className="overflow-hidden rounded-[1.5rem] border border-[#bf9b30]/30 bg-white/8 backdrop-blur-xl"><div className="flex gap-4 p-5"><img src={resolveImg(room.images?.[0])} alt={room.roomName} onError={(e) => { e.currentTarget.src = '/images/room1.jpg'; }} className="h-20 w-24 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="mb-1 text-[9px] font-black uppercase tracking-widest text-[#bf9b30]">{room.roomType}</p><h3 className="truncate text-lg font-black text-white">{room.roomName}</h3><p className="mt-1 flex items-center gap-1 text-xs text-white/50"><MapPin size={10} className="text-[#bf9b30]" />{room.location_description || 'Innova HMS'}</p>{discountPercent > 0 && <p className="mt-3 inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">{activePrivilege?.packageName || 'Privilege'} saves you {discountPercent}%</p>}</div><div className="text-right"><p className="text-xl font-black text-[#bf9b30]">{peso(room.price || 0)}</p><p className="text-[9px] uppercase tracking-widest text-white/40">/ night</p></div></div></div> : <div className="rounded-[1.5rem] border border-white/15 bg-white/8 p-6 text-center text-sm text-white/40 backdrop-blur-xl">No room selected. <button type="button" onClick={() => navigate('/recommendations')} className="text-[#bf9b30] underline">Browse rooms</button></div>}
              <form onSubmit={submit}>
                <div className="mb-4 rounded-[1.5rem] border border-white/15 bg-white/8 p-6 backdrop-blur-xl">
                  <div className="mb-5 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#bf9b30] text-[11px] font-black text-[#0d0c0a]">1</span><h2 className="text-sm font-black uppercase tracking-widest text-white">Stay Duration & Arrival Time</h2></div>
                  <div className="mb-4 rounded-2xl border border-[#bf9b30]/20 bg-[#bf9b30]/8 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f1d27b]">{availabilityLoading ? 'Checking room availability...' : 'Calendar auto-lock enabled'}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/70">Past dates and booked days are disabled automatically.{nextOpenDate ? ` Next available check-in is ${dateButtonLabel(nextOpenDate)}.` : ''}</p>
                    {shownBlockedRanges.length ? <div className="mt-3 flex flex-wrap gap-2">{shownBlockedRanges.map((range) => <span key={`${range.bookingNumber}-${range.checkIn}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">{dateButtonLabel(range.checkIn)} to {dateButtonLabel(addDays(range.checkOut, -1) || range.checkOut)}</span>)}</div> : null}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DatePickerField label="Check-In Date" value={checkIn} onChange={setCheckIn} minMonthValue={today} isDateDisabled={isCheckInDateDisabled} helperText="Unavailable days are already disabled in the calendar." />
                    <DatePickerField label="Check-Out Date" value={checkOut} onChange={setCheckOut} minMonthValue={checkIn || today} isDateDisabled={(date) => isCheckOutDateDisabled(date, checkIn)} helperText="Only valid checkout dates after your selected arrival stay clickable." disabled={!checkIn} />
                    <div><label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">Expected Arrival Time</label><input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={inputCls} /></div>
                    <div><label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">Expected Check-Out Time</label><input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={inputCls} /></div>
                  </div>
                </div>
                <div className="mb-4 rounded-[1.5rem] border border-white/15 bg-white/8 p-6 backdrop-blur-xl"><div className="mb-5 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#bf9b30] text-[11px] font-black text-[#0d0c0a]">2</span><h2 className="text-sm font-black uppercase tracking-widest text-white">Guests & Payment</h2></div><div className="grid grid-cols-2 gap-4"><div><label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">Number of Guests</label><div className="flex items-center overflow-hidden rounded-xl border border-white/20 bg-white/10"><button type="button" onClick={() => setGuests((v) => Math.max(1, v - 1))} className="px-4 py-3.5 text-lg font-black text-white/60">-</button><span className="flex-1 text-center text-sm font-black text-white">{guests}</span><button type="button" onClick={() => setGuests((v) => Math.min(10, v + 1))} className="px-4 py-3.5 text-lg font-black text-white/60">+</button></div></div><div><label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">Payment Method</label><div className="relative"><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={selectCls}><option value="cash">Cash on Arrival</option><option value="qrph">QR Ph (QR Code Payment)</option><option value="card">Credit / Debit Card</option><option value="gcash" disabled>GCash (needs account activation)</option><option value="maya" disabled>Maya (needs account activation)</option></select><div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z" /></svg></div></div></div></div></div>
                <div className="mb-4 rounded-[1.5rem] border border-white/15 bg-white/8 p-6 backdrop-blur-xl"><div className="mb-5 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#bf9b30] text-[11px] font-black text-[#0d0c0a]">3</span><h2 className="text-sm font-black uppercase tracking-widest text-white">Smart Preferences</h2></div><div className="mb-4 flex flex-wrap gap-2">{prefs.map((item) => <button key={item} type="button" onClick={() => togglePref(item)} className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${preferences.includes(item) ? 'border-[#bf9b30] bg-[#bf9b30] text-[#0d0c0a]' : 'border-white/20 text-white/60'}`}>{item}</button>)}</div><textarea rows={3} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="e.g., traveling with seniors, need extra desk space..." className={`${inputCls} resize-none`} /></div>
                {error && <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">!</span><p className="text-[11px] font-bold uppercase tracking-tight text-red-300">{error}</p></div>}
                <button type="submit" disabled={submitting || !room || availabilityLoading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#bf9b30] py-4 text-[11px] font-black uppercase tracking-[0.25em] text-[#0d0c0a] shadow-[0_8px_32px_rgba(191,155,48,0.4)] disabled:opacity-50">{submitting ? 'Processing...' : sessionUser?.id ? 'Confirm Reservation' : 'Sign In to Reserve'} {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}</button>
              </form>
            </div>
            <div className="space-y-4"><div className="sticky top-24 rounded-[1.5rem] border border-[#bf9b30]/30 bg-white/8 p-6 backdrop-blur-xl"><h3 className="mb-5 text-[10px] font-black uppercase tracking-[0.25em] text-[#bf9b30]">Booking Summary</h3>{sessionUser?.id && <div className="mb-5 rounded-2xl border border-[#bf9b30]/25 bg-[#bf9b30]/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f2d485]">{membershipLoading ? 'Checking customer privileges...' : (activePrivilege?.packageName ? `${activePrivilege.packageName} privilege active` : 'Standard customer access')}</p><p className="mt-2 text-[11px] leading-relaxed text-white/70">{discountPercent > 0 ? `${discountPercent}% booking discount will be applied automatically before VAT and tax are added.` : 'Upgrade your customer privilege plan to unlock paid booking discounts and bonus points.'}</p></div>}<div className="mb-5 space-y-3">{[{ label: 'Room', value: room?.roomName || '--' }, { label: 'Check-in', value: checkIn ? `${checkIn} at ${checkInTime}` : '--' }, { label: 'Check-out', value: checkOut ? `${checkOut} at ${checkOutTime}` : '--' }, { label: 'Nights', value: nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : '--' }, { label: 'Guests', value: guests }, { label: 'Payment', value: paymentMethod }].map((item) => <div key={item.label} className="flex items-start justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{item.label}</span><span className="text-right text-[11px] font-bold text-white">{item.value}</span></div>)}</div><div className="mb-5 rounded-2xl border border-white/10 bg-black/15 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Availability</p><p className="mt-2 text-sm font-black text-white">{availabilityLoading ? 'Refreshing...' : `${blockedRanges.length} blocked booking range${blockedRanges.length === 1 ? '' : 's'} found`}</p><p className="mt-1 text-[11px] leading-relaxed text-white/55">The picker already prevents past dates and booked stay windows from being selected.</p></div><div className="border-t border-white/10 pt-4"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Base room total</span><span className="text-[11px] font-bold text-white">{baseTotal > 0 ? peso(baseTotal) : '--'}</span></div>{discountPercent > 0 && <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">{activePrivilege?.packageName || 'Privilege'} discount</span><span className="text-[11px] font-bold text-emerald-300">-{peso(discountAmount)} ({discountPercent}%)</span></div>}<div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Subtotal</span><span className="text-[11px] font-bold text-white">{subtotalAfterDiscount > 0 ? peso(subtotalAfterDiscount) : '--'}</span></div><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-white/40">VAT ({VAT_PERCENT}%)</span><span className="text-[11px] font-bold text-white">{subtotalAfterDiscount > 0 ? peso(vatAmount) : '--'}</span></div><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tax ({TAX_PERCENT}%)</span><span className="text-[11px] font-bold text-white">{subtotalAfterDiscount > 0 ? peso(taxAmount) : '--'}</span></div><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-white/50">Total</span><span className="text-2xl font-black text-[#bf9b30]">{total > 0 ? peso(total) : '--'}</span></div>{room && nights > 0 && <p className="mt-1 text-right text-[9px] text-white/30">{peso(room.price || 0)} x {nights} night{nights > 1 ? 's' : ''}</p>}</div>{!sessionUser?.id && <div className="mt-5 rounded-xl border border-[#bf9b30]/25 bg-[#bf9b30]/8 p-3 text-center"><p className="mb-2 text-[10px] text-white/50">Sign in to complete your booking</p><button type="button" onClick={() => { sessionStorage.setItem('returnTo', window.location.pathname + window.location.search); navigate('/login'); }} className="text-[10px] font-black uppercase tracking-widest text-[#bf9b30] underline underline-offset-2">Sign In</button></div>}</div></div>
          </div>
        </div>
        <style>{`.booking-page-shell{background-attachment:fixed;background-image:url("/images/herobg.jpg");background-position:center;background-repeat:no-repeat;background-size:cover;}`}</style>
      </div>
    </>
  );
}
