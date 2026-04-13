import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Banknote, Briefcase, Download, Receipt, Wallet } from 'lucide-react';
import useHrOverview from '../../../hooks/useHrOverview';
import {
  HrErrorState,
  HrLoadingState,
  HrPageHeader,
  HrSection,
  HrStatGrid,
  formatCompactCurrency,
  formatCurrency,
  getHrTheme,
  getInitials,
} from './hrShared';

const PayrollProcessing = () => {
  const [isDarkMode] = useOutletContext();
  const theme = getHrTheme(isDarkMode);
  const { data, loading, error } = useHrOverview();

  if (loading && !data) {
    return <HrLoadingState theme={theme} label="Preparing payroll run..." />;
  }

  const payroll = data?.payroll || {};
  const totals = payroll.totals || {};
  const stats = [
    { label: 'Employees for Payroll', value: totals.employees || 0, icon: <Briefcase size={20} />, sub: payroll.periodLabel || 'Current period' },
    { label: 'Gross Payroll', value: formatCompactCurrency(totals.gross), icon: <Banknote size={20} />, sub: 'Before deductions', subClassName: 'text-[#b3903c]' },
    { label: 'Total Deductions', value: formatCompactCurrency(totals.deductions), icon: <Receipt size={20} />, sub: 'Taxes and lateness penalties', subClassName: 'text-rose-500' },
    { label: 'Net Payroll', value: formatCompactCurrency(totals.net), icon: <Wallet size={20} />, sub: 'Estimated release amount', subClassName: 'text-emerald-500' },
  ];

  return (
    <div className={`min-h-screen space-y-8 p-4 ${theme.container}`}>
      <HrPageHeader
        theme={theme}
        eyebrow={`Generate payroll · ${payroll.periodLabel || 'Current cycle'}`}
        title="Payroll"
        accent="Processing"
        actions={
          <button className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest ${theme.card} ${theme.textMain}`}>
            <Download size={14} /> Export
          </button>
        }
      />

      {error ? <HrErrorState message={error} /> : null}

      <HrStatGrid theme={theme} stats={stats} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <HrSection theme={theme} className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Payroll Summary</h2>
            <span className="rounded-full border border-[#b3903c]/20 bg-[#b3903c]/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#b3903c]">
              DB Sync
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.tableHeader}`}>
                  <th className="px-4 py-4">Employee</th>
                  <th className="px-4 py-4">Dept</th>
                  <th className="px-4 py-4">Basic</th>
                  <th className="px-4 py-4">OT Pay</th>
                  <th className="px-4 py-4">Deductions</th>
                  <th className="px-4 py-4 text-right">Net Pay</th>
                </tr>
              </thead>
              <tbody className={`${isDarkMode ? 'divide-y divide-zinc-900/60' : 'divide-y divide-zinc-100'}`}>
                {(payroll.rows || []).map((row) => (
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
                    <td className={`px-4 py-4 text-[11px] font-mono ${theme.textMain}`}>{formatCurrency(row.basic)}</td>
                    <td className="px-4 py-4 text-[11px] font-mono text-[#b3903c]">{formatCurrency(row.ot)}</td>
                    <td className="px-4 py-4 text-[11px] font-mono text-rose-500">{formatCurrency(row.ded)}</td>
                    <td className="px-4 py-4 text-right text-[11px] font-mono font-black text-emerald-500">{formatCurrency(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!payroll.rows?.length ? <div className={`py-10 text-center text-sm italic ${theme.textSub}`}>No payroll rows available.</div> : null}
          </div>
        </HrSection>

        <HrSection theme={theme}>
          <h2 className={`mb-6 text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Department Breakdown</h2>
          <div className="space-y-6">
            {(payroll.departmentBreakdown || []).map((item) => (
              <div key={item.dept} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSub}`}>{item.dept}</p>
                  <p className={`text-sm font-black ${theme.textMain}`}>{formatCompactCurrency(item.amount)}</p>
                </div>
                <div className={`h-2 overflow-hidden rounded-full ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                  <div className="h-full bg-[#b3903c]" style={{ width: `${item.width || 0}%` }} />
                </div>
              </div>
            ))}
            {!payroll.departmentBreakdown?.length ? <p className={`text-sm italic ${theme.textSub}`}>No department payroll breakdown available.</p> : null}
          </div>
        </HrSection>
      </div>
    </div>
  );
};

export default PayrollProcessing;
