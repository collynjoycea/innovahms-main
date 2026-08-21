import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="h-1.5 w-full bg-emerald-500" />
        <div className="p-6 text-center">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200">
            <X size={18} />
          </button>
          {paid ? (
            <>
              <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-400" />
              <h3 className="text-xl font-bold">Payment Confirmed</h3>
            </>
          ) : (
            <>
              <QrCode size={28} className="mx-auto mb-2 text-emerald-400" />
              <h3 className="text-xl font-bold">Scan to Pay</h3>
              <p className="mb-4 mt-1 text-xs text-slate-400">QR Ph • {peso(data?.amount || 0)}</p>
              {data?.qrCodeUrl ? (
                <div className="mx-auto mb-4 w-fit rounded-xl bg-white p-3 shadow-inner">
                  <img src={data.qrCodeUrl} alt="QR Code" className="h-44 w-44 object-contain" />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-44 w-44 items-center justify-center rounded-xl bg-slate-800">
                  <Loader2 size={28} className="animate-spin text-emerald-400" />
                </div>
              )}
              <p className="text-xs text-slate-400">Open your banking app and scan the QR code above.</p>
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

  useEffect(() => {
    if (!open) {
      setRating(0);
      setHover(0);
      setTitle('');
      setComment('');
      setDone(false);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!rating || !comment.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user?.id,
          roomId: booking?.roomId || null,
          hotelId: booking?.hotelId || null,
          rating,
          title,
          comment,
        }),
      });
      setDone(true);
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="h-1.5 w-full bg-emerald-500" />
        <div className="p-6">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200">
            <X size={18} />
          </button>
          {done ? (
            <div className="py-4 text-center">
              <CheckCircle2 size={44} className="mx-auto mb-3 text-emerald-400" />
              <h3 className="text-xl font-bold">Thank You</h3>
              <p className="mb-5 mt-1 text-sm text-slate-400">Your review has been submitted.</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 text-center">
                <Sparkles size={24} className="mx-auto mb-2 text-emerald-400" />
                <h3 className="text-xl font-bold">Share Your Experience</h3>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-300">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(n)}
                      >
                        <Star
                          size={22}
                          fill={(hover || rating) >= n ? '#10b981' : 'transparent'}
                          className={(hover || rating) >= n ? 'text-emerald-500' : 'text-slate-600'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your stay..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell future guests about your experience..."
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-lg border border-slate-700 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !rating || !comment.trim()}
                    className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
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

function SuccessModal({ open, booking, hasReviewed, onReview, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1900] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="h-1.5 w-full bg-emerald-500" />
        <div className="p-8 text-center">
          <CheckCircle2 size={52} className="mx-auto mb-3 text-emerald-400" />
          <h3 className="text-2xl font-bold">Booking Confirmed</h3>
          <div className="my-6 space-y-2 rounded-xl border border-slate-800 bg-slate-800/50 p-4 text-left text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Booking #</span><span className="font-semibold text-emerald-400">{booking?.bookingNumber}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Nights</span><span className="font-medium">{booking?.totalNights}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="font-medium">{peso(booking?.subtotalAmount || booking?.baseAmount || 0)}</span></div>
            {!!Number(booking?.privilegeDiscountAmount || 0) && (
              <div className="flex justify-between"><span className="text-slate-400">Privilege savings</span><span className="font-medium text-emerald-400">-{peso(booking?.privilegeDiscountAmount || 0)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-400">VAT ({booking?.vatPercent || VAT_PERCENT}%)</span><span className="font-medium">{peso(booking?.vatAmount || 0)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Tax ({booking?.taxPercent || TAX_PERCENT}%)</span><span className="font-medium">{peso(booking?.taxAmount || 0)}</span></div>
            <div className="flex justify-between border-t border-slate-700/60 pt-2 font-bold"><span className="text-slate-300">Total</span><span className="text-slate-100">{peso(booking?.totalAmount || 0)}</span></div>
          </div>
          <div className="flex flex-col gap-2.5">
            {hasReviewed ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-800/40 py-3 text-xs font-semibold text-emerald-300">
                <CheckCircle2 size={14} /> Review Submitted
              </div>
            ) : (
              <button
                type="button"
                onClick={onReview}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Star size={14} /> Leave a Review
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatePickerField({ label, value, onChange, helperText, isDateDisabled, disabled, minMonthValue }) {
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const fallbackMonth = parseDateValue(value) || parseDateValue(minMonthValue) || new Date();
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(fallbackMonth));
  const [panelStyle, setPanelStyle] = useState(null);
  const selectedDate = parseDateValue(value);

  useEffect(() => {
    setMonthCursor(startOfMonth(selectedDate || parseDateValue(minMonthValue) || new Date()));
  }, [value, minMonthValue, open]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePanelPosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(320, Math.max(280, viewportWidth - 32));
      const estimatedHeight = 360;
      const spaceBelow = viewportHeight - rect.bottom;
      const top = spaceBelow >= estimatedHeight
        ? rect.bottom + 8
        : Math.max(16, rect.top - estimatedHeight - 8);
      const left = Math.min(Math.max(16, rect.left), viewportWidth - width - 16);

      setPanelStyle({ left: `${left}px`, top: `${top}px`, width: `${width}px` });
    };

    updatePanelPosition();

    const onPointerDown = (event) => {
      const clickedTrigger = pickerRef.current?.contains(event.target);
      const clickedPanel = panelRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedPanel) setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  const calendarDays = buildCalendarDays(monthCursor);
  const calendarPanel = open && !disabled && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={panelRef}
        style={panelStyle || undefined}
        className="fixed z-[2200] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{monthFormatter.format(monthCursor)}</p>
          <button
            type="button"
            onClick={() => setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
          {weekLabels.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const isOutsideMonth = day.getMonth() !== monthCursor.getMonth();
            const isDisabled = isDateDisabled(day);
            const isSelected = selectedDate ? sameDate(day, selectedDate) : false;
            const baseClasses = isSelected
              ? 'bg-emerald-600 text-white font-bold'
              : isDisabled
                ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400';

            return (
              <button
                key={formatDateValue(day)}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  onChange(formatDateValue(day));
                  setOpen(false);
                }}
                className={`aspect-square rounded-lg text-xs transition ${baseClasses} ${isOutsideMonth && !isSelected ? 'opacity-40' : ''}`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Booked or past dates are unavailable.</p>
      </div>,
      document.body,
    )
    : null;

  return (
    <div ref={pickerRef} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-left text-sm text-slate-800 shadow-sm transition hover:border-emerald-500 focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
      >
        <span>{dateButtonLabel(value)}</span>
        <CalendarDays size={16} className="text-emerald-600 dark:text-emerald-400" />
      </button>
      {helperText ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p> : null}
      {calendarPanel}
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
  const [isDark, setIsDark] = useState(() => {
    const t = localStorage.getItem('theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const syncTheme = () => {
      const t = localStorage.getItem('theme');
      setIsDark(t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
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
    fetch('/api/rooms')
      .then((r) => r.json())
      .then((d) => {
        if (!dead) setRoom((d.rooms || []).find((x) => String(x.id) === String(roomId)) || null);
      })
      .catch(() => {
        if (!dead) setRoom(null);
      })
      .finally(() => {
        if (!dead) setLoadingRoom(false);
      });
    return () => { dead = true; };
  }, [roomId]);

  useEffect(() => {
    if (!room?.id) {
      setBlockedRanges([]);
      return undefined;
    }
    let dead = false;
    setAvailabilityLoading(true);
    fetch(`/api/rooms/${room.id}/availability`)
      .then((r) => r.json().catch(() => ({})).then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!dead) setBlockedRanges(ok ? (body.blockedRanges || []) : []);
      })
      .catch(() => {
        if (!dead) setBlockedRanges([]);
      })
      .finally(() => {
        if (!dead) setAvailabilityLoading(false);
      });
    return () => { dead = true; };
  }, [room?.id]);

  useEffect(() => {
    if (!sessionUser?.id) { setMembership(null); return undefined; }
    let dead = false;
    setMembershipLoading(true);
    fetch(`/api/innova/summary/${sessionUser.id}`)
      .then((r) => r.json().catch(() => ({})).then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => { if (!dead) setMembership(ok ? body : null); })
      .catch(() => { if (!dead) setMembership(null); })
      .finally(() => { if (!dead) setMembershipLoading(false); });
    return () => { dead = true; };
  }, [sessionUser?.id]);

  useEffect(() => {
    if (!sessionUser?.id || !room?.id) { setHasReviewed(false); return undefined; }
    let dead = false;
    fetch('/api/reviews')
      .then((r) => r.json().catch(() => ({})))
      .then((body) => {
        if (dead) return;
        const reviews = body.reviews || [];
        setHasReviewed(reviews.some((review) => review.customerId === sessionUser.id && (review.roomId === room.id || (review.roomId == null && review.roomName?.toLowerCase().includes(room.roomName?.toLowerCase())))));
      })
      .catch(() => { if (!dead) setHasReviewed(false); });
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

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400';
  const selectCls = 'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  const nextOpenDate = findNextAvailableCheckIn(today);
  const shownBlockedRanges = blockedRanges.slice(0, 3);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!sessionUser?.id) {
      sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
      navigate('/login');
      return;
    }
    if (!room) { setError('No room selected.'); return; }
    if (nights < 1) { setError('Check-out must be after check-in.'); return; }
    if (isCheckInDateDisabled(parseDateValue(checkIn))) { setError('Selected check-in date is no longer available.'); return; }
    if (isCheckOutDateDisabled(parseDateValue(checkOut), checkIn)) { setError('Selected stay overlaps an existing booking. Please choose different dates.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: sessionUser.id,
          roomId: room.id,
          checkIn,
          checkOut,
          checkInTime,
          checkOutTime,
          guests,
          paymentMethod,
          specialRequests: [preferences.join(', '), specialRequests].filter(Boolean).join(' | '),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Booking failed.');
      setBooking(body);

      if (['card', 'gcash', 'maya', 'qrph', 'online'].includes(paymentMethod)) {
        const payRes = await fetch('/api/payment/create-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId: body.bookingId, paymentMethod }),
        });
        const pay = await payRes.json().catch(() => ({}));
        if (payRes.status === 503) throw new Error('Payment gateway is not configured. Please choose Cash on Arrival.');
        if (!payRes.ok) throw new Error(pay.error || 'Payment link creation failed.');
        if (pay.isQrPayment && pay.qrCodeUrl) {
          setQrData({ qrCodeUrl: pay.qrCodeUrl, intentId: pay.intentId, amount: pay.amount, bookingNumber: pay.bookingNumber });
          return;
        }
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
      <SuccessModal
        open={showSuccess}
        booking={booking}
        hasReviewed={hasReviewed}
        onReview={() => { setShowSuccess(false); setShowReview(true); }}
        onClose={() => { setShowSuccess(false); navigate('/'); }}
      />
      <ReviewModal
        open={showReview}
        booking={booking}
        user={sessionUser}
        onClose={() => { setShowReview(false); navigate('/'); }}
      />
      <QrModal
        open={!!qrData}
        data={qrData}
        onPaid={() => { setQrData(null); setShowSuccess(true); }}
        onClose={() => setQrData(null)}
      />

      <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="mb-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Innova HMS</span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Room Reservation</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Select dates, manage preferences, and complete your booking.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {loadingRoom ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Loader2 size={20} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-slate-500">Loading room details...</span>
                </div>
              ) : room ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex gap-4 p-5">
                    <img
                      src={resolveImg(room.images?.[0])}
                      alt={room.roomName}
                      onError={(e) => { e.currentTarget.src = '/images/room1.jpg'; }}
                      className="h-20 w-24 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{room.roomType}</span>
                      <h3 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">{room.roomName}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin size={12} className="text-emerald-600 dark:text-emerald-400" />
                        {room.location_description || 'Innova HMS'}
                      </p>
                      {discountPercent > 0 && (
                        <span className="mt-2 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          {activePrivilege?.packageName || 'Privilege'} saved {discountPercent}%
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{peso(room.price || 0)}</p>
                      <p className="text-xs text-slate-400">/ night</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  No room selected.{' '}
                  <button type="button" onClick={() => navigate('/recommendations')} className="text-emerald-600 hover:underline dark:text-emerald-400">
                    Browse rooms
                  </button>
                </div>
              )}

              <form onSubmit={submit} className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">1</span>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Dates & Times</h2>
                  </div>

                  <div className="mb-5 rounded-lg bg-emerald-50/60 p-3.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <p className="font-semibold">{availabilityLoading ? 'Checking room availability...' : 'Calendar Availability'}</p>
                    <p className="mt-0.5 leading-relaxed text-emerald-700/80 dark:text-emerald-400/80">
                      Unavailable dates are automatically disabled.{nextOpenDate ? ` Next open check-in is ${dateButtonLabel(nextOpenDate)}.` : ''}
                    </p>
                    {shownBlockedRanges.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {shownBlockedRanges.map((range) => (
                          <span key={`${range.bookingNumber}-${range.checkIn}`} className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {dateButtonLabel(range.checkIn)} to {dateButtonLabel(addDays(range.checkOut, -1) || range.checkOut)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DatePickerField label="Check-In Date" value={checkIn} onChange={setCheckIn} minMonthValue={today} isDateDisabled={isCheckInDateDisabled} helperText="Unavailable dates are disabled." />
                    <DatePickerField label="Check-Out Date" value={checkOut} onChange={setCheckOut} minMonthValue={checkIn || today} isDateDisabled={(date) => isCheckOutDateDisabled(date, checkIn)} helperText="Valid stay durations only." disabled={!checkIn} />
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Check-In Time</label>
                      <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Check-Out Time</label>
                      <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">2</span>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Guests & Payment</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Number of Guests</label>
                      <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800">
                        <button type="button" onClick={() => setGuests((v) => Math.max(1, v - 1))} className="px-3.5 py-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">-</button>
                        <span className="flex-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{guests}</span>
                        <button type="button" onClick={() => setGuests((v) => Math.min(10, v + 1))} className="px-3.5 py-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Payment Method</label>
                      <div className="relative">
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={selectCls}>
                          <option value="cash">Cash on Arrival</option>
                          <option value="qrph">QR Ph (QR Code Payment)</option>
                          <option value="card">Credit / Debit Card</option>
                          <option value="gcash" disabled>GCash (Maintenance)</option>
                          <option value="maya" disabled>Maya (Maintenance)</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">3</span>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Preferences</h2>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {prefs.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => togglePref(item)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          preferences.includes(item)
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Additional requests (e.g. accessibility needs, quiet room)..."
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !room || availabilityLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : sessionUser?.id ? 'Confirm Reservation' : 'Sign In to Reserve'}
                  {!submitting && <ArrowRight size={16} />}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Booking Summary</h3>

                {sessionUser?.id && (
                  <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {membershipLoading ? 'Checking status...' : (activePrivilege?.packageName ? `${activePrivilege.packageName} Member` : 'Standard Guest')}
                    </p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                      {discountPercent > 0 ? `${discountPercent}% discount active.` : 'No active booking discounts.'}
                    </p>
                  </div>
                )}

                <div className="mb-4 space-y-2.5 text-xs">
                  {[
                    { label: 'Room', value: room?.roomName || '--' },
                    { label: 'Check-in', value: checkIn ? `${checkIn} at ${checkInTime}` : '--' },
                    { label: 'Check-out', value: checkOut ? `${checkOut} at ${checkOutTime}` : '--' },
                    { label: 'Duration', value: nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : '--' },
                    { label: 'Guests', value: guests },
                    { label: 'Payment', value: paymentMethod },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
                  <div className="mb-2 flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Base total</span>
                    <span className="text-slate-800 dark:text-slate-200">{baseTotal > 0 ? peso(baseTotal) : '--'}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="mb-2 flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>{activePrivilege?.packageName || 'Privilege'} discount</span>
                      <span>-{peso(discountAmount)} ({discountPercent}%)</span>
                    </div>
                  )}
                  <div className="mb-2 flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="text-slate-800 dark:text-slate-200">{subtotalAfterDiscount > 0 ? peso(subtotalAfterDiscount) : '--'}</span>
                  </div>
                  <div className="mb-2 flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">VAT ({VAT_PERCENT}%)</span>
                    <span className="text-slate-800 dark:text-slate-200">{subtotalAfterDiscount > 0 ? peso(vatAmount) : '--'}</span>
                  </div>
                  <div className="mb-2 flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Tax ({TAX_PERCENT}%)</span>
                    <span className="text-slate-800 dark:text-slate-200">{subtotalAfterDiscount > 0 ? peso(taxAmount) : '--'}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800">
                    <span>Total</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{total > 0 ? peso(total) : '--'}</span>
                  </div>
                </div>

                {!sessionUser?.id && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-center text-xs dark:bg-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">Sign in to complete your booking</p>
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
                        navigate('/login');
                      }}
                      className="mt-1 font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}