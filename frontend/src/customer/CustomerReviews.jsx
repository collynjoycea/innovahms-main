import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import GuestReviewsSection from "../components/GuestReviewsSection";
import { extractCustomerSession } from "./customerHelpers";

export default function CustomerReviews() {
  const location = useLocation();
  const [sessionUser, setSessionUser] = useState(null);
  const [bookingContext, setBookingContext] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [hotelId, setHotelId] = useState(null);

  useEffect(() => {
    setSessionUser(extractCustomerSession());
    const params = new URLSearchParams(location.search);
    const roomName = params.get("roomName");
    const hotelName = params.get("hotelName");
    const bookingId = params.get("bookingId");
    const roomIdParam = params.get("roomId");
    const hotelIdParam = params.get("hotelId");

    if (bookingId || roomName || hotelName) {
      const title = [hotelName, roomName].filter(Boolean).join(" — ");
      setBookingContext(title || `Booking #${bookingId}`);
    }
    
    setRoomId(roomIdParam ? parseInt(roomIdParam) : null);
    setHotelId(hotelIdParam ? parseInt(hotelIdParam) : null);
  }, [location.search]);

  return (
    <div className="min-h-screen bg-emerald-950/5 text-zinc-800 transition-colors duration-300 font-sans">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">
            Guest Feedback
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Share Your Experience
          </h1>
          <p className="mt-2 text-xs text-zinc-500 max-w-xl mx-auto">
            Leave feedback regarding your completed stay to help future guests make informed room choices.
          </p>
        </div>
        <GuestReviewsSection 
          sessionUser={sessionUser} 
          bookingContext={bookingContext} 
          roomId={roomId} 
          hotelId={hotelId} 
        />
      </div>
    </div>
  );
}