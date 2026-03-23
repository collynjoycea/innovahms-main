import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Clock, LogIn, LogOut, CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function MyShiftProfile() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [now, setNow] = useState(new Date());

  // Live clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchShift = useCallback(async () => {
    if (!staffId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/staff/shift-status/${staffId}`);
      const data = await res.json();
      if (res.ok) setShift(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
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
      const data = await res.json();
      if (res.ok) { setMsg(`Clocked in at ${data.clockIn} — ${data.status}`); setMsgType('success'); fetchShift(); }
      else { setMsg(data.error || 'Failed to clock in.'); setMsgType('error'); }
    } catch { setMsg('Server error.'); setMsgType('error'); }
    finally { setActing(false); }
  };

  const handleTimeOut = async () => {
    setActing(true); setMsg('');
    try {
      const res = await fetch('/api/staff/time-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      });
      const data = await res.json();
      if (res.ok) { setMsg(`Clocked out at ${data.clockOut} — ${data.hoursWorked}h worked`); setMsgType('success'); fetchShift(); }
      else { setMsg(data.error || 'Failed to clock out.'); setMsgType('error'); }
    } catch { setMsg('Server error.'); setMsgType('error'); }
    finally { setActing(false); }
  };

  const card = isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200';
  const text = isDarkMode ? 'text-white' : 'text-gray-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-gray-400';

  const isIn  = shift?.clockIn && !shift?.clockOut;
  const isDone = shift?.clockIn && shift?.clockOut;

  // Live elapsed time
  const elapsed = (() => {
    if (!shift?.clockIn) return null;
    const [h, m, s] = shift.clockIn.split(':').map(Number);
    const start = new Date(); start.setHours(h, m, s, 0);
    const end = shift.clockOut
      ? (() => { const [hh, mm, ss] = shift.clockOut.split(':').map(Number); const d = new Date(); d.setHours(hh, mm, ss, 0); return d; })()
      : now;
    const diff = Math.max(0, Math.floor((end - start) / 1000));
    const hh = Math.floor(diff / 3600);
    const mm = Math.floor((diff % 3600) / 60);
    const ss = diff % 60;
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  })();

  return (
    <div className={`p-8 min-h-screen ${isDarkMode ? 'bg-[#0c0c0e] text-white' : 'bg-[#f4f4f7] text-gray-900'}`}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${text}`}>
            My <span className="text-[#b3903c]">Shift</span>
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-[0.3em] mt-1 ${sub}`}>
            {now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Live Clock */}
        <div className={`rounded-[2rem] border p-8 text-center ${card}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 ${sub}`}>Current Time</p>
          <p className={`text-6xl font-black tracking-tighter tabular-nums ${text}`}>
            {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          {isIn && elapsed && (
            <p className="mt-3 text-[#b3903c] font-black text-sm tracking-widest">
              ⏱ {elapsed} on shift
            </p>
          )}
        </div>

        {/* Staff Info */}
        {!loading && shift && (
          <div className={`rounded-[2rem] border p-6 flex items-center gap-5 ${card}`}>
            <div className="w-14 h-14 rounded-2xl bg-[#b3903c]/10 flex items-center justify-center text-[#b3903c]">
              <User size={28} />
            </div>
            <div>
              <p className={`text-lg font-black uppercase tracking-tight ${text}`}>{shift.name}</p>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>{shift.role}</p>
              <p className={`text-[10px] font-bold ${sub}`}>{shift.hotelName}</p>
            </div>
            <div className="ml-auto">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                isIn  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                isDone ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                         'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                {isIn ? 'On Duty' : isDone ? 'Shift Done' : 'Not Started'}
              </span>
            </div>
          </div>
        )}

        {/* Shift Details */}
        {!loading && shift && (
          <div className={`rounded-[2rem] border p-6 grid grid-cols-3 gap-4 ${card}`}>
            {[
              { label: 'Clock In',  val: shift.clockIn  || '—' },
              { label: 'Clock Out', val: shift.clockOut || '—' },
              { label: 'Hours',     val: shift.hoursWorked != null ? `${shift.hoursWorked}h` : elapsed ? elapsed.split(':').slice(0,2).join('h ') + 'm' : '—' },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${sub}`}>{label}</p>
                <p className={`text-2xl font-black tabular-nums ${text}`}>{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {!loading && staffId && (
          <div className="flex gap-4">
            <button
              onClick={handleTimeIn}
              disabled={acting || isIn || isDone}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {acting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Time In
            </button>
            <button
              onClick={handleTimeOut}
              disabled={acting || !isIn}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-rose-500 text-white font-black uppercase text-[11px] tracking-widest hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-500/20"
            >
              {acting ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              Time Out
            </button>
          </div>
        )}

        {!staffId && !loading && (
          <div className={`rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-500 text-sm font-bold flex items-center gap-2`}>
            <AlertCircle size={16} /> No staff session found. Please log in again.
          </div>
        )}

        {msg && (
          <div className={`rounded-2xl border p-4 text-sm font-bold flex items-center gap-2 ${
            msgType === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-500'
          }`}>
            {msgType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {msg}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={32} className="animate-spin text-[#b3903c]" />
          </div>
        )}
      </div>
    </div>
  );
}
