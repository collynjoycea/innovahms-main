import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import GuestReviewsSection from "../components/GuestReviewsSection";
import { extractCustomerSession } from "./customerHelpers";

export default function CustomerReviews() {
  const location = useLocation();
  const [sessionUser, setSessionUser] = useState(null);
  const [bookingContext, setBookingContext] = useState(null);

  useEffect(() => {
    setSessionUser(extractCustomerSession());
    const params = new URLSearchParams(location.search);
    const roomName = params.get("roomName");
    const hotelName = params.get("hotelName");
    const bookingId = params.get("bookingId");

    if (bookingId || roomName || hotelName) {
      const title = [hotelName, roomName].filter(Boolean).join(" — ");
      setBookingContext(title || `Booking #${bookingId}`);
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-[#faf6ee] text-[#1a160d] dark:bg-[#0d0c0a] dark:text-[#e8e2d5] transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-center mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#bf9b30] mb-2">Review your stay</p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">Share your experience</h1>
          <p className="mt-4 text-lg text-slate-500 dark:text-[#cfc2aa] max-w-2xl mx-auto">
            Leave feedback about your completed booking and help future guests choose the perfect room.
          </p>
        </div>
        <GuestReviewsSection sessionUser={sessionUser} bookingContext={bookingContext} />
      </div>
    </div>
  );
}
