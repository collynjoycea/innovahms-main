import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldCheck, Users, Save, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const MODULE_DEFINITIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'reservations', label: 'Reservations' },
  { key: 'checkin_checkout', label: 'Check-in / Check-out' },
  { key: 'room_management', label: 'Room Management' },
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'staff_attendance', label: 'Staff Attendance' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'reports', label: 'Reports' },
];

const parseStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('adminData') || '{}');
  } catch {
    return {};
  }
};

const RolesPermissions = () => {
  const { isDarkMode } = useOutletContext();
  const [roles, setRoles] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const theme = {
    bg: isDarkMode ? 'bg-[#0F2B25]' : 'bg-[#EEEEEE]',
    card: isDarkMode ? 'bg-[#163C34]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  const adminIdentity = () => {
    const admin = parseStoredAdmin();
    return admin?.name || admin?.email || 'Admin';
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to load roles.');
      setRoles(data.roles || []);
      const initialDraft = {};
      (data.roles || []).forEach((r) => { initialDraft[r.role] = { ...r.permissions }; });
      setDraft(initialDraft);
    } catch (err) {
      setError(err.message || 'Unable to load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const toggleModule = (role, moduleKey) => {
    setDraft((prev) => ({
      ...prev,
      [role]: { ...prev[role], [moduleKey]: !prev[role]?.[moduleKey] },
    }));
  };

  const isDirty = (role) => {
    const original = roles.find((r) => r.role === role)?.permissions || {};
    const current = draft[role] || {};
    return MODULE_DEFINITIONS.some((m) => Boolean(original[m.key]) !== Boolean(current[m.key]));
  };

  const saveRole = async (role) => {
    setSavingRole(role);
    setError('');
    try {
      const res = await fetch(`/api/admin/roles/${encodeURIComponent(role)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: draft[role], updatedBy: adminIdentity() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to save permissions.');
      setRoles((prev) => prev.map((r) => (r.role === role ? data.role : r)));
      setNotice(data.message || 'Permissions updated.');
    } catch (err) {
      setError(err.message || 'Unable to save permissions.');
    } finally {
      setSavingRole('');
    }
  };

  if (loading) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className="w-10 h-10 border-2 border-[#2FA084] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 min-h-screen transition-all duration-500 ${theme.bg}`}>
      {notice ? (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#2FA084] px-5 py-3 text-white shadow-2xl shadow-[#2FA084]/20">
          <CheckCircle2 size={18} strokeWidth={3} />
          <span className="text-[11px] font-black uppercase tracking-wider">{notice}</span>
        </div>
      ) : null}

      <div className={`flex flex-col gap-2 border-b pb-5 ${theme.border}`}>
        <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
          Roles & <span className="text-[#2FA084]">Permissions</span>
        </h1>
        <p className={`text-[9px] font-bold uppercase tracking-[0.22em] ${theme.textSub}`}>
          Control which modules each staff role can access
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-500">
          <AlertTriangle size={18} />
          <span className="text-[11px] font-black uppercase tracking-wider">{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {roles.map((r) => {
          const perms = draft[r.role] || {};
          const dirty = isDirty(r.role);
          const busy = savingRole === r.role;

          return (
            <div key={r.role} className={`rounded-2xl border p-5 ${theme.card} ${theme.border} ${theme.shadow}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl border p-2.5 ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#2FA084]`}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h2 className={`text-sm font-black uppercase tracking-tight ${theme.textMain}`}>{r.role}</h2>
                    <p className={`mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                      <Users size={11} /> {r.staffCount} staff assigned
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveRole(r.role)}
                  disabled={!dirty || busy}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                    dirty
                      ? 'bg-[#2FA084] text-white hover:brightness-110'
                      : `border ${theme.border} ${theme.textSub} cursor-not-allowed opacity-60`
                  } ${busy ? 'cursor-wait opacity-70' : ''}`}
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                {MODULE_DEFINITIONS.map((mod) => (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(r.role, mod.key)}
                    className="flex items-center justify-between py-2.5 cursor-pointer group select-none"
                  >
                    <span className={`text-[11px] font-bold transition-colors ${isDarkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-black'}`}>
                      {mod.label}
                    </span>
                    <div className={`w-9 h-5 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${perms[mod.key] ? 'bg-[#2FA084]' : (isDarkMode ? 'bg-white/10' : 'bg-gray-300')}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-300 ${perms[mod.key] ? 'left-5' : 'left-1'}`} />
                    </div>
                  </div>
                ))}
              </div>

              {r.updatedAt ? (
                <p className={`mt-4 pt-3 border-t ${theme.border} text-[9px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                  Last updated: {new Date(r.updatedAt).toLocaleString()}
                  {r.updatedBy ? ` · ${r.updatedBy}` : ''}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RolesPermissions;
