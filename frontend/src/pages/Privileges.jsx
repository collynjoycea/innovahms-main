import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PENDING_PAYMENT_KEY = "customerPendingPrivilegePayment";

const fallbackPackages = [
  {
    id: "fallback-silver",
    name: "Silver",
    slug: "silver",
    description: "Entry access to member pricing and elevated guest benefits.",
    monthlyPrice: 399,
    annualPrice: 3990,
    bonusPoints: 500,
    isPopular: false,
    perks: [
      "Member-only room rate previews",
      "5% dining and add-on discount",
      "Priority support queue",
      "500 welcome points on activation",
    ],
  },
  {
    id: "fallback-gold",
    name: "Gold",
    slug: "gold",
    description: "Balanced premium tier for frequent leisure and business travelers.",
    monthlyPrice: 799,
    annualPrice: 7990,
    bonusPoints: 1500,
    isPopular: true,
    perks: [
      "Everything in Silver",
      "10% member booking discount",
      "Upgrade priority on eligible stays",
      "1,500 bonus points every successful renewal",
    ],
  },
  {
    id: "fallback-platinum",
    name: "Platinum",
    slug: "platinum",
    description: "High-touch privileges with richer discounts and concierge-focused perks.",
    monthlyPrice: 1499,
    annualPrice: 14990,
    bonusPoints: 4000,
    isPopular: false,
    perks: [
      "Everything in Gold",
      "15% member booking discount",
      "Late checkout priority requests",
      "Dedicated privilege support line",
      "4,000 bonus points every successful renewal",
    ],
  },
];

const formatPhp = (value) => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `PHP ${amount.toLocaleString()}`;
  }
};

const parseCustomerSession = () => {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("customerSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
  } catch {
    return null;
  }
};

const persistCustomerSummary = (summary) => {
  if (!summary?.user?.id) return;

  ["user", "customerSession"].forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.user && typeof parsed.user === "object") {
        parsed.user = {
          ...parsed.user,
          ...summary.user,
          loyaltyPoints: summary.points,
          membershipLevel: summary.tier,
          privilege: summary.privilege,
        };
        localStorage.setItem(key, JSON.stringify(parsed));
        return;
      }
      localStorage.setItem(key, JSON.stringify({
        ...parsed,
        ...summary.user,
        loyaltyPoints: summary.points,
        membershipLevel: summary.tier,
        privilege: summary.privilege,
      }));
    } catch {
      // ignore malformed local data
    }
  });

  window.dispatchEvent(new Event("userUpdated"));
};

