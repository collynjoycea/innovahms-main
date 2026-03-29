import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import useStaffSession from '../../../hooks/useStaffSession';
import {
  AlertOctagon, Wrench, Send, MapPin,
  Camera, History, Clock,
  X, CheckCircle2, AlertTriangle, ListFilter
} from 'lucide-react';

const MaintenanceReport = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const [activeModal, setActiveModal] = useState(null);
  const { qs, hotelId, staffId } = useStaffSession();
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ room_label: '', severity: 'High Priority', issue: '', is_out_of_order: false });

  const fetchReports = async () => {
    try {
      const res = await axios.get(`/api/housekeeping/maintenance${qs}`);
      setReports(res.data.reports || []);
    } catch {}
  };

  useEffect(() => { fetchReports(); }, [qs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/housekeeping/maintenance', { ...form, hotel_id: hotelId, reported_by: staffId });
      setActiveModal('success');
      setForm({ room_label: '', severity: 'High Priority', issue: '', is_out_of_order: false });
      fetchReports();
    } catch {}
  };

  const theme = {
    bg:           isDarkMode ? 'bg-[#0c0c0e]'   : 'bg-[#f4f4f7]',
    card:         isDarkMode ? 'bg-[#111111]/90 backdrop-blur-xl border-white/10' : 'bg-white border-zinc-200',
    input:        isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400',
    textMain:     isDarkMode ? 'text-white'      : 'text-zinc-900',
    textSub:      isDarkMode ? 'text-zinc-500'   : 'text-zinc-600',
    border:       isDarkMode ? 'border-white/10' : 'border-zinc-200',
    innerCard:    isDarkMode ? 'bg-white/[0.03]' : 'bg-zinc-50',
    modalOverlay: isDarkMode ? 'bg-black/80'     : 'bg-zinc-900/40',
    shadow:       isDarkMode ? 'shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'shadow-[0_10px_30px_rgba(0,0,0,0.05)]',
    btnSecondary: isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200',
  };

  const ModalWrapper = ({ title, children, onClose }) => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme.modalOverlay} backdrop-blur-md p-4 transition-all`}>
      <div className={`${theme.card} border w-full max-w-md rounded-[2.5rem] overflow-hidden ${theme.shadow}`}>
        <div className={`px-8 py-5 border-b ${theme.border} flex justify-between items-center ${isDarkMode ? 'bg-white/5' : 'bg-zinc-50'}`}>
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a84c]">{title}</h2>
          <button onClick={onClose} className={`${theme.textSub} hover:text-[#c9a84c] transition-colors`}><X size={18} /></button>
        </div>
        <div className="p-8 space-y-6">{children}</div>
      </div>
    </div>
  );

  const recentHistory = reports.slice(0, 5).map(r => ({
    id: r.room_label, issue: r.issue, status: r.status,
    time: r.created_at ? new Date(r.created_at).toLocaleString() : '',
  }));

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg} ${theme.textMain} text-left`}>

      {activeModal === 'success' && (
        <ModalWrapper title="Report Confirmed" onClose={() => setActiveModal(null)}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>
            <p className={`text-[12px] font-medium leading-relaxed ${theme.textSub}`}>
              The issue has been successfully logged and transmitted to the Engineering Department.
            </p>
          </div>
        </ModalWrapper>
      )}

      {/* HEADER */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-8 ${theme.border} mb-12`}>
        <div className="text-left">
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            Maintenance <span className="text-[#c9a84c]">Report</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.4em] mt-2 opacity-80`}>
            Engineering & Repairs Portal • INNOVA-HMS
          </p>
        </div>
        <div className="flex gap-4">
          <button className={`p-3 rounded-xl border transition-all ${theme.btnSecondary}`}>
            <ListFilter size={18} />
          </button>
          <div className={`hidden md:flex items-center gap-3 px-6 py-3 rounded-2xl border ${theme.card}`}>
            <Clock size={16} className="text-[#c9a84c]" />
            <span className="text-[10px] font-black uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10">

        {/* LEFT PANEL: FORM */}
        <div className="lg:col-span-3">
          <div className={`${theme.card} border rounded-[3rem] p-10 ${theme.shadow} relative overflow-hidden`}>
            {isDarkMode && <div className="absolute top-0 right-0 w-64 h-64 bg-[#c9a84c]/5 blur-[100px] rounded-full" />}

            <div className="flex items-center gap-5 mb-10 relative z-10">
              <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertOctagon size={28} />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-black uppercase tracking-widest">Record Issue</h2>
                <p className={`text-[10px] font-black ${theme.textSub} uppercase tracking-widest`}>Immediate dispatch system</p>
              </div>
            </div>

            <form className="space-y-8 text-left relative z-10" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#c9a84c] ml-1">Location / Room</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-[#c9a84c]" size={18} />
                    <input
                      type="text" required placeholder="e.g. Room 304"
                      value={form.room_label} onChange={e => setForm(p => ({ ...p, room_label: e.target.value }))}
                      className={`w-full p-4 pl-12 rounded-2xl border ${theme.input} text-[12px] font-bold outline-none focus:ring-2 focus:ring-[#c9a84c]/20 transition-all`}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#c9a84c] ml-1">Severity</label>
                  <select
                    value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
                    className={`w-full p-4 rounded-2xl border ${theme.input} text-[12px] font-bold outline-none cursor-pointer appearance-none`}
                  >
                    <option>High Priority</option>
                    <option>Medium Priority</option>
                    <option>Routine Check</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#c9a84c] ml-1">Problem Description</label>
                <textarea
                  required placeholder="Briefly explain the issue..."
                  value={form.issue} onChange={e => setForm(p => ({ ...p, issue: e.target.value }))}
                  className={`w-full p-6 rounded-3xl border ${theme.input} h-40 text-[12px] font-medium outline-none resize-none transition-all`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#c9a84c] ml-1">Out of Order?</label>
                  <div className="flex gap-4">
                    {['No', 'Yes'].map(opt => (
                      <button
                        type="button" key={opt}
                        onClick={() => setForm(p => ({ ...p, is_out_of_order: opt === 'Yes' }))}
                        className={`flex-1 py-4 rounded-xl border ${theme.border} text-[10px] font-black uppercase tracking-widest transition-all ${
                          opt === 'Yes' && form.is_out_of_order ? 'bg-red-500/10 border-red-500/50 text-red-500' : theme.btnSecondary
                        }`}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#c9a84c] ml-1">Attachment</label>
                  <button type="button" className={`w-full p-4 rounded-2xl border-2 border-dashed ${theme.border} text-[#c9a84c] flex items-center justify-center gap-3 hover:bg-[#c9a84c]/5 transition-all`}>
                    <Camera size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Capture Image</span>
                  </button>
                </div>
              </div>

              <button type="submit" className="w-full py-5 rounded-2xl bg-[#c9a84c] text-black font-black uppercase tracking-[0.3em] text-[12px] flex items-center justify-center gap-4 shadow-xl shadow-[#c9a84c]/20 hover:brightness-110 active:scale-95 transition-all mt-4">
                <Send size={18} strokeWidth={3} /> Dispatch Report
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: HISTORY */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`${theme.card} border rounded-[3rem] p-10 ${theme.shadow} h-full`}>
            <div className="flex items-center gap-5 mb-10">
              <div className="p-4 rounded-2xl bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20">
                <History size={28} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest">Repair Logs</h2>
            </div>

            <div className="space-y-5">
              {recentHistory.length === 0 ? (
                <p className={`text-center py-8 text-[11px] ${theme.textSub}`}>No reports yet.</p>
              ) : recentHistory.map((item, i) => (
                <div key={i} className={`p-6 rounded-[2rem] border ${theme.border} ${theme.innerCard} text-left relative overflow-hidden group transition-all hover:scale-[1.02]`}>
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <h4 className="text-[15px] font-black uppercase tracking-tight">{item.id}</h4>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${theme.border} ${
                      item.status === 'Pending' ? 'bg-orange-500/10 text-orange-500' : item.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#c9a84c]/10 text-[#c9a84c]'
                    }`}>● {item.status}</span>
                  </div>
                  <p className={`text-[11px] font-medium ${theme.textSub} mb-4`}>{item.issue}</p>
                  <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest opacity-60">
                    <Clock size={12} className="text-[#c9a84c]" />
                    <span>{item.time}</span>
                  </div>
                  <Wrench size={60} className="absolute -bottom-4 -right-4 opacity-[0.05] text-[#c9a84c] group-hover:rotate-12 transition-transform" />
                </div>
              ))}
            </div>

            <div className={`mt-10 p-6 rounded-3xl border border-dashed ${theme.border} bg-[#c9a84c]/5 text-left flex items-start gap-4`}>
              <AlertTriangle size={22} className="shrink-0 text-[#c9a84c]" />
              <p className={`text-[10px] font-bold leading-relaxed ${theme.textSub} uppercase tracking-tighter`}>
                High-priority issues trigger a direct notification to the on-duty engineer's mobile terminal.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MaintenanceReport;
