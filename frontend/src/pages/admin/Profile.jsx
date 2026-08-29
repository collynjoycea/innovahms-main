import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, CalendarClock, LogOut, User, Pencil, Check, X, Loader2, Camera } from 'lucide-react';

const parseStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('adminData') || '{}');
  } catch {
    return {};
  }
};

export default function Profile() {
  const { isDarkMode } = useOutletContext();
  const navigate = useNavigate();
  const stored = parseStoredAdmin();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({ firstName: '', lastName: '', email: '' });
  const [pendingImage, setPendingImage] = useState(null); // base64 preview while editing
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const theme = {
    bg: isDarkMode ? 'bg-[#0F2B25]' : 'bg-[#EEEEEE]',
    card: isDarkMode ? 'bg-[#163C34]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    inputBg: isDarkMode ? 'bg-black/30' : 'bg-gray-50',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  const loadProfile = async () => {
    try {
      if (!stored?.id) throw new Error('No admin id in session.');
      const res = await fetch(`/api/admin/profile/${stored.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to load profile.');
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  const startEdit = () => {
    setDraft({
      firstName: profile?.firstName || stored?.firstName || (profile?.name || stored?.name || '').split(' ')[0] || '',
      lastName: profile?.lastName || stored?.lastName || (profile?.name || stored?.name || '').split(' ').slice(1).join(' ') || '',
      email: profile?.email || stored?.email || '',
    });
    setPendingImage(null);
    setError('');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setPendingImage(null);
    setError('');
  };

  const handlePhotoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be under 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    const email = draft.email.trim();

    if (!firstName) {
      setError('First name cannot be empty.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/profile/${stored.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          ...(pendingImage ? { profileImage: pendingImage } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to update profile.');

      setProfile(data);
      const updatedStored = {
        ...stored,
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        profileImage: data.profileImage,
      };
      localStorage.setItem('adminData', JSON.stringify(updatedStored));
      window.dispatchEvent(new Event('userUpdated'));

      setIsEditing(false);
      setPendingImage(null);
      setNotice('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const name = profile?.name || stored?.name || 'Admin';
  const email = profile?.email || stored?.email || '—';
  const photo = pendingImage || profile?.profileImage || stored?.profileImage || '';
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : null;
  const sessionStarted = stored?.loginTime ? new Date(stored.loginTime).toLocaleString() : null;
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

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
          <Check size={18} strokeWidth={3} />
          <span className="text-[11px] font-black uppercase tracking-wider">{notice}</span>
        </div>
      ) : null}

      <div className={`flex flex-col gap-2 border-b pb-5 ${theme.border}`}>
        <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
          My <span className="text-[#2FA084]">Profile</span>
        </h1>
        <p className={`text-[9px] font-bold uppercase tracking-[0.22em] ${theme.textSub}`}>
          Your administrator account details
        </p>
      </div>

      <div className={`max-w-2xl rounded-2xl border p-8 ${theme.card} ${theme.border} ${theme.shadow}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b ${theme.border}`}>
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6FCF97] to-[#2FA084] flex items-center justify-center text-[#173F35] text-2xl font-black shadow-lg overflow-hidden">
              {photo ? (
                <img src={photo} alt={name} className="w-full h-full object-cover" />
              ) : (
                initials || <User size={28} />
              )}
            </div>
            {isEditing && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Change photo"
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#2FA084] text-white flex items-center justify-center border-2 border-white shadow-md hover:brightness-110 transition-all"
                >
                  <Camera size={13} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoPick}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[8px] font-black uppercase tracking-widest mb-1 ${theme.textSub}`}>First Name</label>
                    <input
                      type="text"
                      value={draft.firstName}
                      onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                      autoFocus
                      maxLength={50}
                      className={`w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.textMain} text-sm font-bold outline-none focus:border-[#2FA084]`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[8px] font-black uppercase tracking-widest mb-1 ${theme.textSub}`}>Last Name</label>
                    <input
                      type="text"
                      value={draft.lastName}
                      onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                      maxLength={50}
                      className={`w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.textMain} text-sm font-bold outline-none focus:border-[#2FA084]`}
                    />
                  </div>
                </div>
                {error && <p className="text-[10px] font-bold text-red-500 uppercase">{error}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className={`text-xl font-black uppercase tracking-tight ${theme.textMain}`}>{name}</h2>
                <button
                  onClick={startEdit}
                  title="Edit profile"
                  className={`p-1.5 rounded-lg border ${theme.border} ${theme.textSub} hover:text-[#2FA084] hover:border-[#2FA084]/40 transition-all`}
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#2FA084]/10 border border-[#2FA084]/30 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#2FA084]">
              <ShieldCheck size={11} /> Administrator
            </span>
          </div>
        </div>

        <div className="py-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className={`rounded-xl border p-3 ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#2FA084] shrink-0`}>
              <Mail size={16} />
            </div>
            <div className="text-left flex-1">
              <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Email Address</p>
              {isEditing ? (
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className={`mt-1 w-full max-w-xs px-3 py-2 rounded-lg border ${theme.border} ${theme.inputBg} ${theme.textMain} text-sm font-bold outline-none focus:border-[#2FA084]`}
                />
              ) : (
                <p className={`text-sm font-bold ${theme.textMain}`}>{email}</p>
              )}
            </div>
          </div>

          {memberSince && (
            <div className="flex items-center gap-4">
              <div className={`rounded-xl border p-3 ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#2FA084]`}>
                <CalendarClock size={16} />
              </div>
              <div className="text-left">
                <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Admin Since</p>
                <p className={`text-sm font-bold ${theme.textMain}`}>{memberSince}</p>
              </div>
            </div>
          )}

          {sessionStarted && (
            <div className="flex items-center gap-4">
              <div className={`rounded-xl border p-3 ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#2FA084]`}>
                <CalendarClock size={16} />
              </div>
              <div className="text-left">
                <p className={`text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>Current Session Started</p>
                <p className={`text-sm font-bold ${theme.textMain}`}>{sessionStarted}</p>
              </div>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className={`pt-6 border-t ${theme.border} flex items-center gap-2`}>
            <button
              onClick={saveProfile}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.1em] bg-[#2FA084] text-white hover:brightness-110 ${saving ? 'opacity-70 cursor-wait' : ''}`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Changes
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.1em] border ${theme.border} ${theme.textSub} hover:text-red-500`}
            >
              <X size={14} /> Cancel
            </button>
          </div>
        ) : (
          <div className={`pt-6 border-t ${theme.border}`}>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.1em] border border-red-500/20 text-red-500 hover:bg-red-500/10"
            >
              <LogOut size={14} /> Logout System
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
