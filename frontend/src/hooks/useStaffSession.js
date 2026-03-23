import { useState, useEffect } from 'react';

function readSession() {
  try {
    const raw = localStorage.getItem('staffUser');
    if (!raw) return { staffId: null, hotelId: null, hotelName: '', firstName: '', lastName: '', role: '', qs: '' };
    const s = JSON.parse(raw);
    const hotelId = s.hotelId || s.hotel_id || null;
    return {
      staffId:   s.id        || null,
      hotelId,
      hotelName: s.hotelName || s.hotel_name || '',
      firstName: s.firstName || s.first_name || '',
      lastName:  s.lastName  || s.last_name  || '',
      role:      s.role      || '',
      qs:        hotelId ? `?hotel_id=${hotelId}` : '',
    };
  } catch {
    return { staffId: null, hotelId: null, hotelName: '', firstName: '', lastName: '', role: '', qs: '' };
  }
}

/**
 * useStaffSession — reactive hook.
 * Re-renders whenever staffUser is set or cleared in localStorage.
 */
export function useStaffSession() {
  const [session, setSession] = useState(readSession);

  useEffect(() => {
    const sync = () => setSession(readSession());
    // Listen for changes from other tabs
    window.addEventListener('storage', sync);
    // Listen for changes in the same tab (dispatched manually after login/logout)
    window.addEventListener('staffSessionChanged', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('staffSessionChanged', sync);
    };
  }, []);

  return session;
}

export default useStaffSession;
