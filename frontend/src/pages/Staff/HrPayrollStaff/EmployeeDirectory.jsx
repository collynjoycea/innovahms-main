import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, Search, UserPlus, Users } from 'lucide-react';
import useHrOverview from '../../../hooks/useHrOverview';
import {
  HrErrorState,
  HrLoadingState,
  HrPageHeader,
  HrSection,
  formatDate,
  getHrTheme,
  getInitials,
} from './hrShared';

const EmployeeDirectory = () => {
  const [isDarkMode] = useOutletContext();
  const theme = getHrTheme(isDarkMode);
  const { data, loading, error } = useHrOverview();
  const [search, setSearch] = useState('');

  const employees = data?.staff || [];
  const filtered = useMemo(
    () =>
      employees.filter((item) =>
        `${item.name} ${item.employeeId} ${item.role} ${item.department} ${item.email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [employees, search],
  );

  if (loading && !data) {
    return <HrLoadingState theme={theme} label="Loading employee directory..." />;
  }

  return (
    <div className={`min-h-screen space-y-8 p-4 ${theme.container}`}>
      <HrPageHeader
        theme={theme}
        eyebrow="Innova-HMS registry"
        title="Staff"
        accent="Intelligence"
        actions={
          <>
            <button className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest ${theme.card} ${theme.textMain}`}>
              <Download size={14} /> Export CSV
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-[#b3903c] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white">
              <UserPlus size={14} /> Add New Staff
            </button>
          </>
        }
      />

      {error ? <HrErrorState message={error} /> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <HrSection theme={theme}>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>Total Employees</p>
          <h2 className={`mt-2 text-3xl font-black ${theme.textMain}`}>{employees.length}</h2>
        </HrSection>
        <HrSection theme={theme}>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>Active Staff</p>
          <h2 className={`mt-2 text-3xl font-black ${theme.textMain}`}>
            {employees.filter((item) => String(item.status || '').toLowerCase() === 'active').length}
          </h2>
        </HrSection>
        <HrSection theme={theme}>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textSub}`}>Departments Covered</p>
          <h2 className={`mt-2 text-3xl font-black ${theme.textMain}`}>{new Set(employees.map((item) => item.department)).size}</h2>
        </HrSection>
      </div>

      <HrSection theme={theme}>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-[#b3903c]" />
            <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Employee Directory</h2>
          </div>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${theme.input}`}>
            <Search size={14} className="text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID, role, or email..."
              className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-zinc-400 md:w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${theme.tableHeader}`}>
                <th className="px-4 py-4">Employee</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-4 py-4">Employee ID</th>
                <th className="px-4 py-4">Date Hired</th>
                <th className="px-4 py-4">Status</th>
              </tr>
            </thead>
            <tbody className={`${isDarkMode ? 'divide-y divide-zinc-900/60' : 'divide-y divide-zinc-100'}`}>
              {filtered.map((employee) => (
                <tr key={employee.id} className={isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-zinc-50'}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[10px] font-black ${isDarkMode ? 'border-zinc-800 bg-zinc-900 text-[#b3903c]' : 'border-zinc-200 bg-zinc-50 text-[#b3903c]'}`}>
                        {getInitials(employee.name)}
                      </div>
                      <div>
                        <p className={`text-[12px] font-black uppercase tracking-tight ${theme.textMain}`}>{employee.name}</p>
                        <p className={`text-[10px] font-bold ${theme.textSub}`}>{employee.email || '--'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black uppercase ${theme.textMain}`}>{employee.role}</span>
                      <span className="text-[10px] font-bold text-[#b3903c]">{employee.department}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-4 text-[11px] font-mono ${theme.textSub}`}>{employee.employeeId}</td>
                  <td className={`px-4 py-4 text-[11px] font-bold ${theme.textMain}`}>{formatDate(employee.dateHired)}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase italic ${
                        String(employee.status || '').toLowerCase() === 'active'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                          : 'border-zinc-400/20 bg-zinc-400/10 text-zinc-400'
                      }`}
                    >
                      {employee.status || 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? (
            <div className={`py-10 text-center text-sm italic ${theme.textSub}`}>No employee records matched your search.</div>
          ) : null}
        </div>
      </HrSection>
    </div>
  );
};

export default EmployeeDirectory;
