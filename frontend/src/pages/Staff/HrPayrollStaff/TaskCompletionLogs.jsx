import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlarmClock, BarChart3, CheckCircle2, ClipboardCheck, Search, XCircle } from 'lucide-react';
import useHrOverview from '../../../hooks/useHrOverview';
import {
  HrErrorState,
  HrLoadingState,
  HrPageHeader,
  HrSection,
  HrStatGrid,
  getHrTheme,
  getInitials,
} from './hrShared';

const TaskCompletionLogs = () => {
  const [isDarkMode] = useOutletContext();
  const theme = getHrTheme(isDarkMode);
  const { data, loading, error } = useHrOverview();
  const [search, setSearch] = useState('');

  const taskLogs = data?.taskLogs || {};
  const summary = taskLogs.summary || {};
  const rows = useMemo(
    () =>
      (taskLogs.rows || []).filter((item) =>
        `${item.name} ${item.dept} ${item.task} ${item.status}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [taskLogs.rows, search],
  );

  if (loading && !data) {
    return <HrLoadingState theme={theme} label="Loading task completion logs..." />;
  }

  const stats = [
    { label: 'Total Logs', value: summary.totalLogs || 0, icon: <ClipboardCheck size={20} />, sub: 'Combined attendance and task data' },
    { label: 'On-Time', value: summary.onTime || 0, icon: <CheckCircle2 size={20} />, sub: 'Finished assigned work', subClassName: 'text-emerald-500' },
    { label: 'Late', value: summary.late || 0, icon: <AlarmClock size={20} />, sub: 'Pending completion', subClassName: 'text-amber-500' },
    { label: 'Overdue', value: summary.overdue || 0, icon: <XCircle size={20} />, sub: 'Needs follow-up', subClassName: 'text-rose-500' },
  ];

  return (
    <div className={`min-h-screen space-y-8 p-4 ${theme.container}`}>
      <HrPageHeader theme={theme} eyebrow="Operational log" title="Task Completion" accent="Logs" />

      {error ? <HrErrorState message={error} /> : null}

      <HrStatGrid theme={theme} stats={stats} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <HrSection theme={theme} className="lg:col-span-2">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Combined Operational Log</h2>
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${theme.input}`}>
              <Search size={14} className="text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search logs..."
                className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-zinc-400 md:w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.tableHeader}`}>
                  <th className="px-4 py-4">Employee</th>
                  <th className="px-4 py-4">Attendance</th>
                  <th className="px-4 py-4 text-center">Tasks</th>
                  <th className="px-4 py-4">Notable Task</th>
                  <th className="px-4 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className={`${isDarkMode ? 'divide-y divide-zinc-900/60' : 'divide-y divide-zinc-100'}`}>
                {rows.map((row) => (
                  <tr key={row.staffId} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b3903c]/10 text-[10px] font-black text-[#b3903c]">
                          {getInitials(row.name)}
                        </div>
                        <div>
                          <p className={`text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{row.name}</p>
                          <p className={`text-[9px] font-bold ${theme.textSub}`}>{row.dept}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className={`text-[10px] font-black uppercase ${theme.textMain}`}>{row.attendance}</p>
                      <p className={`text-[9px] font-bold ${theme.textSub}`}>{row.shift}</p>
                    </td>
                    <td className={`px-4 py-4 text-center text-[12px] font-mono ${theme.textMain}`}>{row.done}/{row.assigned}</td>
                    <td className={`px-4 py-4 text-[11px] ${theme.textMain}`}>{row.task}</td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase italic ${
                          row.status === 'Completed'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                            : row.status === 'Overdue'
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length ? <div className={`py-10 text-center text-sm italic ${theme.textSub}`}>No task logs available.</div> : null}
          </div>
        </HrSection>

        <HrSection theme={theme}>
          <div className="mb-6 flex items-center gap-3">
            <BarChart3 size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Avg Completion Time</h2>
          </div>
          <div className="space-y-5">
            {(summary.avgCompletionTime || []).map((item) => (
              <div key={item.dept} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{item.dept}</p>
                  <p className={`text-sm font-black ${theme.textMain}`}>{item.minutes} min</p>
                </div>
                <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                  <div className="h-full bg-[#b3903c]" style={{ width: `${Math.min(item.minutes, 100)}%` }} />
                </div>
              </div>
            ))}
            {!summary.avgCompletionTime?.length ? <p className={`text-sm italic ${theme.textSub}`}>No completion timing data available.</p> : null}
          </div>
        </HrSection>
      </div>
    </div>
  );
};

export default TaskCompletionLogs;
