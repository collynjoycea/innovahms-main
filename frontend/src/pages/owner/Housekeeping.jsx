import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertCircle, BedDouble, CheckCircle2, Clock3, RefreshCcw, Sparkles } from "lucide-react";

const FILTERS = [
  { key: "all", label: "All Tasks" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const formatStamp = (value) => {
  if (!value) return "No timestamp";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const getStatusTone = (status, isDarkMode) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return isDarkMode ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700";
  if (normalized === "in_progress") return isDarkMode ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700";
  return isDarkMode ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-700";
};

export default function Housekeeping() {
  const { isDarkMode } = useOutletContext() || { isDarkMode: false };
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRooms: 0, cleanedToday: 0, pending: 0, inProgress: 0 });
  const [tasks, setTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

  const ownerSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("ownerSession") || "{}");
    } catch {
      return {};
    }
  }, []);

  const fetchHousekeepingData = async () => {
    const hotelId = ownerSession?.hotelId || ownerSession?.hotel_id;
    if (!hotelId) {
      setTasks([]);
      setSummary({ totalRooms: 0, cleanedToday: 0, pending: 0, inProgress: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [statsResponse, tasksResponse] = await Promise.all([
        fetch(`/api/housekeeping/dashboard-stats?hotel_id=${hotelId}`),
        fetch(`/api/housekeeping/tasks?hotel_id=${hotelId}`),
      ]);
      const statsData = await statsResponse.json().catch(() => ({}));
      const tasksData = await tasksResponse.json().catch(() => ({}));
      const nextTasks = Array.isArray(tasksData.tasks) ? tasksData.tasks : [];

      setSummary({
        totalRooms: Array.isArray(statsData.roomGrid) ? statsData.roomGrid.length : 0,
        cleanedToday: Number(statsData.completedToday || 0),
        pending: Number(statsData.pendingTasks || 0),
        inProgress: Number(statsData.inProgress || 0),
      });
      setTasks(
        nextTasks.map((task) => ({
          id: task.id,
          room: task.room_label || "--",
          type: task.task_type || "General cleaning",
          status: String(task.status || "pending").toLowerCase().replace(/\s+/g, "_"),
          assignedTo: task.staff_name || "Unassigned",
          priority: task.priority || "NORMAL",
          notes: task.notes || "No notes added.",
          updatedAt: task.completed_at || task.scheduled_time || task.created_at || "",
        }))
      );
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeepingData();
    const timer = window.setInterval(fetchHousekeepingData, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredTasks = activeFilter === "all" ? tasks : tasks.filter((task) => task.status === activeFilter);

  const cards = [
    { label: "Total Rooms", value: summary.totalRooms, icon: BedDouble },
    { label: "Cleaned Today", value: summary.cleanedToday, icon: CheckCircle2 },
    { label: "In Progress", value: summary.inProgress, icon: Clock3 },
    { label: "Pending", value: summary.pending, icon: AlertCircle },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className={`overflow-hidden rounded-[32px] border p-8 ${isDarkMode ? "border-white/10 bg-[radial-gradient(circle_at_top_left,#1a1f2b_0%,#10141d_60%,#0c0f16_100%)]" : "border-[#eadfc8] bg-[radial-gradient(circle_at_top_left,#fffaf1_0%,#ffffff_55%,#f7f2e6_100%)]"}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#bf9b30]">Owner Operations</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Housekeeping Command Center</h1>
              <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Live task statuses, room turnaround, and staffing assignments are now coming from the housekeeping database endpoints.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchHousekeepingData}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? "bg-white/5 text-slate-100 hover:bg-white/10" : "bg-slate-900 text-white hover:bg-slate-800"}`}
            >
              <RefreshCcw size={15} /> Refresh
            </button>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <article key={label} className={`rounded-[28px] border p-6 ${isDarkMode ? "border-white/10 bg-[#11151d]" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#bf9b30]">
                  <Icon size={20} />
                </div>
                <Sparkles size={16} className={isDarkMode ? "text-slate-600" : "text-slate-300"} />
              </div>
              <p className={`mt-5 text-[10px] font-black uppercase tracking-[0.24em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
            </article>
          ))}
        </section>

        <section className={`rounded-[32px] border p-6 ${isDarkMode ? "border-white/10 bg-[#11151d]" : "border-slate-200 bg-white"}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bf9b30]">Task Queue</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Housekeeping workload</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-2xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition ${
                    activeFilter === filter.key
                      ? "bg-[#bf9b30] text-[#0f1117]"
                      : isDarkMode
                        ? "bg-white/5 text-slate-300 hover:bg-white/10"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-black/5">
            {loading ? (
              <div className={`px-6 py-14 text-center text-sm ${isDarkMode ? "bg-[#0d1118] text-slate-400" : "bg-slate-50 text-slate-500"}`}>Loading housekeeping data...</div>
            ) : filteredTasks.length === 0 ? (
              <div className={`px-6 py-14 text-center text-sm ${isDarkMode ? "bg-[#0d1118] text-slate-400" : "bg-slate-50 text-slate-500"}`}>No tasks matched the current filter.</div>
            ) : (
              <div className={isDarkMode ? "bg-[#0d1118]" : "bg-white"}>
                {filteredTasks.map((task) => (
                  <div key={task.id} className={`grid gap-4 border-b px-6 py-5 lg:grid-cols-[1.1fr,0.9fr,0.7fr,0.9fr] ${isDarkMode ? "border-white/5" : "border-slate-100"}`}>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.14em]">{task.room}</p>
                      <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{task.type}</p>
                      <p className={`mt-2 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{task.notes}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Assigned To</p>
                      <p className="mt-2 text-sm font-semibold">{task.assignedTo}</p>
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Status</p>
                      <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getStatusTone(task.status, isDarkMode)}`}>
                        {task.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Last Update</p>
                      <p className="mt-2 text-sm font-semibold">{formatStamp(task.updatedAt)}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Priority: {task.priority}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
