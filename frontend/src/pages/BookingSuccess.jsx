import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Star } from 'lucide-react';

export default function BookingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  const bookingNumber = searchParams.get('bookingNumber');

  const [status, setStatus] = useState('verifying'); // verifying | paid | failed
  const [bookingData, setBookingData] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewDone, setReviewDone] = useState(false);

  const sessionUser = (() => {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('customerSession');
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p?.user && typeof p.user === 'object' ? p.user : p;
    } catch { return null; }
  })();

  useEffect(() => {
    if (!reservationId) { setStatus('failed'); return; }

    // Poll PayMongo verify endpoint
    const verify = async () => {
      try {
        const res = await fetch(`/api/reservations`);
        const data = await res.json();
        const reservations = Array.isArray(data) ? data : [];
        const found = reservations.find(r => String(r.id) === String(reservationId));
        if (found) {
          setBookingData({
            bookingNumber: found.booking_number || bookingNumber,
            totalNights: found.total_nights,
            totalAmount: found.total_amount,
            status: found.status,
          });
          setStatus(found.status === 'CONFIRMED' ? 'paid' : 'verifying');
        }
      } catch { setStatus('failed'); }
    };

    verify();
    // Poll every 3s up to 30s for webhook to update status
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      await verify();
      if (attempts >= 10) { clearInterval(interval); setStatus(s => s === 'verifying' ? 'paid' : s); }
    }, 3000);
    return () => clearInterval(interval);
  }, [reservationId]);

  const submitReview = async () => {
    if (!rating || !comment.trim()) return;
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: sessionUser?.id, rating, comment }),
    }).catch(() => {});
    setReviewDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-sans"
      style={{ backgroundImage: "url('/images/herobg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div className="fixed inset-0 bg-black/60 z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,155,48,0.12)_0%,transparent_60%)] z-0" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[2rem] border border-[#bf9b30]/40 bg-white/10 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#bf9b30] to-transparent" />
          <div className="p-10 text-center">

            {status === 'verifying' && (
              <>
                <Loader2 size={52} className="text-[#bf9b30] mx-auto mb-5 animate-spin" />
                <h2 className="text-2xl font-black text-white mb-2">Verifying Payment</h2>
                <p className="text-white/50 text-sm">Please wait while we confirm your payment...</p>
              </>
            )}

            {status === 'paid' && !showReview && (
              <>
                <CheckCircle2 size={56} className="text-[#bf9b30] mx-auto mb-5" />
                <h2 className="text-2xl font-black text-white mb-2">Payment Confirmed!</h2>
                <p className="text-white/50 text-xs uppercase tracking-widest mb-6">Booking Successful</p>

                <div className="rounded-xl border border-white/15 bg-white/5 p-5 mb-8 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Booking #</span>
                    <span className="text-[#bf9b30] font-black">{bookingData?.bookingNumber || bookingNumber}</span>
                  </div>
                  {bookingData?.totalNights && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Nights</span>
                      <span className="text-white font-bold">{bookingData.totalNights}</span>
                    </div>
                  )}
                  {bookingData?.totalAmount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Total Paid</span>
                      <span className="text-white font-black">₱{Number(bookingData.totalAmount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Payment</span>
                    <span className="text-green-400 font-black uppercase text-xs">Online · Confirmed</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={() => setShowReview(true)}
                    className="w-full py-3.5 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all flex items-center justify-center gap-2">
                    <Star size={14} /> Leave a Review
                  </button>
                  <button onClick={() => navigate('/')}
                    className="w-full py-3.5 rounded-xl border border-white/20 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    Back to Home
                  </button>
                </div>
              </>
            )}

            {status === 'paid' && showReview && (
              <>
                {reviewDone ? (
                  <>
                    <CheckCircle2 size={48} className="text-[#bf9b30] mx-auto mb-4" />
                    <h3 className="text-xl font-black text-white mb-2">Thank You!</h3>
                    <p className="text-white/60 text-sm mb-6">Your review has been submitted.</p>
                    <button onClick={() => navigate('/')}
                      className="px-8 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all">
                      Go Home
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-white mb-1">Share Your Experience</h3>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-6">Optional</p>
                    <div className="flex justify-center gap-2 mb-5">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} type="button"
                          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                          onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                          <Star size={28} fill={(hover || rating) >= s ? '#bf9b30' : 'transparent'}
                            className={(hover || rating) >= s ? 'text-[#bf9b30]' : 'text-white/30'} />
                        </button>
                      ))}
                    </div>
                    <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                      placeholder="Tell future guests about your experience..."
                      className="w-full rounded-xl border border-white/20 bg-white/10 py-3 px-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#bf9b30]/70 transition-all resize-none mb-4" />
                    <div className="flex gap-3">
                      <button onClick={() => navigate('/')}
                        className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                        Skip
                      </button>
                      <button onClick={submitReview} disabled={!rating || !comment.trim()}
                        className="flex-1 py-3 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all disabled:opacity-40">
                        Submit
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {status === 'failed' && (
              <>
                <XCircle size={56} className="text-red-400 mx-auto mb-5" />
                <h2 className="text-2xl font-black text-white mb-2">Payment Failed</h2>
                <p className="text-white/50 text-sm mb-8">Your payment was not completed. No charges were made.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => navigate(-1)}
                    className="w-full py-3.5 rounded-xl bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-widest hover:bg-[#d4ac37] transition-all">
                    Try Again
                  </button>
                  <button onClick={() => navigate('/')}
                    className="w-full py-3.5 rounded-xl border border-white/20 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    Back to Home
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
