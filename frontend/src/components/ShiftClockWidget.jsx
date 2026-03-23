import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import useStaffSession from '../hooks/useStaffSession';

/**
 * ShiftClockWidget — shows live clock status + Time In / Time Out buttons.
 * Drop this into any staff header.
 */
export default function ShiftClockWidget({ isDarkMode }) {
  const { staffId } = useStaffSession();
  const [shift, setShift] = useState(null);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchShift = useCallback(async () => {
    if (!staffId) return;
    try {
      const res = await fetch(`/api/staff/shift-status/${staffId}`);
      const d = await res.json();
      if (res.ok) setShift(d);
    } catch { /* ignore */ }
  }, [staffId]);

  useEffect(() => {
    fetchShift();
    const t = setInterval(fetchShift, 30000);
    return () => clearInterval(t);
  }, [fetchShift]);

  const handleTimeIn = async () => {
    setActing(true); setMsg('');
    try {
      const res = await fetch('/api/staff/time-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      });
      const d = await res.json();
      if (res.ok) { setMsg(`In ${d.clockIn}`); setMsgType('success'); fetchShift(); }
      else { setMsg(d.error || 'Failed'); setMsgType('error'); }
    } catch { setMsg('Error'); setMsgType('error'); }
    finally { setActing(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handleTimeOut = async () => {
    setActing(true); setMsg('');
    try {
      const res = await fetch('/api/staff/time-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      });
      const d = await res.json();
      if (res.ok) { setMsg(`Out ${d.clockOut} · ${d.hoursWorked}h`); setMsgType('success'); fetchShift(); }
      else { setMsg(d.error || 'Failed'); setMsgType('error'); }
    } catch { setMsg('Error'); setMsgType('error'); }
    finally { setActing(false); setTimeout(() => setMsg(''), 3000); }
  };

  const isIn   = shift?.clockIn && !shift?.clockOut;
  const isDone = shift?.clockIn && shift?.clockOut;

  // Elapsed time while on shift
  const elapsed = (() => {
    if (!shift?.clockIn) return null;
    const [h, m, s] = shift.clockIn.split(':').map(Number);
    const start = new Date(); start.setHours(h, m, s, 0);
    const end = shift?.clockOut
      ? (() => { const [hh, mm, ss] = shift.clockOut.split(':').map(Number); const d = new Date(); d.setHours(hh, mm, ss, 0); return d; })()
      : now;
    const diff = Math.max(0, Math.floor((end - start) / 1000));
    const hh = Math.floor(diff / 3600);
    const mm = Math.floor((diff % 3600) / 60);
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  })();

  if (!staffId) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Status pill */}
      <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black tracking-widest uppercase transition-all ${
        isIn   ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600') :
        isDone ? (isDarkMode ? 'bg-slate-500/10 border-slate-500/20 text-slate-400'   : 'bg-slate-50 border-slate-200 text-slate-500') :
                 (isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'   : 'bg-amber-50 border-amber-200 text-amber-600')
      }`}>
        <Clock size={12} className={isIn ? 'animate-pulse' : ''} />
        {isIn ? (elapsed ? `${elapsed}` : 'On Duty') : isDone ? 'Shift Done' : 'Not Started'}
      </div>

      {/* Time In button */}
      {!isIn && !isDone && (
        <button onClick={handleTimeIn} disabled={acting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
          {acting ? <Loader2 size={11} className="animate-spin" /> : <LogIn size={11} strokeWidth={3} />}
          Time In
        </button>
      )}

      {/* Time Out button */}
      {isIn && (
        <button onClick={handleTimeOut} disabled={acting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-rose-500/20">
          {acting ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} strokeWidth={3} />}
          Time Out
        </button>
      )}

      {/* Feedback toast */}
      {msg && (
        <span className={`text-[9px] font-black hidden sm:block ${msgType === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
