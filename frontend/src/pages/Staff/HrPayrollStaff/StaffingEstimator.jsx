import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BrainCircuit, Calendar, Users } from 'lucide-react';
import useHrOverview from '../../../hooks/useHrOverview';
import {
  HrErrorState,
  HrLoadingState,
  HrPageHeader,
  HrSection,
  getHrTheme,
} from './hrShared';

const StaffingEstimator = () => {
  const [isDarkMode] = useOutletContext();
  const theme = getHrTheme(isDarkMode);
  const { data, loading, error } = useHrOverview();
  const staffing = data?.staffing || {};
  const [occupancy, setOccupancy] = useState(null);

  const effectiveOccupancy = occupancy ?? Math.round(staffing.occupancyRate || 0);
  const departments = useMemo(
    () =>
      (staffing.departments || []).map((item) => ({
        ...item,
        required: effectiveOccupancy >= 85 ? item.peak : item.normal,
        gap: (effectiveOccupancy >= 85 ? item.peak : item.normal) - item.current,
      })),
    [effectiveOccupancy, staffing.departments],
  );

  if (loading && !data) {
    return <HrLoadingState theme={theme} label="Preparing staffing estimator..." />;
  }

  return (
    <div className={`min-h-screen space-y-8 p-4 ${theme.container}`}>
      <HrPageHeader theme={theme} eyebrow="Forecast-driven headcount planning" title="Staffing" accent="Estimator" />

      {error ? <HrErrorState message={error} /> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <HrSection theme={theme}>
          <div className="mb-6 flex items-center gap-3">
            <BrainCircuit size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Forecast Parameters</h2>
          </div>
          <div className="space-y-6">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>Predicted Occupancy</p>
              <h3 className={`mt-2 text-4xl font-black ${theme.textMain}`}>{effectiveOccupancy}%</h3>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={effectiveOccupancy}
              onChange={(event) => setOccupancy(Number(event.target.value))}
              className="w-full accent-[#b3903c]"
            />
            <div className="space-y-3 rounded-2xl border border-[#b3903c]/20 bg-[#b3903c]/10 p-4">
              <div className="flex items-center gap-2 text-[#b3903c]">
                <Users size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Current Scope</span>
              </div>
              <p className={`text-[11px] font-bold ${theme.textMain}`}>{staffing.currentActiveStaff || 0} active staff handling {staffing.totalRooms || 0} rooms.</p>
            </div>
          </div>
        </HrSection>

        <HrSection theme={theme} className="lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <Users size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Required Staff (Live Preview)</h2>
          </div>
          <div className="space-y-4">
            {departments.map((dept) => (
              <div key={dept.name} className={`rounded-2xl border p-4 ${isDarkMode ? 'border-zinc-900 bg-white/[0.02]' : 'border-zinc-100 bg-zinc-50'}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={`text-sm font-black uppercase tracking-tight ${theme.textMain}`}>{dept.name}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>Current {dept.current} · Normal {dept.normal} · Peak {dept.peak}</p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold">
                    <span className={theme.textMain}>Required: {dept.required}</span>
                    <span className={dept.gap > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                      {dept.gap > 0 ? `+${dept.gap} Needed` : 'Optimal'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {!departments.length ? <p className={`text-sm italic ${theme.textSub}`}>No staffing estimate available.</p> : null}
          </div>
        </HrSection>
      </div>

      <HrSection theme={theme}>
        <div className="mb-6 flex items-center gap-3">
          <Calendar size={18} className="text-[#b3903c]" />
          <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Daily Staffing Forecast</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.tableHeader}`}>
                <th className="px-4 py-4">Day</th>
                <th className="px-4 py-4">Occupancy</th>
                <th className="px-4 py-4">Department Needs</th>
              </tr>
            </thead>
            <tbody className={`${isDarkMode ? 'divide-y divide-zinc-900/60' : 'divide-y divide-zinc-100'}`}>
              {(staffing.dailyForecast || []).map((day) => (
                <tr key={day.day} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}>
                  <td className={`px-4 py-4 text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{day.day}</td>
                  <td className="px-4 py-4 text-[11px] font-black text-[#b3903c]">{day.occupancy}%</td>
                  <td className={`px-4 py-4 text-[11px] ${theme.textMain}`}>
                    {(day.departments || []).map((dept) => `${dept.name}: ${dept.required}`).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!staffing.dailyForecast?.length ? <div className={`py-10 text-center text-sm italic ${theme.textSub}`}>No daily forecast available.</div> : null}
        </div>
      </HrSection>
    </div>
  );
};

export default StaffingEstimator;
