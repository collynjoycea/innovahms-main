import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Zap,
  Crown,
  Sprout,
  FileText,
  RefreshCw,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import Pagination, { usePagination } from '../../components/Pagination';

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const emptyPackageForm = {
  name: '',
  description: '',
  monthlyPrice: '0',
  annualPrice: '0',
  maxRooms: '',
  displayOrder: '0',
  featuresText: '',
  isPopular: false,
  isActive: true,
};

const emptySubscriptionForm = {
  hotelId: '',
  packageId: '',
  billingCycle: 'MONTHLY',
  status: 'ACTIVE',
  renewalDate: '',
};

const packageTheme = (slug) => {
  if (slug === 'enterprise') return { icon: Crown, accent: 'text-purple-400', pill: 'bg-purple-500/15 text-purple-400' };
  if (slug === 'pro') return { icon: Zap, accent: 'text-[#c9a84c]', pill: 'bg-[#c9a84c]/15 text-[#c9a84c]' };
  return { icon: Sprout, accent: 'text-green-400', pill: 'bg-emerald-500/15 text-emerald-400' };
};

const formatPhp = (amount) => currencyFormatter.format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString();
};

const normalizeFeatures = (rawValue) =>
  String(rawValue || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const ModalShell = ({ children, onClose, isDarkMode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div className={`w-full max-w-2xl rounded-3xl border ${isDarkMode ? 'border-white/10 bg-[#111111]' : 'border-gray-200 bg-white'} shadow-2xl`}>
      <div className={`flex items-center justify-between border-b px-6 py-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-gray-500">Admin Control</p>
        <button
          type="button"
          onClick={onClose}
          className={`rounded-xl border p-2 transition-colors ${isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const MemPackage = () => {
  const { isDarkMode } = useOutletContext();
  const [packages, setPackages] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [packageForm, setPackageForm] = useState(emptyPackageForm);
  const [subscriptionForm, setSubscriptionForm] = useState(emptySubscriptionForm);
  const [editingPackage, setEditingPackage] = useState(null);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const theme = {
    bg: isDarkMode ? 'bg-[#0c0c0e]' : 'bg-[#f0f0f3]',
    card: isDarkMode ? 'bg-[#111111]/80 backdrop-blur-md' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-gray-900',
    textSub: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-white/10' : 'border-gray-300',
    inputBg: isDarkMode ? 'bg-white/5' : 'bg-gray-50',
    shadow: isDarkMode ? 'shadow-2xl shadow-black/40' : 'shadow-[0_15px_40px_rgba(0,0,0,0.08)]',
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/packages');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load package data.');
      setPackages(data.packages || []);
      setSubscriptions(data.subscriptions || []);
      setHotels(data.hotels || []);
      setStats(data.stats || {});
    } catch (err) {
      setError(err.message || 'Unable to load package data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSubscriptions = useMemo(() => subscriptions.filter((subscription) => {
    const matchesPlan = planFilter === 'all' || subscription.planSlug === planFilter || subscription.plan === planFilter;
    const haystack = `${subscription.hotelName} ${subscription.hotelCode} ${subscription.ownerName} ${subscription.ownerEmail} ${subscription.plan}`.toLowerCase();
    return matchesPlan && haystack.includes(search.toLowerCase());
  }), [subscriptions, planFilter, search]);

  const { paged, page, totalPages, setPage } = usePagination(filteredSubscriptions);

  const openNewPackageModal = () => {
    setEditingPackage(null);
    setPackageForm(emptyPackageForm);
    setShowPackageModal(true);
  };

  const openEditPackageModal = (pkg) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name || '',
      description: pkg.description || '',
      monthlyPrice: String(pkg.monthlyPrice ?? 0),
      annualPrice: String(pkg.annualPrice ?? 0),
      maxRooms: pkg.maxRooms ?? '',
      displayOrder: String(pkg.displayOrder ?? 0),
      featuresText: (pkg.features || []).join('\n'),
      isPopular: Boolean(pkg.isPopular),
      isActive: Boolean(pkg.isActive),
    });
    setShowPackageModal(true);
  };

  const closePackageModal = () => {
    setShowPackageModal(false);
    setEditingPackage(null);
    setPackageForm(emptyPackageForm);
  };

  const openSubscriptionModal = (subscription = null) => {
    const firstHotel = hotels[0];
    const firstPackage = packages[0];
    setEditingSubscription(subscription);
    setSubscriptionForm({
      hotelId: String(subscription?.hotelId ?? firstHotel?.id ?? ''),
      packageId: String(subscription?.packageId ?? firstPackage?.id ?? ''),
      billingCycle: subscription?.cycle || 'MONTHLY',
      status: subscription?.status || 'ACTIVE',
      renewalDate: subscription?.renewal ? String(subscription.renewal).slice(0, 10) : '',
    });
    setShowSubscriptionModal(true);
  };

  const closeSubscriptionModal = () => {
    setShowSubscriptionModal(false);
    setEditingSubscription(null);
    setSubscriptionForm(emptySubscriptionForm);
  };

  const submitPackage = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      name: packageForm.name.trim(),
      description: packageForm.description.trim(),
      monthlyPrice: Number(packageForm.monthlyPrice || 0),
      annualPrice: Number(packageForm.annualPrice || 0),
      maxRooms: packageForm.maxRooms === '' ? null : Number(packageForm.maxRooms),
      displayOrder: Number(packageForm.displayOrder || 0),
      features: normalizeFeatures(packageForm.featuresText),
      isPopular: packageForm.isPopular,
      isActive: packageForm.isActive,
    };

    try {
      const response = await fetch(editingPackage ? `/api/admin/packages/${editingPackage.id}` : '/api/admin/packages', {
        method: editingPackage ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save package.');
      closePackageModal();
      setNotice(data.message || 'Package saved successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to save package.');
    } finally {
      setSaving(false);
    }
  };

  const deletePackage = async (packageId) => {
    if (!window.confirm('Delete this package?')) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/packages/${packageId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete package.');
      setNotice(data.message || 'Package deleted successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to delete package.');
    } finally {
      setSaving(false);
    }
  };

  const submitSubscription = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/package-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: Number(subscriptionForm.hotelId),
          packageId: Number(subscriptionForm.packageId),
          billingCycle: subscriptionForm.billingCycle,
          status: subscriptionForm.status,
          renewalDate: subscriptionForm.renewalDate || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save subscription.');
      closeSubscriptionModal();
      setNotice(data.message || 'Subscription saved successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to save subscription.');
    } finally {
      setSaving(false);
    }
  };

  const renewSubscription = async (subscriptionId) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/package-subscriptions/${subscriptionId}/renew`, { method: 'PATCH' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to renew subscription.');
      setNotice(data.message || 'Subscription renewed successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Unable to renew subscription.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen space-y-8 p-6 transition-all duration-500 ${theme.bg}`}>
      <div className={`flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between ${theme.border}`}>
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tighter ${theme.textMain}`}>
            Membership <span className="text-[#c9a84c]">Packages</span>
          </h1>
          <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.2em] ${theme.textSub}`}>
            View fixed package tiers and live hotel-owner subscriptions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase transition-all ${saving ? 'cursor-not-allowed opacity-60' : `${theme.border} ${theme.card} ${theme.textMain} hover:border-[#c9a84c]`}`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {(error || notice) && (
        <div className={`rounded-2xl border px-4 py-3 text-[11px] font-bold ${error ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'}`}>
          {error || notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Package Count', value: stats.totalPackages ?? 0 },
          { label: 'Active Hotels', value: stats.activeSubscriptions ?? 0 },
          { label: 'Pending Hotels', value: stats.pendingSubscriptions ?? 0 },
          { label: 'Projected MRR', value: formatPhp(stats.monthlyRecurringRevenue ?? 0) },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-6 ${theme.border} ${theme.card} ${theme.shadow}`}>
            <div className={`mb-4 inline-flex rounded-xl border p-2.5 text-[#c9a84c] ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
              <ShieldCheck size={18} />
            </div>
            <p className={`mb-1 text-[9px] font-black uppercase tracking-[0.18em] ${theme.textSub}`}>{card.label}</p>
            <h2 className={`text-3xl font-black tracking-tighter ${theme.textMain}`}>{card.value}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#c9a84c]" size={28} />
          </div>
        ) : (
          packages.map((pkg) => {
            const meta = packageTheme(pkg.slug);
            const Icon = meta.icon;
            return (
              <div key={pkg.id} className={`relative rounded-2xl border p-8 transition-all duration-300 ${theme.border} ${theme.card} ${theme.shadow} ${pkg.isPopular ? 'ring-1 ring-[#c9a84c]/50' : ''}`}>
                {pkg.isPopular && (
                  <span className="absolute right-6 top-[-12px] rounded-full bg-[#c9a84c] px-3 py-1 text-[8px] font-black uppercase tracking-widest text-black">
                    Most Popular
                  </span>
                )}
                <div className={`mb-6 inline-flex rounded-xl p-3 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'} ${meta.accent}`}>
                  <Icon size={28} />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`text-xl font-black ${theme.textMain}`}>{pkg.name}</h3>
                    <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${theme.textSub}`}>
                      {pkg.maxRooms ? `Up to ${pkg.maxRooms} rooms` : 'Unlimited rooms'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest ${meta.pill}`}>
                    {pkg.isActive ? 'Live' : 'Paused'}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${theme.textMain}`}>{formatPhp(pkg.monthlyPrice)}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">/ month</span>
                </div>
                <p className={`mt-2 min-h-[36px] text-sm leading-relaxed ${theme.textSub}`}>{pkg.description || 'No package description yet.'}</p>
                <ul className={`mb-8 mt-6 space-y-3 border-t pt-6 ${theme.border}`}>
                  {(pkg.features || []).map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight text-gray-500">
                      <CheckCircle2 size={14} className="text-[#c9a84c]" />
                      {feature}
                    </li>
                  ))}
                  {(!pkg.features || pkg.features.length === 0) && (
                    <li className={`text-[10px] font-bold uppercase tracking-tight ${theme.textSub}`}>No features listed.</li>
                  )}
                </ul>
                <div className={`rounded-2xl border px-4 py-4 text-[10px] font-bold uppercase tracking-[0.18em] ${theme.border} ${theme.inputBg} ${theme.textSub}`}>
                  System-defined package
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={`overflow-hidden rounded-2xl border ${theme.border} ${theme.card} ${theme.shadow}`}>
        <div className={`flex flex-col gap-4 border-b p-5 ${theme.border} ${isDarkMode ? 'bg-white/[0.01]' : 'bg-gray-50/60'}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#c9a84c]" size={18} />
              <div>
                <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textMain}`}>Hotel Subscriptions</h2>
                <p className={`text-[10px] ${theme.textSub}`}>{filteredSubscriptions.length} matching hotels</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${theme.border} ${theme.inputBg}`}>
                <Search size={14} className="text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search hotel, owner, plan..."
                  className={`w-full bg-transparent text-[10px] font-bold uppercase outline-none placeholder:text-gray-500 ${theme.textMain}`}
                />
              </div>
              <select
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value)}
                className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase outline-none ${theme.border} ${theme.inputBg} ${theme.textMain}`}
              >
                <option value="all">All Plans</option>
                {packages.map((pkg) => <option key={pkg.id} value={pkg.slug}>{pkg.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#c9a84c]" size={28} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={`${isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50'} border-b ${theme.border}`}>
                  <tr>
                    {['Hotel', 'Plan', 'Billing Cycle', 'Amount', 'Next Renewal', 'Status', 'Renewal'].map((heading) => (
                      <th key={heading} className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest ${theme.textSub}`}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme.border}`}>
                  {paged.map((subscription) => {
                    const meta = packageTheme(subscription.planSlug);
                    return (
                      <tr key={subscription.id} className="transition-colors hover:bg-[#c9a84c]/5">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`text-[11px] font-black ${theme.textMain}`}>{subscription.hotelName}</span>
                            <span className={`text-[10px] font-bold ${theme.textSub}`}>
                              {subscription.ownerName}
                              {subscription.hotelCode ? ` | ${subscription.hotelCode}` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest ${meta.pill}`}>{subscription.plan}</span>
                        </td>
                        <td className={`px-6 py-4 text-[10px] font-bold uppercase ${theme.textSub}`}>{subscription.cycle}</td>
                        <td className={`px-6 py-4 text-[11px] font-black ${theme.textMain}`}>{formatPhp(subscription.amount)}</td>
                        <td className={`px-6 py-4 text-[10px] font-bold ${theme.textSub}`}>{formatDate(subscription.renewal)}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-widest ${
                            subscription.status === 'ACTIVE'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : subscription.status === 'PENDING'
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                : 'border-gray-500/20 bg-gray-500/10 text-gray-400'
                          }`}>
                            {subscription.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => renewSubscription(subscription.id)}
                            className={`rounded-lg border p-2 transition-all ${theme.border} ${theme.textMain} hover:bg-[#c9a84c] hover:text-black`}
                            title="Renew subscription"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={7} className={`px-6 py-10 text-center text-[11px] ${theme.textSub}`}>
                        No subscriptions found for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} setPage={setPage} total={filteredSubscriptions.length} isDarkMode={isDarkMode} />
          </>
        )}
      </div>
    </div>
  );
};

export default MemPackage;
