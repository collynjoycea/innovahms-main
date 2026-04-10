import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Crown, Lock, Pencil, Save, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const parseStoredSession = () => {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('customerSession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user && typeof parsed.user === 'object' ? parsed.user : parsed;
  } catch { return null; }
};

const persistCustomerUser = (nextUser) => {
  ['user', 'customerSession'].forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.user && typeof parsed.user === 'object') {
        localStorage.setItem(key, JSON.stringify({ ...parsed, user: { ...parsed.user, ...nextUser } }));
      } else {
        localStorage.setItem(key, JSON.stringify({ ...parsed, ...nextUser }));
      }
    } catch { localStorage.setItem(key, JSON.stringify(nextUser)); }
  });
  window.dispatchEvent(new Event('userUpdated'));
};

const emptyState = {
  user: { id: '', firstName: '', lastName: '', email: '', contactNumber: '', profileImage: '' },
  points: 0, tier: 'STANDARD', pointsThisMonth: 0, privilege: {},
};

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [sessionUser, setSessionUser] = useState(parseStoredSession());
  const [profile, setProfile] = useState(emptyState);
  const [draft, setDraft] = useState(emptyState.user);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const sync = () => setSessionUser(parseStoredSession());
    window.addEventListener('userUpdated', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('userUpdated', sync); window.removeEventListener('storage', sync); };
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem('theme');
      setIsDark(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
    };
    window.addEventListener('themeChanged', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => { window.removeEventListener('themeChanged', syncTheme); window.removeEventListener('storage', syncTheme); };
  }, []);

  useEffect(() => {
    if (!sessionUser?.id) { navigate('/login', { replace: true }); return; }
    let dead = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/user/profile/${sessionUser.id}`);
        const data = await res.json().catch(() => ({}));
        if (!dead && res.ok) {
          const normalized = { ...emptyState, ...data, user: { ...emptyState.user, ...(data.user || {}) } };
          setProfile(normalized);
          setDraft(normalized.user);
          setAvatarPreview(normalized.user.profileImage || '');
          persistCustomerUser(normalized.user);
        }
      } finally { if (!dead) setLoading(false); }
    };
    load();
    return () => { dead = true; };
  }, [sessionUser?.id, navigate]);

  const initials = useMemo(() =>
    `${profile.user.firstName?.[0] || ''}${profile.user.lastName?.[0] || ''}`.trim() || 'G',
    [profile.user.firstName, profile.user.lastName]
  );

  const onFieldChange = (key, value) => setDraft((p) => ({ ...p, [key]: value }));

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAvatarPreview(dataUrl);
      setDraft((p) => ({ ...p, profileImage: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const cancelEdit = () => {
    setDraft(profile.user);
    setAvatarPreview(profile.user.profileImage || '');
    setEditing(false);
    setMessage('');
  };

  const saveChanges = async () => {
    setSaving(true); setMessage('');
    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');
      const nextUser = { ...profile.user, ...(data.user || {}) };
      setProfile((p) => ({ ...p, user: nextUser }));
      setDraft(nextUser);
      setAvatarPreview(nextUser.profileImage || '');
      setEditing(false);
      persistCustomerUser(nextUser);
      setMessage('Profile updated successfully.');
    } catch (err) { setMessage(err.message || 'Failed to update profile.'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    setPasswordError('');
    if (!passwords.newPassword || !passwords.confirmPassword) { setPasswordError('New password fields are required.'); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    if (passwords.newPassword.length < 8) { setPasswordError('Password must be at least 8 characters.'); return; }
    setPasswordBusy(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile.user.id, currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to change password.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(data.message || 'Password changed successfully.');
    } catch (err) { setPasswordError(err.message || 'Failed to change password.'); }
    finally { setPasswordBusy(false); }
  };

  // theme-aware classes
  const bg = isDark ? 'bg-[#0d0c0a] text-white' : 'bg-[#f6f7fb] text-slate-900';
  const card = isDark ? 'bg-[#14130f] border-white/5' : 'bg-white border-slate-200';
  const subtext = isDark ? 'text-white/30' : 'text-slate-400';
  const mutedText = isDark ? 'text-white/50' : 'text-slate-500';
  const inputCls = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
    !editing
      ? isDark
        ? 'cursor-default bg-[#1a1812] border-white/5 text-white/40'
        : 'cursor-default bg-slate-50 border-slate-200 text-slate-400'
      : isDark
        ? 'bg-[#1a1812] border-white/10 text-white focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/20'
        : 'bg-white border-slate-300 text-slate-900 focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/20'
  }`;
  const pwInputCls = isDark
    ? 'w-full rounded-xl border border-white/10 bg-[#1a1812] px-4 py-3 text-sm text-white outline-none focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/20 transition-all'
    : 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#bf9b30] focus:ring-2 focus:ring-[#bf9b30]/20 transition-all';
  const cancelBtnCls = isDark
    ? 'inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white/70 hover:bg-white/10 transition-all'
    : 'inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all';
  const lockBadgeCls = isDark
    ? 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/50'
    : 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0d0c0a]' : 'bg-[#f6f7fb]'}`}>
        <div className="w-10 h-10 border-2 border-[#bf9b30] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 py-8 font-sans transition-colors duration-300 ${bg}`}>
      <div className="mx-auto max-w-4xl space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#bf9b30]">Customer Profile</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">My Account</h1>
          </div>
          <div className="flex gap-3">
            {editing ? (
              <>
                <button onClick={cancelEdit} className={cancelBtnCls}>
                  <X size={13} /> Cancel
                </button>
                <button onClick={saveChanges} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#bf9b30] px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-[#0d0c0a] hover:bg-[#d4ac37] transition-all disabled:opacity-60">
                  <Save size={13} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#bf9b30] px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-[#0d0c0a] hover:bg-[#d4ac37] transition-all">
                <Pencil size={13} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* FEEDBACK */}
        {message && (
          <div className={`rounded-xl border px-5 py-3 text-sm font-semibold ${message.toLowerCase().includes('fail') ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
            {message}
          </div>
        )}

        {/* HERO CARD */}
        <div className={`relative overflow-hidden rounded-3xl border ${card}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,155,48,0.12),transparent_55%)]" />
          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className={`h-24 w-24 overflow-hidden rounded-2xl border-2 border-[#bf9b30]/40 flex items-center justify-center ${isDark ? 'bg-[#1a1812]' : 'bg-slate-100'}`}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                    : <span className="text-3xl font-black text-[#bf9b30]">{initials}</span>
                  }
                </div>
                {editing && (
                  <>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#bf9b30] text-[#0d0c0a] flex items-center justify-center shadow-lg hover:bg-[#d4ac37] transition-colors">
                      <Camera size={14} />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                  </>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black">{profile.user.firstName} {profile.user.lastName}</h2>
                <p className={`text-sm mt-0.5 ${mutedText}`}>{profile.user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bf9b30]/30 bg-[#bf9b30]/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#bf9b30]">
                    <Crown size={10} /> {profile.tier || 'STANDARD'}
                  </span>
                  <span className={lockBadgeCls}>
                    <Lock size={10} /> {editing ? 'Edit mode' : 'Locked'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Points', value: Number(profile.points || 0).toLocaleString() },
                { label: 'This Month', value: Number(profile.pointsThisMonth || 0).toLocaleString() },
                { label: 'Plan', value: profile.privilege?.packageName || 'No plan' },
              ].map(({ label, value }) => (
                <div key={label} className={`rounded-2xl border px-5 py-3 text-center min-w-[90px] ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${subtext}`}>{label}</p>
                  <p className="mt-1 text-lg font-black text-[#bf9b30]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PERSONAL INFO */}
        <div className={`rounded-3xl border p-6 ${card}`}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#bf9b30]/10 text-[#bf9b30]">
              <ShieldCheck size={17} />
            </span>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${subtext}`}>Account</p>
              <h3 className="text-lg font-black">Personal Information</h3>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" isDark={isDark}><input value={draft.firstName} onChange={(e) => onFieldChange('firstName', e.target.value)} readOnly={!editing} className={inputCls} /></Field>
            <Field label="Last Name" isDark={isDark}><input value={draft.lastName} onChange={(e) => onFieldChange('lastName', e.target.value)} readOnly={!editing} className={inputCls} /></Field>
            <Field label="Email" isDark={isDark}><input value={draft.email} onChange={(e) => onFieldChange('email', e.target.value)} readOnly={!editing} className={inputCls} /></Field>
            <Field label="Contact Number" isDark={isDark}><input value={draft.contactNumber} onChange={(e) => onFieldChange('contactNumber', e.target.value)} readOnly={!editing} className={inputCls} /></Field>
          </div>
        </div>

        {/* CHANGE PASSWORD */}
        <div className={`rounded-3xl border p-6 ${card}`}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#bf9b30]/10 text-[#bf9b30]">
              <Lock size={17} />
            </span>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${subtext}`}>Security</p>
              <h3 className="text-lg font-black">Change Password</h3>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Current Password', key: 'currentPassword' },
              { label: 'New Password', key: 'newPassword' },
              { label: 'Confirm Password', key: 'confirmPassword' },
            ].map(({ label, key }) => (
              <Field key={key} label={label} isDark={isDark}>
                <input type="password" value={passwords[key]}
                  onChange={(e) => { setPasswords((p) => ({ ...p, [key]: e.target.value })); setPasswordError(''); }}
                  className={pwInputCls} />
              </Field>
            ))}
          </div>
          {passwordError && <p className="mt-3 text-sm font-semibold text-red-400">{passwordError}</p>}
          <button type="button" onClick={changePassword} disabled={passwordBusy}
            className="mt-5 rounded-xl border border-[#bf9b30]/50 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[#bf9b30] hover:bg-[#bf9b30]/10 transition-all disabled:opacity-50">
            {passwordBusy ? 'Updating...' : 'Update Password'}
          </button>
        </div>

      </div>
    </div>
  );
}

function Field({ label, children, isDark }) {
  return (
    <div>
      <label className={`mb-1.5 block text-[10px] font-black uppercase tracking-[0.22em] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{label}</label>
      {children}
    </div>
  );
}
