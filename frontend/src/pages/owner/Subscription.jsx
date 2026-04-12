import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Crown, Loader2, Lock, ShieldCheck, Sparkles, Zap } from 'lucide-react';

const OWNER_SESSION_KEY = 'ownerSession';

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const planAccent = (slug) => {
  if (slug === 'enterprise') return 'from-slate-900 to-slate-700';
  if (slug === 'pro') return 'from-[#bf9b30] to-[#e2c35f]';
  return 'from-emerald-700 to-emerald-500';
};

const parseSession = () => {
  try {
    return JSON.parse(localStorage.getItem(OWNER_SESSION_KEY) || '{}');
  } catch {
    return {};
  }
};

export default function OwnerSubscription() {
  const navigate = useNavigate();
  const [session, setSession] = useState(parseSession());
  const [packages, setPackages] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState('');
  const [hotelSaving, setHotelSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hotelForm, setHotelForm] = useState({ hotelCode: '', hotelName: '', hotelAddress: '' });

  const ownerId = session?.id;
  const accessUnlocked = Boolean(session?.subscriptionActive && session?.hasHotel);

  const persistSession = (nextSession) => {
    localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify({
      ...session,
      ...nextSession,
      loginTime: session?.loginTime || new Date().toISOString(),
    }));
    setSession(parseSession());
    window.dispatchEvent(new Event('ownerSessionUpdated'));
  };

  const load = async () => {
    if (!ownerId) {
      navigate('/owner/login', { replace: true });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/owner/subscription/${ownerId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load subscription data.');
      setPackages(data.packages || []);
      setSubscription(data.subscription || null);
      if (data.session) persistSession(data.session);
    } catch (err) {
      setError(err.message || 'Failed to load subscription data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ownerId]);

  const currentPlanId = useMemo(() => subscription?.packageId, [subscription]);

  const activatePlan = async (pkg, billingCycle) => {
    if (!ownerId) return;
    setError('');
    setMessage('');
    setPaymentLoading(`${pkg.id}-${billingCycle}`);
    try {
      const response = await fetch('/api/owner/subscription/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, packageId: pkg.id, billingCycle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to activate subscription.');
      if (data.session) persistSession(data.session);
      setSubscription(data.subscription || null);
      setMessage(data.message || `${pkg.name} ${billingCycle.toLowerCase()} subscription activated successfully.`);
      await load();
    } catch (err) {
      setError(err.message || 'Unable to activate subscription.');
    } finally {
      setPaymentLoading('');
    }
  };

  const submitHotelSetup = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setHotelSaving(true);
    try {
      const response = await fetch('/api/owner/hotel/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, ...hotelForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save hotel setup.');
      if (data.session) persistSession(data.session);
      setMessage(data.message || 'Hotel setup completed successfully.');
      await load();
    } catch (err) {
      setError(err.message || 'Unable to save hotel setup.');
    } finally {
      setHotelSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f5ed_0%,#f4f6fb_100%)] p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-[#bf9b30]/15 bg-[#111111] text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.85)]">
          <div className="grid gap-8 px-8 py-10 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#d2b04e]">Owner Subscription</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                {accessUnlocked ? 'Subscription Active' : 'Portal Locked Until Activation'}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
                Choose a plan and it activates immediately. Owner access is now controlled by your active subscription,
                plan limits, and linked hotel setup.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
                  {session?.subscriptionPlan || 'No active plan'}
                </div>
                <div className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${session?.approvalStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/65'}`}>
                  {session?.approvalStatus === 'APPROVED' ? 'Profile Approved' : `Profile ${session?.approvalStatus || 'Pending'}`}
                </div>
                <div className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${accessUnlocked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {accessUnlocked ? 'Features Unlocked' : !session?.subscriptionActive ? 'Activation Required' : 'Hotel Setup Required'}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#bf9b30]/15 p-3 text-[#e8c868]"><ShieldCheck size={22} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Current Status</p>
                  <h2 className="mt-1 text-2xl font-black">{subscription?.packageName || 'Subscription Needed'}</h2>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-white/75">
                <div className="flex items-center justify-between"><span>Billing cycle</span><span className="font-black">{subscription?.billingCycle || '--'}</span></div>
                <div className="flex items-center justify-between"><span>Renewal date</span><span className="font-black">{subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : '--'}</span></div>
                <div className="flex items-center justify-between"><span>Registered hotel</span><span className="font-black">{session?.hotelName || 'Pending'}</span></div>
              </div>
              {accessUnlocked && (
                <button onClick={() => navigate('/owner')} className="mt-6 w-full rounded-2xl bg-[#bf9b30] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-[#0d0c0a]">
                  Open Owner Dashboard
                </button>
              )}
            </div>
          </div>
        </section>

        {(error || message) && (
          <div className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {error || message}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#bf9b30]" /></div>
          ) : (
            packages.map((pkg) => {
              const isCurrent = Number(currentPlanId) === Number(pkg.id);
              return (
                <article key={pkg.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]">
                  <div className={`bg-gradient-to-r ${planAccent(pkg.slug)} p-6 text-white`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">{pkg.isPopular ? 'Most Selected' : 'Owner Plan'}</p>
                        <h3 className="mt-2 text-3xl font-black">{pkg.name}</h3>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-3">{pkg.slug === 'enterprise' ? <Crown size={22} /> : <Sparkles size={22} />}</div>
                    </div>
                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-3xl font-black">{formatPhp(pkg.monthlyPrice)}</span>
                      <span className="pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Monthly</span>
                    </div>
                  </div>

                  <div className="space-y-5 p-6">
                    <p className="min-h-[48px] text-sm leading-relaxed text-slate-600">{pkg.description || 'Subscription package for hotel owner operations.'}</p>
                    <div className="space-y-2">
                      {(pkg.features || []).map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 size={16} className="mt-0.5 text-[#bf9b30]" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => activatePlan(pkg, 'MONTHLY')}
                        disabled={Boolean(paymentLoading)}
                        className="rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-60"
                      >
                        {paymentLoading === `${pkg.id}-MONTHLY` ? 'Activating...' : isCurrent ? 'Renew Monthly' : 'Activate Monthly'}
                      </button>
                      <button
                        type="button"
                        onClick={() => activatePlan(pkg, 'ANNUAL')}
                        disabled={Boolean(paymentLoading)}
                        className="rounded-2xl border border-[#bf9b30]/30 bg-[#bf9b30]/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#8f7423] disabled:opacity-60"
                      >
                        {paymentLoading === `${pkg.id}-ANNUAL` ? 'Activating...' : isCurrent ? 'Renew Annual' : 'Activate Annual'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.28)]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-900 p-3 text-white"><Zap size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Portal Access Rules</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Subscription controls owner access</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {[
                'Activating a subscription immediately unlocks the owner tools included in that package.',
                'Starter owners can manage rooms, reservations, customers, reviews, and dashboard access.',
                'Higher plans unlock extra modules like staff, inventory, reports, and promotions based on the selected tier.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <Lock size={16} className="mt-0.5 text-[#bf9b30]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.28)]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Registered Property</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {session?.hasHotel ? 'Hotel Already Registered' : 'Property Details Needed'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {session?.hasHotel
                ? 'Your hotel was created during owner signup. Subscription activation is the last step before the allowed owner tools unlock.'
                : 'If this owner account has no linked hotel yet, you can still attach one here after activating a subscription.'}
            </p>

            {session?.hasHotel ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Hotel Name</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{session?.hotelName || subscription?.hotelName || 'Registered Hotel'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Hotel Code</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{session?.hotelCode || subscription?.hotelCode || '--'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Portal Status</p>
                    <p className={`mt-2 text-sm font-black ${accessUnlocked ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {accessUnlocked ? 'Unlocked after subscription activation' : !session?.subscriptionActive ? 'Waiting for activation' : 'Hotel setup required'}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-[#bf9b30]/35 bg-[#bf9b30]/[0.06] px-4 py-4 text-sm font-medium leading-relaxed text-slate-700">
                  The modules visible to this owner depend on the active plan, including room limits and higher-tier feature access.
                </div>
              </div>
            ) : (
              <form onSubmit={submitHotelSetup} className="mt-6 space-y-4">
                <input
                  type="text"
                  placeholder="Existing Hotel Code (optional)"
                  value={hotelForm.hotelCode}
                  disabled={!session?.subscriptionActive}
                  onChange={(event) => setHotelForm((current) => ({ ...current, hotelCode: event.target.value.toUpperCase() }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <input
                  type="text"
                  placeholder="Hotel Name"
                  value={hotelForm.hotelName}
                  disabled={!session?.subscriptionActive}
                  onChange={(event) => setHotelForm((current) => ({ ...current, hotelName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <input
                  type="text"
                  placeholder="Hotel Address"
                  value={hotelForm.hotelAddress}
                  disabled={!session?.subscriptionActive}
                  onChange={(event) => setHotelForm((current) => ({ ...current, hotelAddress: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!session?.subscriptionActive || hotelSaving}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {hotelSaving ? 'Saving...' : 'Save Hotel Setup'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
