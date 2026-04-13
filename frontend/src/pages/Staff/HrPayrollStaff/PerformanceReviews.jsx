import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, AlertTriangle, Search, Star, ThumbsUp, Trophy } from 'lucide-react';
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

const PerformanceReviews = () => {
  const [isDarkMode] = useOutletContext();
  const theme = getHrTheme(isDarkMode);
  const { data, loading, error } = useHrOverview();
  const [search, setSearch] = useState('');

  const performance = data?.performance || {};
  const reviews = useMemo(
    () =>
      (performance.reviews || []).filter((item) =>
        `${item.name} ${item.dept} ${item.rating}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [performance.reviews, search],
  );

  if (loading && !data) {
    return <HrLoadingState theme={theme} label="Loading performance analytics..." />;
  }

  const stats = [
    { label: 'Avg Performance Score', value: `${performance.averageScore || 0}%`, icon: <Star size={20} />, sub: 'Weighted from attendance and task completion', subClassName: 'text-[#b3903c]' },
    { label: 'Excellent', value: performance.excellent || 0, icon: <Trophy size={20} />, sub: '90% and above', subClassName: 'text-emerald-500' },
    { label: 'Good', value: performance.good || 0, icon: <ThumbsUp size={20} />, sub: '75% to 89%', subClassName: 'text-blue-500' },
    { label: 'Needs Improvement', value: performance.needsImprovement || 0, icon: <AlertTriangle size={20} />, sub: 'Below 75%', subClassName: 'text-rose-500' },
  ];

  return (
    <div className={`min-h-screen space-y-8 p-4 ${theme.container}`}>
      <HrPageHeader theme={theme} eyebrow="Staff KPIs and evaluations" title="Performance" accent="Monitoring" />

      {error ? <HrErrorState message={error} /> : null}

      <HrStatGrid theme={theme} stats={stats} />

      <HrSection theme={theme}>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Performance Registry</h2>
          </div>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${theme.input}`}>
            <Search size={14} className="text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff..."
              className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-zinc-400 md:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.tableHeader}`}>
                <th className="px-4 py-4">Employee</th>
                <th className="px-4 py-4 text-center">Tasks</th>
                <th className="px-4 py-4 text-center">Attendance</th>
                <th className="px-4 py-4 text-center">Score</th>
                <th className="px-4 py-4 text-center">Rating</th>
              </tr>
            </thead>
            <tbody className={`${isDarkMode ? 'divide-y divide-zinc-900/60' : 'divide-y divide-zinc-100'}`}>
              {reviews.map((item) => (
                <tr key={item.staffId} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#b3903c]/10 text-[10px] font-black text-[#b3903c]">
                        {getInitials(item.name)}
                      </div>
                      <div>
                        <p className={`text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{item.name}</p>
                        <p className="text-[9px] font-bold uppercase text-[#b3903c]">{item.dept}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-4 text-center text-[12px] font-mono ${theme.textMain}`}>{item.tasks}</td>
                  <td className={`px-4 py-4 text-center text-[12px] font-mono ${theme.textMain}`}>{item.attendance}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-500">
                      {item.score}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase italic ${
                        item.rating === 'Excellent'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : item.rating === 'Good'
                            ? 'border-blue-500/20 bg-blue-500/10 text-blue-500'
                            : 'border-rose-500/20 bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {item.rating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!reviews.length ? <div className={`py-10 text-center text-sm italic ${theme.textSub}`}>No performance records available.</div> : null}
        </div>
      </HrSection>
    </div>
  );
};

export default PerformanceReviews;
