import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CreditCard,
  Loader2,
  Mail,
  Map,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

const integrationIcons = {
  paymongo: CreditCard,
  sendgrid: Mail,
  twilio: MessageSquare,
  rasa: Bot,
  openstreetmap: Map,
};

const statusStyles = {
  LIVE: 'border-green-500/30 bg-green-500/10 text-green-500',
  DISABLED: 'border-red-500/30 bg-red-500/10 text-red-500',
  FALLBACK: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  'NOT CONFIGURED': 'border-gray-500/30 bg-gray-500/10 text-gray-500',
};

const parseStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('adminData') || '{}');
  } catch {
    return {};
  }
};

const AiConfig = () => {
  const { isDarkMode } = useOutletContext();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSlug, setSavingSlug] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f0f0f3]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    inputBg: isDarkMode ? 'bg-black/40' : 'bg-gray-50',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  const adminIdentity = useMemo(() => {
    const admin = parseStoredAdmin();
    return admin?.name || admin?.email || 'Admin';
  }, []);

  const loadIntegrations = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError('');
    try {
      const response = await fetch('/api/admin/integrations');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load integration controls.');
      setIntegrations(data.integrations || []);
    } catch (err) {
      setError(err.message || 'Unable to load integration controls.');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const summary = useMemo(() => {
    const active = integrations.filter((item) => item.isEnabled).length;
    const disabled = integrations.filter((item) => !item.isEnabled).length;
    const needsSetup = integrations.filter((item) => item.isEnabled && !item.isConfigured).length;
    return { active, disabled, needsSetup };
  }, [integrations]);

  const handleToggle = async (integration) => {
    if (savingSlug) return;

    setSavingSlug(integration.slug);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/integrations/${integration.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: !integration.isEnabled,
          updatedBy: adminIdentity,
          reason: integration.isEnabled ? `Temporarily disabled by ${adminIdentity}.` : '',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to update integration.');

      setIntegrations((prev) =>
        prev.map((item) => (item.slug === integration.slug ? data.integration : item))
      );
      setNotice(data.message || 'Integration updated.');
    } catch (err) {
      setError(err.message || 'Unable to update integration.');
    } finally {
      setSavingSlug('');
    }
  };

  const statCards = [
    {
      label: 'Active',
      value: summary.active,
      accent: 'text-green-500',
      helper: 'Available to users',
    },
    {
      label: 'Disabled',
      value: summary.disabled,
      accent: 'text-red-500',
      helper: 'Blocked by admin',
    },
    {
      label: 'Needs Setup',
      value: summary.needsSetup,
      accent: 'text-[#c9a84c]',
      helper: 'Enabled but not configured',
    },
  ];

  if (loading) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${theme.bg}`}>
        <div className="w-10 h-10 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 min-h-screen transition-all duration-500 ${theme.bg}`}>
      {notice ? (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#c9a84c] px-5 py-3 text-black shadow-2xl shadow-[#c9a84c]/20">
          <CheckCircle2 size={18} strokeWidth={3} />
          <span className="text-[11px] font-black uppercase tracking-wider">{notice}</span>
        </div>
      ) : null}

      <div className={`flex flex-col gap-4 border-b pb-5 ${theme.border}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
              AI & API <span className="text-[#c9a84c]">Configuration</span>
            </h1>
            <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.22em] ${theme.textSub}`}>
              Admin kill switch for unstable or degraded external services
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadIntegrations({ silent: true })}
            disabled={refreshing}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-all ${theme.border} ${theme.textMain} ${refreshing ? 'opacity-60 cursor-wait' : 'hover:border-[#c9a84c] hover:text-[#c9a84c]'}`}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh Status
          </button>
        </div>

        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${theme.card} ${theme.border} ${theme.shadow}`}>
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-[#c9a84c]" />
          <div>
            <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${theme.textMain}`}>
              User protection mode
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${theme.textSub}`}>
              Disabling an integration blocks new user-facing usage immediately, so you can isolate a bad provider without taking the whole platform down.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-500">
          <AlertTriangle size={18} />
          <span className="text-[11px] font-black uppercase tracking-wider">{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${theme.card} ${theme.border} ${theme.shadow}`}>
            <p className={`text-[9px] font-black uppercase tracking-[0.22em] ${theme.textSub}`}>{card.label}</p>
            <p className={`mt-2 text-3xl font-black ${card.accent}`}>{card.value}</p>
            <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.18em] ${theme.textSub}`}>{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = integrationIcons[integration.slug] || AlertTriangle;
          const statusClass = statusStyles[integration.status] || statusStyles['NOT CONFIGURED'];
          const isBusy = savingSlug === integration.slug;

          return (
            <div
              key={integration.slug}
              className={`rounded-2xl border p-5 transition-all ${theme.card} ${theme.border} ${theme.shadow}`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`rounded-2xl border p-3 ${theme.border} ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-[#c9a84c]`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className={`text-lg font-black ${theme.textMain}`}>{integration.name}</h2>
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${statusClass}`}>
                        {integration.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#c9a84c]">
                      {integration.category} | {integration.tier}
                    </p>
                    <p className={`mt-2 max-w-xl text-sm leading-relaxed ${theme.textSub}`}>
                      {integration.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(integration)}
                  disabled={isBusy}
                  className={`inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] transition-all ${
                    integration.isEnabled
                      ? 'border border-red-500/20 text-red-500 hover:bg-red-500/10'
                      : 'bg-[#c9a84c] text-black hover:brightness-110'
                  } ${isBusy ? 'cursor-wait opacity-70' : ''}`}
                >
                  {isBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                  {integration.isEnabled ? 'Disable Access' : 'Enable Access'}
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className={`rounded-xl border p-3 ${theme.border} ${theme.inputBg}`}>
                  <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${theme.textSub}`}>Provider</p>
                  <p className={`mt-2 break-all font-mono text-[11px] ${theme.textMain}`}>{integration.providerValue || 'Not available'}</p>
                </div>

                <div className={`rounded-xl border p-3 ${theme.border} ${theme.inputBg}`}>
                  <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${theme.textSub}`}>Runtime Mode</p>
                  <p className={`mt-2 text-[11px] font-bold uppercase tracking-[0.14em] ${theme.textMain}`}>
                    {integration.runtimeMode || 'Unknown'}
                  </p>
                </div>
              </div>

              <div className={`mt-4 flex flex-col gap-2 rounded-xl border p-3 ${theme.border}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${theme.textSub}`}>User Access</p>
                  <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${integration.isEnabled ? 'text-green-500' : 'text-red-500'}`}>
                    {integration.isEnabled ? 'Allowed' : 'Blocked'}
                  </span>
                </div>

                {!integration.isConfigured ? (
                  <p className="text-[11px] font-bold text-amber-500">
                    This integration is enabled in the admin panel, but provider credentials are still missing.
                  </p>
                ) : null}

                {!integration.isEnabled ? (
                  <p className="text-[11px] font-bold text-red-500">
                    {integration.disabledReason || 'Temporarily disabled by admin.'}
                  </p>
                ) : null}

                <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${theme.textSub}`}>
                  Last change: {integration.updatedAt ? new Date(integration.updatedAt).toLocaleString() : 'No updates yet'}
                  {integration.updatedBy ? ` | ${integration.updatedBy}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AiConfig;
