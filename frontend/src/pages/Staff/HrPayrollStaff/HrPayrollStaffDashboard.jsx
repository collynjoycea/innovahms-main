import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Clock, UserCheck, Users, Wallet } from 'lucide-react';
import useHrOverview from '../../../hooks/useHrOverview';
import {
  HrErrorState,
  HrLoadingState,
  HrPageHeader,
  HrSection,
  HrStatGrid,
  formatCompactCurrency,
  getHrTheme,
  getInitials,
} from './hrShared';

const HrPayrollStaffDashboard = () => {
  const [isDarkMode] = useOutletContext();
  const theme = getHrTheme(isDarkMode);
  const { data, loading, error } = useHrOverview();

  if (loading && !data) {
    return <HrLoadingState theme={theme} label="Syncing HR dashboard..." />;
  }

  const dashboard = data?.dashboard || {};
  const stats = [
    { label: 'Active Employees', value: dashboard.activeEmployees || 0, icon: <Users size={20} />, sub: `${dashboard.totalEmployees || 0} total staff`, subClassName: 'text-emerald-500' },
    { label: 'Monthly Payroll', value: formatCompactCurrency(dashboard.monthlyPayroll), icon: <Wallet size={20} />, sub: 'Net projected release', subClassName: 'text-[#b3903c]' },
    { label: 'Present Today', value: dashboard.presentToday || 0, icon: <UserCheck size={20} />, sub: `${dashboard.absentToday || 0} absent today`, subClassName: 'text-blue-500' },
    { label: 'Pending Leaves', value: dashboard.pendingLeaves || 0, icon: <Clock size={20} />, sub: `${dashboard.onLeaveToday || 0} currently on leave`, subClassName: 'text-amber-500' },
  ];

  return (
    <div className={`min-h-screen space-y-8 p-4 ${theme.container}`}>
      <HrPageHeader
        theme={theme}
        eyebrow="Innova-HMS live intelligence"
        title="HR & Payroll"
        accent="Command"
        actions={
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${theme.card}`}>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
              <Activity size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>System Status</p>
              <p className="text-[11px] font-bold uppercase text-emerald-500">Operational</p>
            </div>
          </div>
        }
      />

      {error ? <HrErrorState message={error} /> : null}

      <HrStatGrid theme={theme} stats={stats} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <HrSection theme={theme} className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Today's Attendance</h2>
            <span className="rounded-full border border-[#b3903c]/20 bg-[#b3903c]/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#b3903c]">
              Live Sync
            </span>
          </div>
          <div className="space-y-4">
            {(dashboard.attendanceLogs || []).length ? (
              dashboard.attendanceLogs.map((log) => (
                <div
                  key={`${log.staffId}-${log.time}`}
                  className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-zinc-900/60' : 'border-zinc-100'} last:border-0 last:pb-0`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[10px] font-black ${isDarkMode ? 'border-zinc-800 bg-zinc-900 text-[#b3903c]' : 'border-zinc-200 bg-zinc-50 text-[#b3903c]'}`}>
                      {getInitials(log.name)}
                    </div>
                    <div>
                      <p className={`text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{log.name}</p>
                      <p className={`text-[10px] font-bold ${theme.textSub}`}>{log.dept}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[11px] font-mono ${theme.textMain}`}>{log.time || '--'}</p>
                    <p className="text-[9px] font-black uppercase italic text-emerald-500">{log.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-sm italic ${theme.textSub}`}>No attendance logs available for today.</p>
            )}
          </div>
        </HrSection>

        <div className="space-y-6">
          <HrSection theme={theme} className="bg-gradient-to-br from-[#b3903c]/10 to-transparent">
            <h2 className={`mb-4 text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Critical Alerts</h2>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className={`text-[11px] font-bold leading-relaxed ${theme.textMain}`}>
                {dashboard.pendingLeaves || 0} leave requests are waiting for review.
              </p>
            </div>
            <div className="mt-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className={`text-[11px] font-bold leading-relaxed ${theme.textMain}`}>
                {dashboard.lateToday || 0} staff clocked in late today.
              </p>
            </div>
          </HrSection>

          <HrSection theme={theme}>
            <h2 className={`mb-4 text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Property Scope</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Hotel</span>
                <span className={`text-[12px] font-bold ${theme.textMain}`}>{data?.hotelName || 'Innova Property'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>On Leave</span>
                <span className={`text-[12px] font-bold ${theme.textMain}`}>{dashboard.onLeaveToday || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>Absences</span>
                <span className={`text-[12px] font-bold ${theme.textMain}`}>{dashboard.absentToday || 0}</span>
              </div>
            </div>
          </HrSection>
        </div>
      </div>
    </div>
  );
};

export default HrPayrollStaffDashboard;
