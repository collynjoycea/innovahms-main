import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import useStaffSession from '../../../hooks/useStaffSession';
import { 
  Clock, User, RefreshCcw, AlertTriangle, 
  CheckCircle2, Flag, ClipboardList, 
  Plus, Download, X, ChevronRight
} from 'lucide-react';

const HKTasks = () => {
  const { isDarkMode } = useOutletContext() || { isDarkMode: true };
  const { qs, hotelId } = useStaffSession();
  const [activeModal, setActiveModal] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState({ pending: [], inProgress: [], completed: [] });
  const [newTask, setNewTask] = useState({ room_label: '', task_type: 'Full Clean', priority: 'NORMAL', notes: '', scheduled_time: '' });
  const [completeData, setCompleteData] = useState({ time_spent_mins: '', room_status: 'Ready for Guest' });
  const [issueData, setIssueData] = useState({ severity: 'Medium Priority', description: '' });

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`/api/housekeeping/tasks${qs}`);
      const all = res.data.tasks || [];
      setTasks({
        pending:    all.filter(t => t.status === 'Pending'),
        inProgress: all.filter(t => t.status === 'In Progress'),
        completed:  all.filter(t => t.status === 'Completed').slice(0, 5),
      });
    } catch {}
  };

  useEffect(() => { fetchTasks(); }, [qs]);

  const handleComplete = async () => {
    if (!selectedTask) return;
    try {
      await axios.patch(`/api/housekeeping/tasks/${selectedTask.id}/status`, { status: 'Completed', time_spent_mins: completeData.time_spent_mins });
      if (completeData.room_status) {
        await axios.patch(`/api/housekeeping/room-status/${selectedTask.room_label}`, { hotel_id: hotelId, status: completeData.room_status === 'Ready for Guest' ? 'Clean' : 'Dirty' });
      }
      setActiveModal(null);
      fetchTasks();
    } catch {}
  };

  const handleIssue = async () => {
    if (!selectedTask) return;
    try {
      await axios.post('/api/housekeeping/maintenance', { hotel_id: hotelId, room_label: selectedTask.room_label, issue: issueData.description, severity: issueData.severity });
      setActiveModal(null);
    } catch {}
  };

  const handleCreateTask = async () => {
    try {
      await axios.post('/api/housekeeping/tasks', { ...newTask, hotel_id: hotelId });
      setActiveModal(null);
      setNewTask({ room_label: '', task_type: 'Full Clean', priority: 'NORMAL', notes: '', scheduled_time: '' });
      fetchTasks();
    } catch {}
  };

  const theme = {
    bg: isDarkMode ? "bg-[#0c0c0e]" : "bg-[#f0f0f3]",
    card: isDarkMode ? "bg-[#111111]/90 backdrop-blur-xl" : "bg-white",
    input: isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-300 text-gray-900",
    textMain: isDarkMode ? "text-white" : "text-gray-900",
    textSub: isDarkMode ? "text-gray-500" : "text-gray-400",
    border: isDarkMode ? "border-white/10" : "border-gray-300",
    gold: "#c9a84c",
    goldGradient: "from-[#c9a84c] to-[#a68a39]",
    shadow: isDarkMode ? "shadow-[0_20px_50px_rgba(0,0,0,0.5)]" : "shadow-xl"
  };

  // --- MODALS (GOLDEN VERSION) ---

  const ModalWrapper = ({ title, children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className={`${theme.card} border ${theme.border} w-full max-w-md rounded-2xl overflow-hidden ${theme.shadow}`}>
        <div className={`px-6 py-4 border-b ${theme.border} flex justify-between items-center bg-white/5`}>
          <h2 className={`text-sm font-black uppercase tracking-[0.2em] text-[#c9a84c]`}>{title}</h2>
          <button onClick={onClose} className={`${theme.textSub} hover:text-white transition-colors`}><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5">
          {children}
          <div className="flex gap-3 mt-4">
            <button onClick={onClose} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border ${theme.border} ${theme.textMain} hover:bg-white/5 transition-all`}>
              Cancel
            </button>
            <button className="flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#c9a84c] text-black shadow-lg shadow-[#c9a84c]/20 hover:scale-[1.02] active:scale-95 transition-all">
              Confirm Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const taskGroups = {
    pending:    tasks.pending.map(t => ({ id: t.id, title: t.room_label, type: t.task_type, time: t.scheduled_time || '', staff: t.staff_name || '', note: t.notes || '', status: t.priority })),
    inProgress: tasks.inProgress.map(t => ({ id: t.id, title: t.room_label, type: t.task_type, time: t.scheduled_time || '', staff: t.staff_name || '', note: t.notes || '', status: t.priority })),
    completed:  tasks.completed.map(t => ({ id: t.id, title: t.room_label, type: t.task_type, time: t.scheduled_time || '', staff: t.staff_name || '', note: t.notes || '', status: t.priority })),
  };

  const TaskCard = ({ task, isDone }) => (
    <div className={`p-5 rounded-2xl border ${theme.border} ${theme.card} group hover:border-[#c9a84c]/40 transition-all duration-300 relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className={`text-xl font-black uppercase tracking-tighter ${theme.textMain}`}>{task.title}</h4>
          <p className={`text-[8px] font-black uppercase tracking-[0.2em] text-[#c9a84c]`}>{task.type}</p>
        </div>
        <div className={`px-2 py-1 rounded-md border text-[7px] font-black uppercase tracking-widest ${
          task.status === 'URGENT' ? 'border-red-500/50 text-red-500 bg-red-500/5' : 'border-[#c9a84c]/30 text-[#c9a84c] bg-[#c9a84c]/5'
        }`}>
          {task.status}
        </div>
      </div>

      <div className={`flex gap-4 mb-4 text-[10px] font-bold uppercase ${theme.textSub}`}>
        <span className="flex items-center gap-1.5"><Clock size={12} className="text-[#c9a84c]"/> {task.time}</span>
        <span className="flex items-center gap-1.5"><User size={12} className="text-[#c9a84c]"/> {task.staff}</span>
      </div>

      <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100'} mb-5`}>
        <p className="text-[10px] font-bold italic text-[#c9a84c] leading-relaxed">"{task.note}"</p>
      </div>

      {!isDone && (
        <div className="flex gap-2">
          <button 
            onClick={() => { setSelectedTask(task); setActiveModal('complete'); }}
            className="flex-[2.5] bg-[#c9a84c] text-black text-[9px] font-black py-3 rounded-xl uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-[#c9a84c]/10"
          >
            <CheckCircle2 size={14} strokeWidth={3}/> Mark Done
          </button>
          <button 
            onClick={() => { setSelectedTask(task); setActiveModal('issue'); }}
            className={`flex-1 p-3 rounded-xl border ${theme.border} flex items-center justify-center text-[#c9a84c] hover:bg-[#c9a84c]/5 transition-all`}
          >
            <Flag size={14}/>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`p-8 min-h-screen transition-all duration-500 ${theme.bg} font-sans`}>
      
      {/* Modals Logic */}
      {activeModal === 'complete' && (
        <ModalWrapper title="Complete Assignment" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-left">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Room Target</label>
              <input disabled value={`${selectedTask?.title} — ${selectedTask?.type}`} className={`w-full p-3 rounded-xl border ${theme.input} font-bold opacity-50`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Time Spent (mins)</label>
                <input type="number" placeholder="45" value={completeData.time_spent_mins} onChange={e => setCompleteData(p => ({...p, time_spent_mins: e.target.value}))} className={`w-full p-3 rounded-xl border ${theme.input}`} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Room Status</label>
                <select value={completeData.room_status} onChange={e => setCompleteData(p => ({...p, room_status: e.target.value}))} className={`w-full p-3 rounded-xl border ${theme.input} text-[10px] font-bold`}>
                  <option>Ready for Guest</option>
                  <option>Needs Inspection</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setActiveModal(null)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border ${theme.border} ${theme.textMain}`}>Cancel</button>
              <button onClick={handleComplete} className="flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#c9a84c] text-black">Confirm</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {activeModal === 'issue' && (
        <ModalWrapper title="Report Issue" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Location</label>
                <input disabled value={selectedTask?.title} className={`w-full p-3 rounded-xl border ${theme.input} font-bold opacity-50`} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Severity</label>
                <select value={issueData.severity} onChange={e => setIssueData(p => ({...p, severity: e.target.value}))} className={`w-full p-3 rounded-xl border ${theme.input} text-[10px] font-bold`}>
                  <option>High Priority</option>
                  <option>Medium Priority</option>
                  <option>Routine Check</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Issue Details</label>
              <textarea placeholder="Describe the findings..." value={issueData.description} onChange={e => setIssueData(p => ({...p, description: e.target.value}))} className={`w-full p-3 rounded-xl border ${theme.input} h-24`} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setActiveModal(null)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border ${theme.border} ${theme.textMain}`}>Cancel</button>
              <button onClick={handleIssue} className="flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#c9a84c] text-black">Submit</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {activeModal === 'new' && (
        <ModalWrapper title="New Assignment" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Room</label>
                <input placeholder="e.g. Room 103" value={newTask.room_label} onChange={e => setNewTask(p => ({...p, room_label: e.target.value}))} className={`w-full p-3 rounded-xl border ${theme.input}`} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Priority</label>
                <select value={newTask.priority} onChange={e => setNewTask(p => ({...p, priority: e.target.value}))} className={`w-full p-3 rounded-xl border ${theme.input} text-[10px] font-bold`}>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Task Type</label>
              <select value={newTask.task_type} onChange={e => setNewTask(p => ({...p, task_type: e.target.value}))} className={`w-full p-3 rounded-xl border ${theme.input} text-[10px] font-bold`}>
                <option>Full Clean</option>
                <option>Linen Change</option>
                <option>Turn-Down</option>
                <option>Inspection</option>
                <option>Common Area</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[#c9a84c] mb-2 block">Notes</label>
              <textarea placeholder="Task notes..." value={newTask.notes} onChange={e => setNewTask(p => ({...p, notes: e.target.value}))} className={`w-full p-3 rounded-xl border ${theme.input} h-20`} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setActiveModal(null)} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border ${theme.border} ${theme.textMain}`}>Cancel</button>
              <button onClick={handleCreateTask} className="flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#c9a84c] text-black">Create</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Header Section */}
      <div className={`flex flex-col md:flex-row justify-between items-end border-b pb-6 ${theme.border} mb-10`}>
        <div className="text-left">
          <h1 className={`text-3xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Housekeeping <span className="text-[#c9a84c]">Ops</span>
          </h1>
          <p className={`text-[10px] font-bold ${theme.textSub} uppercase tracking-[0.3em] mt-1`}>Obsidian Sanctuary Operations</p>
        </div>
        <div className="flex gap-4">
          <button className={`p-3 rounded-xl border ${theme.border} ${theme.textMain} hover:border-[#c9a84c]/50 transition-all`}>
            <Download size={18} />
          </button>
          <button onClick={() => setActiveModal('new')} className="px-8 py-3 rounded-xl bg-[#c9a84c] text-black font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#c9a84c]/20 flex items-center gap-2">
            <Plus size={18} strokeWidth={3} /> New Assignment
          </button>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* PENDING */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-l-2 border-orange-500 pl-4">
            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Pending</h3>
            <span className="text-[10px] font-black text-[#c9a84c] bg-[#c9a84c]/10 px-2 py-0.5 rounded">{String(taskGroups.pending.length).padStart(2,'0')}</span>
          </div>
          <div className="space-y-5">
            {taskGroups.pending.length === 0 ? <p className={`text-[11px] ${theme.textSub} text-center py-8`}>No pending tasks</p> : taskGroups.pending.map((t, i) => <TaskCard key={i} task={t} isDone={false} />)}
          </div>
        </div>

        {/* IN PROGRESS */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-l-2 border-[#c9a84c] pl-4">
            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>In Progress</h3>
            <span className="text-[10px] font-black text-[#c9a84c] bg-[#c9a84c]/10 px-2 py-0.5 rounded">{String(taskGroups.inProgress.length).padStart(2,'0')}</span>
          </div>
          <div className="space-y-5">
            {taskGroups.inProgress.length === 0 ? <p className={`text-[11px] ${theme.textSub} text-center py-8`}>No tasks in progress</p> : taskGroups.inProgress.map((t, i) => <TaskCard key={i} task={t} isDone={false} />)}
          </div>
        </div>

        {/* COMPLETED */}
        <div className="space-y-6 opacity-40 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between border-l-2 border-emerald-500 pl-4">
            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Completed</h3>
            <span className="text-[10px] font-black text-[#c9a84c] bg-[#c9a84c]/10 px-2 py-0.5 rounded">{String(taskGroups.completed.length).padStart(2,'0')}</span>
          </div>
          <div className="space-y-5">
            {taskGroups.completed.map((t, i) => <TaskCard key={i} task={t} isDone={true} />)}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HKTasks;