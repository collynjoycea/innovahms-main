import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  contactNumber: '',
  password: '',
  hotelCode: '',
  hotelName: '',
  hotelAddress: '',
};

const INPUT_CLASS =
  'w-full rounded-2xl border border-[#eadfc8] bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-[#a6977b] focus:border-[#bf9b30] focus:ring-4 focus:ring-[#bf9b30]/12 dark:border-[#3a2e18] dark:bg-[#0f1115] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#c9a84c] dark:focus:ring-[#c9a84c]/12';

export default function OwnerSignUp() {
  const navigate = useNavigate();
  const [signupMode, setSignupMode] = useState('create');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const updateField = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleCopyCode = async () => {
    if (!successData?.hotelCode || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(successData.hotelCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessData(null);
    setCopied(false);
    navigate('/owner/login');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const payload = {
      ...formData,
      hotelCode: signupMode === 'claim' ? formData.hotelCode.trim().toUpperCase() : '',
      hotelName: signupMode === 'create' ? formData.hotelName.trim() : '',
      hotelAddress: signupMode === 'create' ? formData.hotelAddress.trim() : '',
    };

    if (signupMode === 'create' && !payload.hotelName) {
      setErrorMessage('Hotel name is required when creating a new hotel.');
      return;
    }

    if (signupMode === 'claim' && !payload.hotelCode) {
      setErrorMessage('Please enter the existing hotel code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/owner/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Registration failed.');
        return;
      }

      setSuccessData({
        ...data,
        email: payload.email,
      });
      setFormData(INITIAL_FORM);
      setSignupMode('create');
    } catch {
      setErrorMessage('Unable to reach the server right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-white px-4 py-10 text-slate-900 transition-colors duration-300 dark:bg-[#090b10] dark:text-white md:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#f3e5c2]/60 blur-3xl dark:bg-[#3a2b13]/25" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#f6edd8] blur-3xl dark:bg-[#241a0d]/40" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-[#eadfc8] bg-white shadow-[0_24px_80px_rgba(84,58,20,0.12)] dark:border-[#2d2417] dark:bg-[#111318] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)] lg:grid-cols-[0.95fr_1.25fr]"
        >
          <section className="border-b border-[#eadfc8] bg-[linear-gradient(180deg,#fffaf0_0%,#f8f1e3_100%)] p-8 dark:border-[#2d2417] dark:bg-[linear-gradient(180deg,#13100b_0%,#0d1015_100%)] lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-[#9b7a2a] dark:text-[#c9a84c]">
              Innova HMS
            </p>
            <h1 className="mt-5 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Create Owner Access
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6b5d45] dark:text-[#b7a88d]">
              New hotels get a code generated automatically. Existing hotels can still be claimed using the assigned hotel code.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[24px] border border-[#e7d5ac] bg-white/90 p-5 shadow-[0_14px_34px_rgba(191,155,48,0.08)] dark:border-[#3a2e18] dark:bg-[#12161d]">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9b7a2a] dark:text-[#c9a84c]">
                  New hotel flow
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#52452f] dark:text-slate-300">
                  Fill in the hotel name and address. The platform assigns the hotel code for you after signup.
                </p>
              </div>

              <div className="rounded-[24px] border border-[#e7d5ac] bg-white/90 p-5 shadow-[0_14px_34px_rgba(191,155,48,0.08)] dark:border-[#3a2e18] dark:bg-[#12161d]">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9b7a2a] dark:text-[#c9a84c]">
                  Map ready
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#52452f] dark:text-slate-300">
                  Hotel addresses now attempt to resolve into latitude and longitude so they can be used in map views.
                </p>
              </div>
            </div>
          </section>

          <section className="p-8 md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#9b7a2a] dark:text-[#c9a84c]">
                  Owner Sign Up
                </p>
                <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Register Your Account
                </h2>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#aa9362] dark:text-[#8f7a4f]">
                Light and dark mode supported
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setSignupMode('create');
                  setErrorMessage('');
                }}
                className={`rounded-[24px] border p-5 text-left transition-all ${
                  signupMode === 'create'
                    ? 'border-[#bf9b30] bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] text-white shadow-[0_16px_36px_rgba(191,155,48,0.22)] dark:border-[#c9a84c] dark:bg-[linear-gradient(135deg,#cda548_0%,#9a7620_100%)]'
                    : 'border-[#eadfc8] bg-white text-slate-900 hover:border-[#cfb57a] dark:border-[#2e2619] dark:bg-[#12161d] dark:text-white dark:hover:border-[#4a3b23]'
                }`}
              >
                <p className="text-sm font-black uppercase tracking-[0.18em]">Create New Hotel</p>
                <p className={`mt-2 text-xs font-semibold ${signupMode === 'create' ? 'text-white/80' : 'text-[#7f7056] dark:text-slate-400'}`}>
                  System-generated hotel code after signup.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSignupMode('claim');
                  setErrorMessage('');
                }}
                className={`rounded-[24px] border p-5 text-left transition-all ${
                  signupMode === 'claim'
                    ? 'border-[#bf9b30] bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] text-white shadow-[0_16px_36px_rgba(191,155,48,0.22)] dark:border-[#c9a84c] dark:bg-[linear-gradient(135deg,#cda548_0%,#9a7620_100%)]'
                    : 'border-[#eadfc8] bg-white text-slate-900 hover:border-[#cfb57a] dark:border-[#2e2619] dark:bg-[#12161d] dark:text-white dark:hover:border-[#4a3b23]'
                }`}
              >
                <p className="text-sm font-black uppercase tracking-[0.18em]">Claim Existing Hotel</p>
                <p className={`mt-2 text-xs font-semibold ${signupMode === 'claim' ? 'text-white/80' : 'text-[#7f7056] dark:text-slate-400'}`}>
                  Use the hotel code already assigned to your property.
                </p>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="relative block">
                  <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="First Name"
                    value={formData.firstName}
                    className={INPUT_CLASS}
                    onChange={(event) => updateField('firstName', event.target.value)}
                  />
                </label>

                <label className="relative block">
                  <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="Last Name"
                    value={formData.lastName}
                    className={INPUT_CLASS}
                    onChange={(event) => updateField('lastName', event.target.value)}
                  />
                </label>
              </div>

              <AnimatePresence mode="wait">
                {signupMode === 'create' ? (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 rounded-[28px] border border-[#eadfc8] bg-[#fffaf1] p-5 dark:border-[#2e2619] dark:bg-[#0d1015]"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="relative block">
                        <Building2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                        <input
                          type="text"
                          placeholder="Hotel Name"
                          value={formData.hotelName}
                          className={INPUT_CLASS}
                          onChange={(event) => updateField('hotelName', event.target.value)}
                        />
                      </label>

                      <label className="relative block">
                        <MapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                        <input
                          type="text"
                          placeholder="Hotel Address"
                          value={formData.hotelAddress}
                          className={INPUT_CLASS}
                          onChange={(event) => updateField('hotelAddress', event.target.value)}
                        />
                      </label>
                    </div>

                    <div className="rounded-2xl border border-[#eadfc8] bg-white px-4 py-3 dark:border-[#2e2619] dark:bg-[#12161d]">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b7a2a] dark:text-[#c9a84c]">
                        Hotel code
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#5d4e36] dark:text-slate-300">
                        You do not need to create the code manually. The server will generate it for the hotel after signup.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="claim"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-[28px] border border-[#eadfc8] bg-[#fffaf1] p-5 dark:border-[#2e2619] dark:bg-[#0d1015]"
                  >
                    <label className="relative block">
                      <Hash className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                      <input
                        type="text"
                        placeholder="Hotel Code"
                        value={formData.hotelCode}
                        className={`${INPUT_CLASS} uppercase`}
                        onChange={(event) => updateField('hotelCode', event.target.value.toUpperCase())}
                      />
                    </label>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9f8b63] dark:text-[#8c7851]">
                      Example: INNOVAHMS-12
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="relative block sm:col-span-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="Business Email"
                    value={formData.email}
                    className={INPUT_CLASS}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </label>

                <label className="relative block">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="Contact Number"
                    value={formData.contactNumber}
                    className={INPUT_CLASS}
                    onChange={(event) => updateField('contactNumber', event.target.value)}
                  />
                </label>

                <label className="relative block">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={formData.password}
                    className={INPUT_CLASS}
                    onChange={(event) => updateField('password', event.target.value)}
                  />
                </label>
              </div>

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
                {isSubmitting ? 'Creating account...' : 'Create Owner Account'}
                <ArrowRight size={18} />
              </button>

              <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#aa9362] dark:text-[#8f7a4f]">
                Already registered?{' '}
                <Link to="/owner/login" className="text-[#9b7a2a] hover:underline dark:text-[#d3af56]">
                  Go to owner login
                </Link>
              </p>
            </form>
          </section>
        </motion.div>
      </main>

      <AnimatePresence>
        {successData ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              className="w-full max-w-xl rounded-[28px] border border-[#eadfc8] bg-white p-6 text-slate-900 shadow-[0_28px_80px_rgba(84,58,20,0.22)] dark:border-[#2d2417] dark:bg-[#111318] dark:text-white"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#b88d2a] dark:bg-[#c9a84c]/12 dark:text-[#d6b65a]">
                  <CheckCircle2 size={28} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#9b7a2a] dark:text-[#c9a84c]">
                    Registration complete
                  </p>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">
                    {successData.createdHotel ? 'Hotel Code Assigned' : 'Hotel Code Linked'}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#6b5d45] dark:text-[#b7a88d]">
                    {successData.createdHotel
                      ? 'Your owner account and hotel profile are ready. Keep this hotel code for staff registration and future setup.'
                      : 'Your owner account is now linked to the existing hotel code shown below.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-[#eadfc8] bg-[#fffaf1] p-5 dark:border-[#2e2619] dark:bg-[#0d1015]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9b7a2a] dark:text-[#c9a84c]">
                  Hotel Code
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-2xl font-black tracking-[0.18em] text-slate-900 dark:text-white">
                    {successData.hotelCode}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#eadfc8] bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#8e7229] hover:bg-[#fff8ea] dark:border-[#2e2619] dark:bg-[#12161d] dark:text-[#d6b65a] dark:hover:bg-[#1a2029]"
                  >
                    <Copy size={16} />
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-[#eadfc8] bg-[#fffaf1] px-4 py-4 dark:border-[#2e2619] dark:bg-[#0d1015]">
                  <p className="text-sm font-semibold leading-relaxed text-[#5d4e36] dark:text-slate-300">
                    {successData.hotelCodeEmailSent
                      ? `A copy of the hotel code was sent to ${successData.hotelCodeSentTo || successData.email}.`
                      : `Email delivery is not configured right now, so please keep this code safely: ${successData.hotelCode}.`}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#eadfc8] bg-[#fffaf1] px-4 py-4 dark:border-[#2e2619] dark:bg-[#0d1015]">
                  <p className="text-sm font-semibold leading-relaxed text-[#5d4e36] dark:text-slate-300">
                    You can log in now, but owner tools stay locked until the subscription payment is completed.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeSuccessModal}
                  className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#cda548_0%,#b88d2a_100%)] px-5 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_34px_rgba(191,155,48,0.22)] hover:brightness-105 dark:bg-[linear-gradient(135deg,#d2ae5a_0%,#9c7822_100%)]"
                >
                  Continue To Owner Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setCopied(false);
                  }}
                  className="flex-1 rounded-2xl border border-[#eadfc8] bg-white px-5 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-[#8e7229] hover:bg-[#fff8ea] dark:border-[#2e2619] dark:bg-[#12161d] dark:text-[#d6b65a] dark:hover:bg-[#1a2029]"
                >
                  Stay Here
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
