import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  Key,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';

const STAFF_ROLES = [
  'Hotel Manager',
  'Front Desk Operations',
  'Housekeeping & Maintenance',
  'Inventory & Supplies',
  'HR/Payroll Staff Management',
];

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  contactNumber: '',
  password: '',
  role: '',
  hotelCode: '',
};

const INPUT_CLASS =
  'w-full rounded-2xl border border-[#eadfc8] bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-[#a6977b] focus:border-[#bf9b30] focus:ring-4 focus:ring-[#bf9b30]/12 dark:border-[#3a2e18] dark:bg-[#0f1115] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#c9a84c] dark:focus:ring-[#c9a84c]/12';

export default function StaffSignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/staff/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          hotelCode: formData.hotelCode.trim().toUpperCase(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setErrorMessage(result.error || 'Failed to register.');
        return;
      }

      navigate('/staff/login');
    } catch {
      setErrorMessage('Unable to reach the server right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white px-4 py-10 text-slate-900 transition-colors duration-300 dark:bg-[#090b10] dark:text-white md:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#f3e5c2]/60 blur-3xl dark:bg-[#3a2b13]/25" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#f6edd8] blur-3xl dark:bg-[#241a0d]/40" />
      </div>
      <div className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#eadfc8] bg-white shadow-[0_24px_80px_rgba(84,58,20,0.12)] dark:border-[#2d2417] dark:bg-[#111318] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border-b border-[#eadfc8] bg-[linear-gradient(180deg,#fffaf0_0%,#f8f1e3_100%)] p-8 dark:border-[#2d2417] dark:bg-[linear-gradient(180deg,#13100b_0%,#0d1015_100%)] lg:border-b-0 lg:border-r">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-[#9b7a2a] dark:text-[#c9a84c]">
            Team Access
          </p>
          <h1 className="mt-5 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Staff Registration
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6b5d45] dark:text-[#b7a88d]">
            Register your staff account using the hotel verification code assigned to your hotel. This page follows the active light or dark theme.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-[24px] border border-[#e7d5ac] bg-white/90 p-5 shadow-[0_14px_34px_rgba(191,155,48,0.08)] dark:border-[#3a2e18] dark:bg-[#12161d]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9b7a2a] dark:text-[#c9a84c]">
                Verification
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#52452f] dark:text-slate-300">
                Staff registration only works with a valid hotel code already issued by the owner or hotel setup flow.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#e7d5ac] bg-white/90 p-5 shadow-[0_14px_34px_rgba(191,155,48,0.08)] dark:border-[#3a2e18] dark:bg-[#12161d]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9b7a2a] dark:text-[#c9a84c]">
                Roles
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#52452f] dark:text-slate-300">
                Choose the exact hotel role so the account matches the backend staff module permissions and records.
              </p>
            </div>
          </div>
        </section>

          <section className="p-8 md:p-10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9b7a2a] dark:text-[#c9a84c]">
              Staff Sign Up
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Join Your Hotel Team
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#6b5d45] dark:text-[#b7a88d]">
              Enter your staff details and the hotel verification code provided by your hotel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="relative block">
                <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input
                  required
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  className={INPUT_CLASS}
                  onChange={(event) => updateField('firstName', event.target.value)}
                />
              </label>

              <label className="relative block">
                <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input
                  required
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  className={INPUT_CLASS}
                  onChange={(event) => updateField('lastName', event.target.value)}
                />
              </label>
            </div>

            <label className="relative block">
              <Briefcase className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <select
                required
                value={formData.role}
                onChange={(event) => updateField('role', event.target.value)}
                className={`${INPUT_CLASS} appearance-none`}
              >
                <option value="" disabled>
                  Select your role
                </option>
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="relative block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input
                  required
                  type="email"
                  placeholder="staff@hotel.com"
                  value={formData.email}
                  className={INPUT_CLASS}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </label>

              <label className="relative block">
                <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input
                  required
                  type="text"
                  placeholder="09XXXXXXXXX"
                  value={formData.contactNumber}
                  className={INPUT_CLASS}
                  onChange={(event) => updateField('contactNumber', event.target.value)}
                />
              </label>
            </div>

            <label className="relative block">
              <Key className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                required
                type="text"
                placeholder="Hotel Verification Code"
                value={formData.hotelCode}
                className={`${INPUT_CLASS} uppercase`}
                onChange={(event) => updateField('hotelCode', event.target.value.toUpperCase())}
              />
            </label>

            <label className="relative block">
              <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                required
                type="password"
                placeholder="Password"
                value={formData.password}
                className={INPUT_CLASS}
                onChange={(event) => updateField('password', event.target.value)}
              />
            </label>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] px-5 py-4 text-xs font-black uppercase tracking-[0.26em] text-white shadow-[0_16px_34px_rgba(191,155,48,0.22)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[linear-gradient(135deg,#d2ae5a_0%,#9c7822_100%)]"
            >
              {isSubmitting ? 'Registering...' : 'Register Staff Account'}
              <ArrowRight size={18} />
            </button>

            <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#aa9362] dark:text-[#8f7a4f]">
              Already part of the team?{' '}
              <Link to="/staff/login" className="text-[#9b7a2a] hover:underline dark:text-[#d3af56]">
                Sign in here
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
