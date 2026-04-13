import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertCircle, Box, CheckCircle2, Search, Users } from 'lucide-react';
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

const WorkloadTracking = () => {
  const [isDarkMode] = useOutletContext();
  const theme = getHrTheme(isDarkMode);
  const { data, loading, error } = useHrOverview();
  const [search, setSearch] = useState('');

  const workload = data?.workload || {};
  const summary = workload.summary || {};
  const rows = useMemo(
    () =>
      (workload.rows || []).filter((item) =>
        `${item.name} ${item.dept} ${item.status}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [workload.rows, search],
  );

  if (loading && !data) {
    return <HrLoadingState theme={theme} label="Analyzing workload distribution..." />;
  }

  const stats = [
    { label: 'Total Tasks', value: summary.totalTasks || 0, icon: <Box size={20} />, sub: 'Assigned from task logs' },
    { label: 'Completed', value: summary.completed || 0, icon: <CheckCircle2 size={20} />, sub: 'Closed tasks', subClassName: 'text-emerald-500' },
    { label: 'Overloaded', value: summary.overloaded || 0, icon: <AlertCircle size={20} />, sub: 'Critical capacity', subClassName: 'text-rose-500' },
    { label: 'Underutilized', value: summary.underutilized || 0, icon: <Users size={20} />, sub: 'Low assigned load', subClassName: 'text-purple-500' },
  ];

  return (
    <div className={`min-h-screen space-y-8 p-4 ${theme.container}`}>
      <HrPageHeader theme={theme} eyebrow="Capacity monitoring" title="Staff" accent="Workload" />

      {error ? <HrErrorState message={error} /> : null}

      <HrStatGrid theme={theme} stats={stats} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <HrSection theme={theme} className="lg:col-span-2">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Individual Detail</h2>
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${theme.input}`}>
              <Search size={14} className="text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-zinc-400 md:w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.tableHeader}`}>
                  <th className="px-4 py-4">Employee</th>
                  <th className="px-4 py-4">Dept</th>
                  <th className="px-4 py-4 text-center">Tasks</th>
                  <th className="px-4 py-4 text-center">Overdue</th>
                  <th className="px-4 py-4 text-right">Capacity</th>
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
                        <span className={`text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[11px] font-bold text-[#b3903c]">{row.dept}</td>
                    <td className={`px-4 py-4 text-center text-[12px] font-mono ${theme.textMain}`}>{row.completed}/{row.assigned}</td>
                    <td className="px-4 py-4 text-center text-[12px] font-mono text-rose-500">{row.overdue}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[11px] font-mono font-bold ${row.capacity >= 100 ? 'text-rose-500' : 'text-[#b3903c]'}`}>{row.capacity}%</span>
                        <div className={`h-2 w-20 overflow-hidden rounded-full ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                          <div className={`h-full ${row.capacity >= 100 ? 'bg-rose-500' : 'bg-[#b3903c]'}`} style={{ width: `${Math.min(row.capacity, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length ? <div className={`py-10 text-center text-sm italic ${theme.textSub}`}>No workload records available.</div> : null}
          </div>
        </HrSection>

        <HrSection theme={theme}>
          <h2 className={`mb-6 text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Load Status</h2>
          <div className="space-y-5">
            {(summary.loadStatus || []).map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{item.label}</p>
                  <p className={`text-sm font-black ${theme.textMain}`}>{item.count}</p>
                </div>
                <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                  <div className="h-full bg-[#b3903c]" style={{ width: `${Math.min((item.count || 0) * 20, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </HrSection>
      </div>
    </div>
  );
};

export default WorkloadTracking;
