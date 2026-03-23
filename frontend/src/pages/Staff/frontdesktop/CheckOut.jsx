import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, LogOut, User, Wallet, X, CalendarPlus, ArrowLeftRight, CheckCircle2, Loader2, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import useStaffSession from '../../../hooks/useStaffSession';

export default function CheckOut() {
  const { qs, hotelId, firstName, staffId } = useStaffSession();
  const { isDarkMode } = useOutletContext();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [extDate, setExtDate] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [tab, setTab] = useState('checkout');
  const [overdueCount, setOverdueCount] = useState(0);
  const [autoingOut, setAutoingOut] = useState(false);
  const [autoResult, setAutoResult] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchGuests = useCallback(async () => {
    try {
      const [qRes, odRes] = await Promise.all([
        fetch(`/api/staff/checkout-queue${qs}`),
        fetch(`/api/staff/overdue-checkout-count${qs}`),
      ]);
      const qData = await qRes.json();
      const odData = await odRes.json();
      if (qRes.ok) setGuests(qData.guests || []);
      if (odRes.ok) setOverdueCount(odData.overdueCheckoutCount || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGuests(); const t = setInterval(fetchGuests, 20000); return () => clearInterval(t); }, [fetchGuests]);

  const handleAutoCheckout = async () => {
    setAutoingOut(true); setAutoResult(null);
    try {
      const res = await fetch('/api/staff/auto-checkout-overdue', { method: 'POST' });
      const data = await res.json();
      if (res.ok) { setAutoResult(data); fetchGuests(); }
    } catch { /* ignore */ }
    finally { setAutoingOut(false); }
  };

  const openModal = (g) => { setSelected(g); setMsg({ text: '', type: '' }); setTab('checkout'); setExtDate(''); setNewRoom(''); };

  const doCheckout = async () => {
    setProcessing(true); setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`/api/staff/checkout/${selected.id}`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) { setMsg({ text: data.message, type: 'success' }); fetchGuests(); setTimeout(() => setSelected(null), 1500); }
      else setMsg({ text: data.error || 'Failed.', type: 'error' });
    } catch { setMsg({ text: 'Server error.', type: 'error' }); }
    finally { setProcessing(false); }
  };

  const doExtend = async () => {
    if (!extDate) { setMsg({ text: 'Select a new checkout date.', type: 'error' }); return; }
    setProcessing(true); setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`/api/staff/extend/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCheckout: extDate }),
      });
      const data = await res.json();
      if (res.ok) { setMsg({ text: data.message, type: 'success' }); fetchGuests(); }
      else setMsg({ text: data.error || 'Failed.', type: 'error' });
    } catch { setMsg({ text: 'Server error.', type: 'error' }); }
    finally { setProcessing(false); }
  };

  const doTransfer = async () => {
    if (!newRoom.trim()) { setMsg({ text: 'Enter a room number.', type: 'error' }); return; }
    setProcessing(true); setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`/api/staff/transfer/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRoomNumber: newRoom.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setMsg({ text: data.message, type: 'success' }); fetchGuests(); }
      else setMsg({ text: data.error || 'Failed.', type: 'error' });
    } catch { setMsg({ text: 'Server error.', type: 'error' }); }
    finally { setProcessing(false); }
  };

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    return !q || g.guestName.toLowerCase().includes(q) || g.bookingNumber.toLowerCase().includes(q);
  });

  const card = isDarkMode ? 'bg-[#0c0c0e] border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm';
  const text = isDarkMode ? 'text-white' : 'text-zinc-900';
  const sub  = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
  const inp  = isDarkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900';

  return (
    <div className={`p-8 min-h-screen ${isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f9fa]'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-4xl font-black italic uppercase tracking-tighter ${text}`}>
            Check-Out <span className="text-[#b3903c]">Queue</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-[#b3903c] animate-pulse" />
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${sub}`}>Settle accounts · {guests.length} in-house</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
            <Search size={15} className={sub} />
            <input type="text" placeholder="Search guest or ref..." value={search} onChange={e => setSearch(e.target.value)}
              className={`bg-transparent outline-none text-xs font-bold w-52 ${isDarkMode ? 'text-white placeholder:text-zinc-600' : 'text-zinc-900 placeholder:text-zinc-400'}`} />
          </div>
          <button onClick={fetchGuests} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900'} transition-all`}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* OVERDUE AUTO-CHECKOUT BANNER */}
      {overdueCount > 0 && (
        <div className="mb-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-orange-500 shrink-0" />
            <div>
              <p className="text-orange-500 font-black text-sm uppercase tracking-widest">Overdue Checkout</p>
              <p className="text-orange-400 text-[11px] mt-0.5">
                {overdueCount} guest{overdueCount > 1 ? 's' : ''} past checkout date — still marked as Checked In.
              </p>
            </div>
          </div>
          <button onClick={handleAutoCheckout} disabled={autoingOut}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shrink-0">
            {autoingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            Auto Check-Out All
          </button>
        </div>
      )}

      {autoResult && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-emerald-400 text-[11px] font-bold">
            {autoResult.message}
            {autoResult.checkedOut?.length > 0 && ` — ${autoResult.checkedOut.map(c => c.bookingNumber).join(', ')}`}
          </p>
          <button onClick={() => setAutoResult(null)} className="ml-auto text-emerald-600 hover:text-emerald-400">
            <X size={14} />
          </button>
        </div>
      )}

      <div className={`rounded-[2.5rem] border overflow-hidden ${card}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-zinc-800 text-zinc-500' : 'border-zinc-100 text-zinc-400'}`}>
                <th className="px-8 py-5">Guest / Booking</th>
                <th className="px-8 py-5">Room</th>
                <th className="px-8 py-5">Check-Out</th>
                <th className="px-8 py-5">Total</th>
                <th className="px-8 py-5">Balance</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-zinc-800/30' : 'divide-zinc-100'}`}>
              {loading ? (
                <tr><td colSpan="6" className="p-16 text-center text-[#b3903c] font-black text-xs uppercase tracking-widest animate-pulse">Syncing Departure Logs...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className={`p-16 text-center text-[10px] font-bold uppercase tracking-widest italic ${sub}`}>No guests currently checked in</td></tr>
              ) : filtered.map(g => {
                const isOverdue = g.checkOut < today;
                return (
                <tr key={g.id} className={`group transition-all ${isOverdue ? 'bg-orange-500/5' : ''} ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}`}>
                  <td className="px-8 py-5">
                    <p className="text-[11px] font-black text-[#b3903c]">{g.bookingNumber}</p>
                    <p className={`text-xs font-black uppercase ${text}`}>{g.guestName}</p>
                    {isOverdue && (
                      <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-full">Overdue</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <p className={`text-[11px] font-black ${text}`}>Room {g.roomNumber}</p>
                    <p className={`text-[9px] font-bold uppercase ${sub}`}>{g.roomName}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${isOverdue ? 'text-orange-500' : text}`}>
                      <Clock size={11} className={isOverdue ? 'text-orange-500' : 'text-[#b3903c]'} />{g.checkOut}
                    </div>
                  </td>
                  <td className={`px-8 py-5 text-[11px] font-black ${text}`}>₱{Number(g.totalAmount).toLocaleString()}</td>
                  <td className="px-8 py-5">
                    <span className={`text-xs font-black ${g.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      ₱{Number(g.balance).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => openModal(g)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg ml-auto ${
                        isOverdue
                          ? 'bg-orange-500 text-white shadow-orange-500/20'
                          : 'bg-[#b3903c] text-black shadow-[#b3903c]/10'
                      }`}>
                      <LogOut size={13} strokeWidth={3} /> {isOverdue ? 'Force Out' : 'Process'}
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className={`relative w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#0c0c0e] border-zinc-800' : 'bg-white border-zinc-200'}`}>
            <div className="p-7 border-b border-zinc-800/30 flex justify-between items-center bg-gradient-to-r from-[#b3903c]/10 to-transparent">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-[#b3903c]">Guest Departure</h2>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${sub}`}>{selected.bookingNumber} · Room {selected.roomNumber}</p>
              </div>
              <button onClick={() => setSelected(null)} className={`${sub} hover:text-red-500 transition-all`}><X size={22} strokeWidth={3} /></button>
            </div>

            <div className="p-7 space-y-5">
              {/* Guest info */}
              <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isDarkMode ? 'bg-[#b3903c]/5 border-[#b3903c]/10' : 'bg-amber-50 border-amber-100'}`}>
                <div className="w-11 h-11 bg-[#b3903c] rounded-xl flex items-center justify-center text-black font-black">
                  <User size={20} />
                </div>
                <div>
                  <p className={`text-sm font-black uppercase ${text}`}>{selected.guestName}</p>
                  <p className={`text-[9px] font-bold uppercase ${sub}`}>{selected.checkIn} → {selected.checkOut}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className={`text-xs font-black ${selected.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    Balance: ₱{Number(selected.balance).toLocaleString()}
                  </p>
                  <p className={`text-[9px] ${sub}`}>Total: ₱{Number(selected.totalAmount).toLocaleString()}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
                {[['checkout','Check-Out'],['extend','Extend'],['transfer','Transfer']].map(([k,l]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === k ? 'bg-[#b3903c] text-black shadow' : `${sub} hover:text-[#b3903c]`}`}>
                    {l}
                  </button>
                ))}
              </div>

              {tab === 'checkout' && (
                <button onClick={doCheckout} disabled={processing}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase text-[11px] tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirm Final Check-Out
                </button>
              )}

              {tab === 'extend' && (
                <div className="space-y-3">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>New Check-Out Date</label>
                  <input type="date" value={extDate} min={selected.checkOut} onChange={e => setExtDate(e.target.value)}
                    className={`w-full p-4 rounded-2xl border outline-none focus:border-[#b3903c] ${inp}`} />
                  <button onClick={doExtend} disabled={processing}
                    className="w-full py-4 rounded-2xl bg-[#b3903c] text-black font-black uppercase text-[11px] tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {processing ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
                    Confirm Extension
                  </button>
                </div>
              )}

              {tab === 'transfer' && (
                <div className="space-y-3">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>New Room Number</label>
                  <input type="text" placeholder="e.g. 502" value={newRoom} onChange={e => setNewRoom(e.target.value)}
                    className={`w-full p-4 rounded-2xl border outline-none focus:border-[#b3903c] ${inp}`} />
                  <button onClick={doTransfer} disabled={processing}
                    className="w-full py-4 rounded-2xl border-2 border-zinc-700 text-zinc-400 hover:border-white hover:text-white font-black uppercase text-[11px] tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {processing ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />}
                    Execute Transfer
                  </button>
                </div>
              )}

              {msg.text && (
                <p className={`text-[11px] font-bold text-center ${msg.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{msg.text}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
