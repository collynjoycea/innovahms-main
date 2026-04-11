import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import OwnerSidebar from '../components/OwnerSidebar'; 
import OwnerHeader from '../components/OwnerHeader'; 

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const daysUntilDate = (value) => {
  const target = parseDateOnly(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const formatDateLabel = (value) => {
  const date = parseDateOnly(value);
  if (!date) return '';
  try {
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return String(value);
  }
};

const OWNER_ROUTE_FEATURES = [
  { path: '/owner/subscription', feature: 'subscription', label: 'Subscription', requiredPlan: null },
  { path: '/owner/rooms', feature: 'rooms', label: 'Room Management', requiredPlan: 'Starter' },
  { path: '/owner/reservations', feature: 'reservations', label: 'Reservations', requiredPlan: 'Starter' },
  { path: '/owner/customers', feature: 'customers', label: 'Customers', requiredPlan: 'Starter' },
  { path: '/owner/housekeeping', feature: 'housekeeping', label: 'Housekeeping', requiredPlan: 'Pro' },
  { path: '/owner/inventory', feature: 'inventory', label: 'Inventory', requiredPlan: 'Pro' },
  { path: '/owner/staff', feature: 'staff', label: 'Staff Management', requiredPlan: 'Pro' },
  { path: '/owner/reports', feature: 'reports', label: 'Reports', requiredPlan: 'Enterprise' },
  { path: '/owner/reviews', feature: 'reviews', label: 'Reviews', requiredPlan: 'Starter' },
  { path: '/owner', feature: 'dashboard', label: 'Dashboard', requiredPlan: 'Starter' },
];

const PLAN_FEATURES = {
  starter: ['dashboard', 'rooms', 'reservations', 'customers', 'reviews'],
  pro: ['dashboard', 'rooms', 'reservations', 'customers', 'reviews', 'housekeeping', 'inventory', 'staff'],
  enterprise: ['dashboard', 'rooms', 'reservations', 'customers', 'reviews', 'housekeeping', 'inventory', 'staff', 'reports', 'promotions'],
};

const OwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ownerDarkMode') || 'false');
    } catch {
      return false;
    }
  });
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ownerSession') || '{}');
    } catch {
      return {};
    }
  });

  const persistSession = (nextSession) => {
    if (!nextSession) return;
    try {
      const stored = JSON.parse(localStorage.getItem('ownerSession') || '{}');
      const merged = {
        ...stored,
        ...nextSession,
        loginTime: stored?.loginTime || session?.loginTime,
      };
      localStorage.setItem('ownerSession', JSON.stringify(merged));
      setSession(merged);
      window.dispatchEvent(new Event('ownerSessionUpdated'));
    } catch {
      setSession(nextSession);
    }
  };

  useEffect(() => {
    localStorage.setItem('ownerDarkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const session = localStorage.getItem('ownerSession'); 
    
    if (!session) {
      navigate('/owner/login', { replace: true });
      return;
    }
    
    try {
      const parsed = JSON.parse(session);
      if (!parsed?.email) {
        localStorage.removeItem('ownerSession');
        navigate('/owner/login', { replace: true });
        return;
      }
    } catch {
      localStorage.removeItem('ownerSession');
      navigate('/owner/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const sync = () => {
      try {
        setSession(JSON.parse(localStorage.getItem('ownerSession') || '{}'));
      } catch {
        setSession({});
      }
    };
    window.addEventListener('ownerSessionUpdated', sync);
    return () => window.removeEventListener('ownerSessionUpdated', sync);
  }, []);

  useEffect(() => {
    if (!session?.id) return undefined;

    let cancelled = false;
    const syncFromBackend = async () => {
      try {
        const response = await fetch(`/api/owner/subscription/${session.id}`);
        const data = await response.json();
        if (!response.ok || !data.session || cancelled) return;
        persistSession(data.session);
      } catch {
        // Keep the existing local session when background refresh fails.
      }
    };

    syncFromBackend();
    const handleFocus = () => {
      syncFromBackend();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromBackend();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.id]);

  const subscriptionLocked = !session?.subscriptionActive && location.pathname !== '/owner/subscription';
  const allowedFeatures = new Set(
    Array.isArray(session?.allowedOwnerFeatures) && session.allowedOwnerFeatures.length > 0
      ? session.allowedOwnerFeatures
      : (PLAN_FEATURES[session?.subscriptionPlanSlug] || [])
  );
  const subscriptionDaysRemaining = Number.isFinite(Number(session?.subscriptionDaysRemaining))
    ? Number(session.subscriptionDaysRemaining)
    : daysUntilDate(session?.subscriptionRenewalDate);
  const subscriptionRenewalLabel = formatDateLabel(session?.subscriptionRenewalDate);
  const showExpiryReminder = Boolean(
    session?.subscriptionActive &&
    subscriptionDaysRemaining !== null &&
    subscriptionDaysRemaining >= 1 &&
    subscriptionDaysRemaining <= 7
  );
  const currentRouteFeature = OWNER_ROUTE_FEATURES.find(({ path }) => location.pathname === path) || OWNER_ROUTE_FEATURES.find(({ path }) => path === '/owner');
  const planLocked = Boolean(
    session?.subscriptionActive &&
    currentRouteFeature &&
    currentRouteFeature.feature !== 'subscription' &&
    !allowedFeatures.has(currentRouteFeature.feature)
  );
  const toggleTheme = () => setIsDarkMode((current) => !current);

  return (
    <div className={`flex h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#090b10] text-white' : 'bg-gray-50 text-slate-900'}`}>
      <OwnerSidebar isDarkMode={isDarkMode} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <OwnerHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

        <main className={`flex-1 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#0f1117]' : 'bg-slate-50'}`}>
          {showExpiryReminder && (
            <div className={`sticky top-0 z-30 border-b px-8 py-4 shadow-sm ${subscriptionDaysRemaining <= 2 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${subscriptionDaysRemaining <= 2 ? 'text-red-700' : 'text-amber-700'}`}>
                    Renewal Reminder
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${subscriptionDaysRemaining <= 2 ? 'text-red-900' : 'text-amber-900'}`}>
                    {subscriptionDaysRemaining === 1
                      ? `Your ${session?.subscriptionPlan || 'current'} subscription expires tomorrow${subscriptionRenewalLabel ? `, ${subscriptionRenewalLabel}` : ''}. Renew now to keep owner tools unlocked.`
                      : `Your ${session?.subscriptionPlan || 'current'} subscription expires in ${subscriptionDaysRemaining} days${subscriptionRenewalLabel ? `, on ${subscriptionRenewalLabel}` : ''}. Renew now to avoid your owner tools becoming read-only.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/owner/subscription')}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white"
                >
                  Renew Subscription
                </button>
              </div>
            </div>
          )}

          {subscriptionLocked && (
            <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50 px-8 py-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Read-Only Portal</p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">
                    Your hotel is registered, but owner actions stay locked until you pay a subscription.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/owner/subscription')}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white"
                >
                  Pay Subscription
                </button>
              </div>
            </div>
          )}

          {subscriptionLocked && (
            <style>{`
              [data-owner-locked="true"] button,
              [data-owner-locked="true"] input,
              [data-owner-locked="true"] select,
              [data-owner-locked="true"] textarea,
              [data-owner-locked="true"] form,
              [data-owner-locked="true"] .cursor-pointer,
              [data-owner-locked="true"] [role="button"] {
                pointer-events: none !important;
              }
              [data-owner-locked="true"] button,
              [data-owner-locked="true"] input,
              [data-owner-locked="true"] select,
              [data-owner-locked="true"] textarea,
              [data-owner-locked="true"] .cursor-pointer,
              [data-owner-locked="true"] [role="button"] {
                opacity: 0.55 !important;
                cursor: not-allowed !important;
              }
            `}</style>
          )}

          <div className="p-8" data-owner-locked={subscriptionLocked ? 'true' : 'false'}>
            {planLocked ? (
              <div className={`mx-auto max-w-3xl rounded-[32px] border p-10 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.35)] ${isDarkMode ? 'border-amber-500/20 bg-[#11151d]' : 'border-amber-200 bg-white'}`}>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-700">Plan Upgrade Required</p>
                <h2 className={`mt-4 text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentRouteFeature?.label} is not included in your current plan
                </h2>
                <p className={`mt-4 text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Your active plan is <span className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{session?.subscriptionPlan || 'Unassigned'}</span>.
                  {' '}
                  Upgrade to <span className="font-black text-amber-700">{currentRouteFeature?.requiredPlan}</span> or higher to unlock this module.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/owner/subscription')}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white"
                  >
                    Upgrade Plan
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/owner')}
                    className={`rounded-2xl border px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] ${isDarkMode ? 'border-white/10 text-slate-200' : 'border-slate-200 text-slate-700'}`}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <Outlet context={{ isDarkMode, toggleTheme }} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default OwnerLayout;
