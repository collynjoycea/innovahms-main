import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function GuestReviewsSection({ sessionUser }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadReviews = () => {
    fetch("/api/reviews?limit=5")
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .catch(() => {});
  };

  useEffect(() => { loadReviews(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sessionUser?.id) { navigate("/login"); return; }
    if (!rating) { setFeedback("Please select a rating."); return; }
    if (!comment.trim()) { setFeedback("Please write a comment."); return; }

    setSubmitting(true);
    setFeedback("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: sessionUser.id, rating, title, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit.");
      setFeedback("Review submitted! Thank you.");
      setRating(0); setTitle(""); setComment("");
      loadReviews();
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#bf9b30] mb-2">Guest Voices</p>
        <h2 className="text-5xl md:text-6xl font-black text-[#1a160d] dark:text-white uppercase tracking-tighter leading-none">
          Guest <span className="font-serif italic font-light text-[#bf9b30] normal-case tracking-normal">Reviews</span>
        </h2>
        <p className="text-[#7a6f5d] dark:text-gray-400 text-xs mt-4 max-w-md font-light leading-relaxed">
          Real experiences from our valued sanctuary guests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

        {/* SUBMIT FORM */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="lg:col-span-5 bg-white/95 dark:bg-[#14130f] border border-[#e8deca] dark:border-white/5 rounded-2xl p-8 shadow-[0_20px_40px_rgba(191,155,48,0.12)] dark:shadow-none"
        >
          <h3 className="text-xl font-black text-[#1a160d] dark:text-white uppercase tracking-tight mb-8">Share Your Experience</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[9px] font-bold text-[#bf9b30] uppercase tracking-widest block mb-2">Overall Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(s)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={22}
                      fill={(hoverRating || rating) >= s ? "#bf9b30" : "transparent"}
                      className={(hoverRating || rating) >= s ? "text-[#bf9b30]" : "text-[#b5aa92] dark:text-gray-600"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-[#bf9b30] uppercase tracking-widest block mb-2">Review Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience..."
                className="w-full bg-[#fffdf7] dark:bg-[#0d0c0a] border border-[#e6dcc7] dark:border-white/10 rounded-lg px-4 py-3 text-[11px] text-[#655a49] dark:text-gray-400 outline-none focus:border-[#bf9b30]/50 transition-all"
              />
            </div>

            <div>
              <label className="text-[9px] font-bold text-[#bf9b30] uppercase tracking-widest block mb-2">Your Review</label>
              <textarea
                rows="4"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell future guests about your stay..."
                className="w-full bg-[#fffdf7] dark:bg-[#0d0c0a] border border-[#e6dcc7] dark:border-white/10 rounded-lg px-4 py-3 text-[11px] text-[#655a49] dark:text-gray-400 outline-none focus:border-[#bf9b30]/50 transition-all resize-none"
              />
            </div>

            {!sessionUser?.id && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-[#bf9b30]/30 bg-[#bf9b30]/5">
                <LogIn size={16} className="text-[#bf9b30] flex-shrink-0" />
                <p className="text-[11px] text-[#7a6a4a] dark:text-[#c9a84c] font-medium">
                  You need to{" "}
                  <button type="button" onClick={() => navigate("/login")}
                    className="font-black text-[#bf9b30] underline underline-offset-2 hover:text-[#d4ac37] transition-colors">
                    sign in
                  </button>{" "}
                  to submit a review.
                </p>
              </div>
            )}

            {feedback && (
              <p className={`text-[11px] font-bold ${feedback.includes("Thank") ? "text-green-600" : "text-red-500"}`}>
                {feedback}
              </p>
            )}

            <button
              type={sessionUser?.id ? "submit" : "button"}
              onClick={!sessionUser?.id ? () => navigate("/login") : undefined}
              disabled={submitting}
              className="w-full py-4 bg-[#bf9b30] text-[#0d0c0a] text-[11px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-[#d4ac37] transition-all shadow-lg shadow-[#bf9b30]/10 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {!sessionUser?.id && <LogIn size={14} />}
              {submitting ? "Submitting..." : sessionUser?.id ? "Submit Review" : "Sign In to Review"}
            </button>
          </form>
        </motion.div>

        {/* REVIEW LIST */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="lg:col-span-7 space-y-4"
        >
          {reviews.length === 0 && (
            <p className="text-[#7a6f5d] dark:text-gray-500 text-sm italic">No reviews yet. Be the first to share your experience!</p>
          )}
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-white/95 dark:bg-[#14130f] border border-[#e8ddc8] dark:border-white/5 p-6 rounded-2xl hover:border-[#bf9b30]/20 transition-all group shadow-[0_14px_30px_rgba(191,155,48,0.09)] dark:shadow-none">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#bf9b30]/10 flex items-center justify-center font-black text-[#bf9b30] text-sm">
                    {rev.guestName?.[0] || "G"}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-[#1a160d] dark:text-white uppercase tracking-tight">{rev.guestName}</h4>
                    <p className="text-[9px] text-[#7d725f] dark:text-gray-500 font-bold uppercase">
                      {rev.roomName || rev.hotelName || "Innova HMS"} · {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString("en-PH", { month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={10} fill={s <= rev.rating ? "#bf9b30" : "transparent"} className={s <= rev.rating ? "text-[#bf9b30]" : "text-[#d6c9ac] dark:text-gray-700"} />
                  ))}
                </div>
              </div>
              {rev.title && <p className="text-[12px] font-black text-[#1a160d] dark:text-white mb-1">{rev.title}</p>}
              <p className="text-[11px] text-[#726756] dark:text-gray-400 font-light leading-relaxed italic">"{rev.comment}"</p>
            </div>
          ))}
        </motion.div>

      </div>
    </>
  );
}
