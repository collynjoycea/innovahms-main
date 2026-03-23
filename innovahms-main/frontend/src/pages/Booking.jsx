import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Home, Sparkles, Plus, Trash2 } from 'lucide-react';

const ROOM_TYPE_OPTIONS = ['Single', 'Double', 'Suite', 'Deluxe'];

const normalizeRoomType = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  const roomMap = {
    single: 'Single',
    double: 'Double',
    suite: 'Suite',
    deluxe: 'Deluxe',
    standard: 'Single',
  };

  return roomMap[raw] || 'Suite';
};

const Booking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState([{ id: Date.now(), type: 'Suite', guests: 2 }]);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState(['High Floor Preference']);
  const [selectedRoomMeta, setSelectedRoomMeta] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return;
    }

    const loadRoomDetails = async () => {
      try {
        const response = await fetch(`/api/vision/rooms/${roomId}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.room) {
          return;
        }

        const roomDetails = data.room;
        setSelectedRoomMeta(roomDetails);
        setRooms([
          {
            id: roomDetails.id || Date.now(),
            roomId: roomDetails.id,
            type: normalizeRoomType(roomDetails.type || roomDetails.name),
            guests: roomDetails.capacity || 2,
            hotelName: roomDetails.hotelName || 'Innova HMS',
          },
        ]);
      } catch (error) {
        console.error('Failed to load selected room details:', error);
      }
    };

    loadRoomDetails();
  }, [searchParams]);

  const addRoom = () => {
    setRooms([...rooms, { id: Date.now(), type: 'Suite', guests: 2 }]);
  };

  const removeRoom = (id) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter(room => room.id !== id));
    }
  };

  const updateRoomData = (id, field, value) => {
    setRooms(rooms.map(room => room.id === id ? { ...room, [field]: value } : room));
  };

  const togglePriority = (pref) => {
    setSelectedPriorities(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const handleConfirmBooking = async () => {
    const rawSession = localStorage.getItem('customerSession') || localStorage.getItem('user');
    const session = rawSession ? JSON.parse(rawSession) : null;

    if (!session) {
      alert('Session expired. Please log in again.');
      return;
    }

    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates.');
      return;
    }

    const normalizedRooms = rooms.map((room) => ({
      ...room,
      roomId: room.roomId || null,
      type: room.type,
      guests: Number(room.guests) || 1,
      hotelName: room.hotelName || selectedRoomMeta?.hotelName || 'Innova HMS',
    }));

    const bookingData = {
      customerId: session.id,
      customerEmail: session.email,
      customerName: session.fullname || `${session.firstName || ''} ${session.lastName || ''}`.trim() || 'Valued Guest',
      checkIn,
      checkOut,
      rooms: normalizedRooms,
      priorities: selectedPriorities,
      specialRequests,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        alert(result.message || 'Booking Confirmed!');
        navigate('/dashboard');
      } else {
        alert(result.error || 'Booking failed. Please try again.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-20 px-4 font-serif">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl text-[#1a2b3c] mb-4 tracking-tight">Reservations</h1>
          <p className="text-gray-500 italic text-lg">
            Optimized through our <span className="text-[#d4af37] font-bold">Smart Room Assignment</span> technology.
          </p>
          <div className="w-24 h-1 bg-[#d4af37]/30 mx-auto mt-8"></div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm p-10 border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[#fff9e6] rounded-xl text-[#d4af37]">
                <Calendar size={24} />
              </div>
              <h2 className="text-2xl text-[#1a2b3c]">Stay Duration</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Check-In Date</label>
                <input
                  type="date"
                  className="w-full border-b border-gray-200 py-3 outline-none focus:border-[#d4af37] transition-colors bg-transparent"
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Check-Out Date</label>
                <input
                  type="date"
                  className="w-full border-b border-gray-200 py-3 outline-none focus:border-[#d4af37] transition-colors bg-transparent"
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-10 border border-gray-100 transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#fff9e6] rounded-xl text-[#d4af37]">
                  <Home size={24} />
                </div>
                <h2 className="text-2xl text-[#1a2b3c]">Accommodations</h2>
              </div>
              <button
                onClick={addRoom}
                className="flex items-center gap-2 px-5 py-2 border border-[#d4af37] text-[#d4af37] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#d4af37] hover:text-white transition-all"
              >
                Add Room <Plus size={14} />
              </button>
            </div>

            <div className="space-y-6">
              {rooms.map((room) => (
                <div key={room.id} className="flex flex-wrap md:flex-nowrap items-end gap-6 p-6 bg-[#fcfcfc] border border-gray-100 rounded-2xl relative">
                  <div className="flex-grow space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Room Type</label>
                    <select
                      className="w-full bg-transparent border-none text-lg text-[#1a2b3c] focus:ring-0 cursor-pointer"
                      value={room.type}
                      onChange={(e) => updateRoomData(room.id, 'type', e.target.value)}
                    >
                      {ROOM_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Guests</label>
                    <input
                      type="number"
                      min="1"
                      value={room.guests}
                      onChange={(e) => updateRoomData(room.id, 'guests', e.target.value)}
                      className="w-full bg-transparent border-none text-lg text-[#1a2b3c] focus:ring-0"
                    />
                  </div>
                  {rooms.length > 1 && (
                    <button onClick={() => removeRoom(room.id)} className="p-3 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-10 border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[#fff9e6] rounded-xl text-[#d4af37]">
                <Sparkles size={24} />
              </div>
              <h2 className="text-2xl text-[#1a2b3c]">Smart Preferences</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Assignment Priorities</label>
                <div className="space-y-3">
                  {['Quiet Zone (Away from elevator)', 'High Floor Preference', 'Early Check-In Readiness', 'Near Fitness Center'].map((pref) => (
                    <label key={pref} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedPriorities.includes(pref)}
                        onChange={() => togglePriority(pref)}
                        className="w-5 h-5 rounded border-gray-300 text-[#d4af37] focus:ring-[#d4af37]"
                      />
                      <span className="text-gray-600 group-hover:text-[#1a2b3c] transition-colors">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Special Requests</label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Tell us about allergies, needs, or special occasions..."
                  className="w-full h-32 p-4 bg-[#fcfcfc] border border-gray-100 rounded-xl outline-none focus:border-[#d4af37] transition-all text-sm italic"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={handleConfirmBooking}
            disabled={isSubmitting}
            className="px-20 py-5 bg-[#d4af37] text-white rounded-full text-sm font-bold uppercase tracking-[0.3em] shadow-2xl hover:bg-[#c19e30] transform hover:-translate-y-1 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Booking ->'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Booking;
