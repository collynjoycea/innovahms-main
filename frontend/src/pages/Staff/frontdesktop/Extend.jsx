import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarClock, ArrowLeftRight, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function Extend() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchStays = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/checkout-queue${qs}`);
      const data = await res.json();
      if (res.ok) {
        const list = data.guests || [];
        setStays(list);
        if (list.length > 0 && !selected) setSelected(list[0]);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStays(); }, [fetchStays]);

  const doExtend = async () => {
    if (!newDate || !selected) { setMsg({ text: 'Select a guest and new date.', type: 'error' }); return; }
    setProcessing(true); setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`/api/staff/extend/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCheckout: newDate }),
      });
      const data = await res.json();
      if (res.ok) { setMsg({ text: `${data.message} New total: ₱${Number(data.newTotal).toLocaleString()}`, type: 'success' }); fetchStays(); setNewDate(''); }
      else setMsg({ text: data.error || 'Failed.', type: 'error' });
    } catch { setMsg({ text: 'Server error.', type: 'error' }); }
    finally { setProcessing(false); }
  };

  const doTransfer = async () => {
    if (!newRoom.trim() || !selected) { setMsg({ text: 'Enter a room number.', type: 'error' }); return; }
    setProcessing(true); setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`/api/staff/transfer/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRoomNumber: newRoom.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setMsg({ text: data.message, type: 'success' }); fetchStays(); setNewRoom(''); }
      else setMsg({ text: data.error || 'Failed.', type: 'error' });
    } catch { setMsg({ text: 'Server error.', type: 'error' }); }
    finally { setProcessing(false); }
  };

  const cardBg = isDarkMode ? 'bg-[#0c0c0e]/80 border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const inputBg = isDarkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#b3903c]" size={40} /></div>;

  return (
    <div className={`p-8 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#f4f7f6] text-zinc-900'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            Extend Stay <span className="text-[#b3903c]">/ Transfer</span>
          </h1>
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] italic mt-1 ${sub}`}>
            {stays.length} guest(s) currently in-house
          </p>
        </div>
        <button onClick={fetchStays} className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* GUEST LIST */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`rounded-3xl border ${cardBg} overflow-hidden`}>
            {stays.length === 0 ? (
              <div className={`p-16 text-center text-[10px] font-bold uppercase tracking-widest italic ${sub}`}>No guests currently checked in</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-100'} text-[9px] font-black uppercase tracking-widest ${sub}`}>
                    <th className="px-6 py-5">Guest</th>
                    <th className="px-6 py-5">Room</th>
                    <th className="px-6 py-5">Check-Out</th>
                    <th className="px-6 py-5">Balance</th>
                    <th className="px-6 py-5 text-right">Select</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/30' : 'divide-zinc-100'}`}>
                  {stays.map(s => (
                    <tr key={s.id} onClick={() => { setSelected(s); setMsg({ text: '', type: '' }); }}
                      className={`cursor-pointer transition-all ${selected?.id === s.id ? 'bg-[#b3903c]/10' : isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}`}>
                      <td className={`px-6 py-4 text-[11px] font-black uppercase ${text}`}>{s.guestName}</td>
                      <td className={`px-6 py-4 text-[10px] font-bold ${sub}`}>Room {s.roomNumber}</td>
                      <td className={`px-6 py-4 text-[11px] font-bold ${text}`}>{s.checkOut}</td>
                      <td className={`px-6 py-4 text-[11px] font-black ${s.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>₱{Number(s.balance).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight size={16} className={selected?.id === s.id ? 'text-[#b3903c]' : sub} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* FORMS */}
        <div className="lg:col-span-5 space-y-6">
          {selected && (
            <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#b3903c]/5 border-[#b3903c]/10' : 'bg-amber-50 border-amber-100'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${sub}`}>Selected Guest</p>
              <p className={`text-sm font-black uppercase ${text}`}>{selected.guestName}</p>
              <p className={`text-[10px] ${sub}`}>{selected.bookingNumber} · Room {selected.roomNumber} · Out: {selected.checkOut}</p>
            </div>
          )}

          <div className={`p-8 rounded-[2.5rem] border ${cardBg}`}>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#b3903c] mb-5 flex items-center gap-2">
              <CalendarClock size={16} /> Extension Control
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${sub}`}>New Check-Out Date</label>
                <input type="date" value={newDate} min={selected?.checkOut || ''} onChange={e => setNewDate(e.target.value)}
                  className={`w-full p-4 rounded-2xl border outline-none focus:border-[#b3903c] transition-all ${inputBg}`} />
              </div>
              <button onClick={doExtend} disabled={processing || !selected}
                className="w-full py-5 bg-[#b3903c] text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#b3903c]/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {processing ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />}
                Confirm Extension
              </button>
            </div>
          </div>

          <div className={`p-8 rounded-[2.5rem] border ${cardBg}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2 ${sub}`}>
              <ArrowLeftRight size={16} /> Room Migration
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${sub}`}>Move to Room #</label>
                <input type="text" placeholder="e.g. 502" value={newRoom} onChange={e => setNewRoom(e.target.value)}
                  className={`w-full p-4 rounded-2xl border outline-none focus:border-white transition-all ${inputBg}`} />
              </div>
              <button onClick={doTransfer} disabled={processing || !selected}
                className={`w-full py-4 border-2 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${isDarkMode ? 'border-zinc-800 text-zinc-500 hover:border-white hover:text-white' : 'border-zinc-300 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900'}`}>
                {processing ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />}
                Execute Transfer
              </button>
            </div>
          </div>

          {msg.text && (
            <div className={`p-4 rounded-2xl border text-[11px] font-bold ${msg.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 'border-rose-500/20 bg-rose-500/10 text-rose-500'}`}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