export default function Privileges() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionUser, setSessionUser] = useState(parseCustomerSession());
  const [packages, setPackages] = useState(fallbackPackages);
  const [summary, setSummary] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const customerId = sessionUser?.id;
  const activePlanSlug = subscription?.packageSlug;
  const privilegeActive = Boolean(subscription?.isActive);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const query = customerId ? `?customer_id=${customerId}` : "";
      const response = await fetch(`/api/customer/privileges${query}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load privileges.");
      setPackages(payload.packages?.length ? payload.packages : fallbackPackages);
      setSummary(payload.summary || null);
      setSubscription(payload.subscription || payload.summary?.privilege || null);
      if (payload.summary) persistCustomerSummary(payload.summary);
    } catch (err) {
      setError(err.message || "Failed to load privileges.");
      setPackages(fallbackPackages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const syncSession = () => setSessionUser(parseCustomerSession());
    syncSession();
    window.addEventListener("userUpdated", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("userUpdated", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  useEffect(() => {
    load();
  }, [customerId]);

  useEffect(() => {
    const paymentState = searchParams.get("payment");
    const pendingRaw = localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!customerId || !paymentState || !pendingRaw) return;

    let pending = null;
    try {
      pending = JSON.parse(pendingRaw);
    } catch {
      pending = null;
    }
    if (!pending || Number(pending.customerId) !== Number(customerId) || !pending.linkId) return;

    if (paymentState === "failed") {
      setError("Privilege payment was not completed.");
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      setSearchParams({});
      return;
    }

    if (paymentState !== "success") return;

    const verify = async () => {
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      setPaymentLoading(pending.linkId);
      try {
        const response = await fetch(`/api/customer/privileges/verify/${pending.linkId}?customer_id=${customerId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to verify privilege payment.");
        if (data.summary) {
          setSummary(data.summary);
          setSubscription(data.subscription || data.summary?.privilege || null);
          persistCustomerSummary(data.summary);
        }
        setMessage(
          data.isSimulated
            ? "Simulated privilege payment confirmed. Your customer benefits are now active."
            : "Privilege payment confirmed. Your customer benefits are now active."
        );
        setSearchParams({});
        await load();
      } catch (err) {
        localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(pending));
        setError(err.message || "Unable to verify privilege payment.");
      } finally {
        setPaymentLoading("");
      }
    };

    verify();
  }, [customerId, searchParams, setSearchParams]);

  const summaryStats = useMemo(() => ([
    {
      label: "Current Tier",
      value: summary?.tier || "STANDARD",
      helper: privilegeActive ? `${subscription?.packageName} benefits active` : "No paid privilege yet",
    },
    {
      label: "Points Balance",
      value: `${Number(summary?.points || 0).toLocaleString()} pts`,
      helper: `${Number(summary?.pointsThisMonth || 0).toLocaleString()} points earned this month`,
    },
    {
      label: "Renewal Date",
      value: subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "--",
      helper: privilegeActive ? "Active privilege access" : "Activate a plan to unlock benefits",
    },
  ]), [summary, subscription, privilegeActive]);

  const handleCheckout = async (pkg, billingCycle) => {
    if (!customerId) {
      navigate("/login");
      return;
    }

    setError("");
    setMessage("");
    setPaymentLoading(`${pkg.id}-${billingCycle}`);
    try {
      const response = await fetch("/api/customer/privileges/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          packageId: pkg.id,
          billingCycle,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start privilege checkout.");
      localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
        customerId,
        linkId: data.linkId,
        packageId: pkg.id,
        billingCycle,
      }));
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message || "Unable to start privilege checkout.");
      setPaymentLoading("");
    }
  };

  const handleCancelPrivilege = async () => {
    if (!customerId || cancelLoading) return;
    setCancelLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/customer/privileges/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to cancel privilege tier.");
      if (data.summary) {
        setSummary(data.summary);
        setSubscription(data.subscription || data.summary?.privilege || null);
        persistCustomerSummary(data.summary);
      }
      setMessage(data.message || "Privilege tier cancelled successfully.");
      setCancelModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || "Unable to cancel privilege tier.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#1a160d] dark:bg-[#0d0c0a] dark:text-[#ebe3d1]">
      {cancelModalOpen ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-[#ead9b4] bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[#14120e]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-red-100 p-3 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <AlertTriangle size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bf9b30]">Cancel Privilege Tier</p>
                <h3 className="mt-2 text-2xl font-black text-[#1a160d] dark:text-white">
                  Stop {subscription?.packageName || "current"} privilege access?
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#6e624f] dark:text-[#baad91]">
                  This will cancel the active privilege tier in your profile and remove its booking discount from future reservations.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 rounded-full border border-[#d8c79d] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#8f732d] dark:border-white/10 dark:text-[#eadcbf]"
              >
                Keep Tier
              </button>
              <button
                type="button"
                onClick={handleCancelPrivilege}
                disabled={cancelLoading}
                className="flex-1 rounded-full bg-red-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-60"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="relative flex min-h-[56vh] items-center overflow-hidden border-b border-[#eadfc9] bg-[#1a160d] px-6 py-16 dark:border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,155,48,0.28),transparent_30%),linear-gradient(135deg,rgba(13,12,10,0.82),rgba(30,25,17,0.68),rgba(13,12,10,0.88))]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#f1d27b]">
              <Star size={12} />
              Customer Privileges
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] text-white md:text-6xl">
              Premium stays, paid loyalty access, and verified rewards in one flow.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/82 md:text-base">
              Choose a privilege tier, complete payment, and let Innova HMS sync your benefits, renewal date, and bonus points directly into your customer profile.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => (customerId ? navigate("/rewards") : navigate("/login"))}
                className="inline-flex items-center gap-2 rounded-full bg-[#bf9b30] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-[#a8872a]"
              >
                {customerId ? "Open Rewards Center" : "Sign In to Continue"}
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/vision-suites")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-white/15"
              >
                Browse Rooms
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f1d27b]">Live Membership Snapshot</p>
            <div className="mt-5 grid gap-4">
              {summaryStats.map((item) => (
                <div key={item.label} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">{item.label}</p>
                  <h3 className="mt-2 text-xl font-black text-white">{item.value}</h3>
                  <p className="mt-1 text-sm text-white/65">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {(error || message) ? (
          <div className={`rounded-[1.6rem] border px-5 py-4 text-sm font-semibold ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {error || message}
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#bf9b30]">Privilege Plans</p>
            <h2 className="mt-3 text-3xl font-black text-[#1a160d] dark:text-white md:text-5xl">
              Choose the customer experience you want unlocked
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-[#6e624f] dark:text-[#baad91]">
            Plans are stored in the database, payment status is verified after checkout, and successful activations add bonus loyalty points directly to your account.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[#bf9b30]" />
            </div>
          ) : (
            packages.map((pkg, index) => {
              const isCurrent = activePlanSlug === pkg.slug;
              return (
                <motion.article
                  key={pkg.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className={`rounded-[1.9rem] border p-7 shadow-[0_18px_48px_rgba(80,58,18,0.09)] ${
                    isCurrent
                      ? "border-[#bf9b30] bg-[#fff8eb] dark:border-[#bf9b30] dark:bg-[#16120b]"
                      : "border-[#e6d9bf] bg-white dark:border-white/10 dark:bg-[#14120e]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                      pkg.isPopular
                        ? "border-[#ead9b4] bg-[#fcf6e8] text-[#9b7619] dark:border-white/10 dark:bg-white/5 dark:text-[#e6d7b8]"
                        : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-[#b8ab8d]"
                    }`}>
                      {pkg.isPopular ? "Most Chosen" : "Privilege Tier"}
                    </span>
                    <span className="text-3xl font-black tracking-tight text-[#bf9b30]">{pkg.name}</span>
                  </div>

                  <h3 className="mt-6 text-2xl font-black text-[#1a160d] dark:text-white">{pkg.description}</h3>
                  <div className="mt-5 flex items-center gap-3 rounded-[1.35rem] border border-[#efe3cb] bg-[#fffdf8] px-4 py-4 dark:border-white/10 dark:bg-white/5">
                    <Crown size={18} className="text-[#bf9b30]" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a7241] dark:text-[#d9cca9]">Activation Bonus</p>
                      <p className="text-lg font-black text-[#1a160d] dark:text-white">{Number(pkg.bonusPoints || 0).toLocaleString()} pts</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    {(pkg.perks || []).map((perk) => (
                      <div key={perk} className="flex items-start gap-2 text-sm text-[#726654] dark:text-[#c5b79d]">
                        <CheckCircle2 size={16} className="mt-0.5 text-[#bf9b30]" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleCheckout(pkg, isCurrent ? "MONTHLY" : "ANNUAL")}
                      disabled={Boolean(paymentLoading) || cancelLoading}
                      className="rounded-full bg-[#1a160d] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-[#2b2417] disabled:opacity-60 dark:bg-white dark:text-[#1a160d]"
                    >
                      {paymentLoading === `${pkg.id}-${isCurrent ? "MONTHLY" : "ANNUAL"}`
                        ? "Processing..."
                        : isCurrent
                          ? `Renew ${formatPhp(pkg.monthlyPrice)}`
                          : `Pay ${formatPhp(pkg.annualPrice)}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => (isCurrent ? setCancelModalOpen(true) : handleCheckout(pkg, "MONTHLY"))}
                      disabled={Boolean(paymentLoading) || cancelLoading}
                      className={`rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-60 ${
                        isCurrent
                          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                          : "border-[#d8c79d] bg-[#f7f0df] text-[#8f732d] hover:bg-[#efe3c3] dark:border-white/10 dark:bg-white/5 dark:text-[#eadcbf] dark:hover:bg-white/10"
                      }`}
                    >
                      {isCurrent
                        ? "Cancel Privilege Tier"
                        : paymentLoading === `${pkg.id}-MONTHLY`
                          ? "Processing..."
                          : `Pay ${formatPhp(pkg.monthlyPrice)}`}
                    </button>
                  </div>
                  {!isCurrent ? (
                    <p className="mt-3 text-[11px] font-semibold text-[#7b694a] dark:text-[#d0c2a7]">
                      Monthly: {formatPhp(pkg.monthlyPrice)} • Annual: {formatPhp(pkg.annualPrice)}
                    </p>
                  ) : null}
                </motion.article>
              );
            })
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <div className="rounded-[2rem] border border-[#e6d8bb] bg-gradient-to-r from-[#fff8e9] via-[#f8f1e1] to-[#f3e8c8] p-8 shadow-[0_18px_45px_rgba(80,58,18,0.08)] dark:border-white/10 dark:bg-[#14120e]">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#bf9b30]">Payment Flow</p>
            <h3 className="mt-3 text-3xl font-black text-[#1a160d] dark:text-white">What happens after you pay</h3>
            <div className="mt-6 space-y-3">
              {[
                "Choose a privilege tier and billing cycle on this page.",
                "The app creates a payment link and redirects you to the checkout flow.",
                "After payment, Innova HMS verifies the transaction and activates the privilege record in the database.",
                "Your customer summary, points, and privilege renewal date refresh automatically.",
              ].map((step) => (
                <div key={step} className="flex items-start gap-3 rounded-2xl border border-[#e8d7b4] bg-white/75 px-4 py-4 text-sm text-[#5f4d32] dark:border-white/10 dark:bg-white/5 dark:text-[#d8c9aa]">
                  <Sparkles size={16} className="mt-0.5 text-[#bf9b30]" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#e6d8bb] bg-white p-8 shadow-[0_18px_45px_rgba(80,58,18,0.08)] dark:border-white/10 dark:bg-[#14120e]">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#bf9b30]/12 p-3 text-[#bf9b30]">
                <CreditCard size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#bf9b30]">Current Access</p>
                <h3 className="mt-1 text-2xl font-black text-[#1a160d] dark:text-white">
                  {privilegeActive ? `${subscription?.packageName} Active` : "No Active Privilege"}
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-[#efe3cb] bg-[#fffdf8] px-4 py-4 dark:border-white/10 dark:bg-white/5">
                <span className="text-[#7b694a] dark:text-[#d0c2a7]">Payment status</span>
                <span className="font-black text-[#1a160d] dark:text-white">{subscription?.paymentStatus || "UNPAID"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#efe3cb] bg-[#fffdf8] px-4 py-4 dark:border-white/10 dark:bg-white/5">
                <span className="text-[#7b694a] dark:text-[#d0c2a7]">Billing cycle</span>
                <span className="font-black text-[#1a160d] dark:text-white">{subscription?.billingCycle || "--"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#efe3cb] bg-[#fffdf8] px-4 py-4 dark:border-white/10 dark:bg-white/5">
                <span className="text-[#7b694a] dark:text-[#d0c2a7]">Renewal date</span>
                <span className="font-black text-[#1a160d] dark:text-white">
                  {subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "--"}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => navigate(customerId ? "/rewards" : "/login")}
                className="w-full rounded-full bg-[#bf9b30] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-[#a8872a]"
              >
                {customerId ? "Open Rewards Center" : "Sign In To Activate"}
              </button>
              {privilegeActive ? (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="w-full rounded-full border border-red-200 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-red-600 transition-all hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  Cancel Privilege Tier
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate("/customer/bookings")}
                className="w-full rounded-full border border-[#d9ca9f] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#8f732d] transition-all hover:bg-[#fbf4e4] dark:border-white/10 dark:text-[#e8dcc1] dark:hover:bg-white/5"
              >
                Manage Bookings
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
