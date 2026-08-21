import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Crown, Gift, ShieldCheck, Sparkles, Star } from "lucide-react";

const parseCustomer = () => {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("customerSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
  } catch {
    return null;
  }
};

export default function Rewards() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(parseCustomer());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncCustomer = () => setCustomer(parseCustomer());
    window.addEventListener("userUpdated", syncCustomer);
    window.addEventListener("storage", syncCustomer);
    return () => {
      window.removeEventListener("userUpdated", syncCustomer);
      window.removeEventListener("storage", syncCustomer);
    };
  }, []);

  useEffect(() => {
    if (!customer?.id) {
      navigate("/login", { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/innova/summary/${customer.id}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || `Summary failed (HTTP ${res.status})`);
        setSummary(payload);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [customer?.id, navigate]);

  const subscription = summary?.privilege || {};
  const pointsBalance = summary?.pointsBalance || {};
  const pointSources = summary?.pointSources || [];
  const stats = useMemo(() => ([
    {
      label: "Current Tier",
      value: summary?.tier || "STANDARD",
      helper: subscription?.isActive ? `${subscription?.packageName} benefits active` : "No active paid privilege",
    },
    {
      label: "Available Points",
      value: `${Number(summary?.points || 0).toLocaleString()} pts`,
      helper: `${Number(summary?.pointsThisMonth || 0).toLocaleString()} earned this month`,
    },
    {
      label: "Renewal Date",
      value: subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "--",
      helper: subscription?.isActive ? "Privilege renewal is tracked in the database" : "Activate a privilege plan to unlock paid perks",
    },
  ]), [summary, subscription]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        
        {/* HERO SECTION */}
        <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 text-white shadow-xl">
          <div className="grid gap-8 p-8 md:p-10 md:grid-cols-[1.08fr_0.92fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Elite Loyalty Program</p>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Customer Rewards Center</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-300">
                Track your paid privilege access, bonus points, and current membership standing in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/privileges")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-all shadow-md shadow-emerald-950/40"
                >
                  Manage Privileges
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/customer/bookings")}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-all"
                >
                  My Bookings
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-emerald-500/10 p-3.5 text-emerald-400"><Crown size={26} /></div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Current Status</p>
                  <h2 className="mt-0.5 text-2xl font-bold">{loading ? "Loading..." : (subscription?.packageName || summary?.tier || "STANDARD")}</h2>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-zinc-400">{item.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PERKS CARDS */}
        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: <Gift size={22} className="text-emerald-400" />,
              title: "Paid member perks",
              desc: subscription?.isActive
                ? `${subscription?.packageName} is active with ${Number(subscription?.bonusPoints || 0).toLocaleString()} bonus points on successful payment.`
                : "Upgrade through the Privileges page to unlock paid discounts, support priority, and activation bonus points.",
            },
            {
              icon: <ShieldCheck size={22} className="text-emerald-400" />,
              title: "Verified payment flow",
              desc: "Privilege subscriptions are now connected to payment verification and renewal tracking in the database.",
            },
            {
              icon: <Sparkles size={22} className="text-emerald-400" />,
              title: "Loyalty sync",
              desc: "Successful privilege payments update your summary, tier presentation, and bonus point balance automatically.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  {card.icon}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{card.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">{card.desc}</p>
            </div>
          ))}
        </section>

        {/* POINTS & SOURCES BREAKDOWN */}
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Points Balance</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">How your balance is built</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
              {pointsBalance?.explanation || "Your balance combines stay spend points and privilege bonus points."}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Balance</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">{Number(pointsBalance?.total || summary?.points || 0).toLocaleString()} pts</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">{Number(pointsBalance?.thisMonth || summary?.pointsThisMonth || 0).toLocaleString()} points added this month</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Earn Rate</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  {Number(pointsBalance?.earnRatePoints || 1).toLocaleString()} point / PHP {Number(pointsBalance?.earnRatePhp || 100).toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">Eligible booking spend converts automatically into stay points.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Point Sources</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">What points you have</h2>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Live breakdown
              </span>
            </div>

            <div className="mt-6 space-y-3.5">
              {pointSources.map((source) => (
                <div key={source.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{source.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">{source.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-400">{Number(source.points || 0).toLocaleString()} pts</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">+{Number(source.pointsThisMonth || 0).toLocaleString()} this month</p>
                    </div>
                  </div>
                </div>
              ))}
              {!pointSources.length ? <p className="text-sm text-slate-500 dark:text-zinc-400">Point source details will appear after your rewards summary loads.</p> : null}
            </div>
          </div>
        </section>

        {/* TIERS AND BENEFITS */}
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Membership Tiers</h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-400">
              Your rewards view now reflects both loyalty points and active privilege subscription status.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  name: "Silver",
                  helper: "Entry paid member tier",
                  points: "500 bonus pts",
                },
                {
                  name: "Gold",
                  helper: "Frequent guest access",
                  points: "1,500 bonus pts",
                },
                {
                  name: "Platinum",
                  helper: "Premium guest access",
                  points: "4,000 bonus pts",
                },
              ].map((tierCard) => (
                <div
                  key={tierCard.name}
                  className={`rounded-xl border p-5 ${
                    summary?.tier === tierCard.name.toUpperCase()
                      ? "border-emerald-600 bg-emerald-950/20 dark:border-emerald-600 dark:bg-emerald-950/30"
                      : "border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950/60"
                  }`}
                >
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{tierCard.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{tierCard.helper}</p>
                  <p className="mt-4 text-base font-bold text-emerald-400">{tierCard.points}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Active Benefits</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  {subscription?.isActive ? `${subscription?.packageName} Benefits` : "No Paid Benefits Yet"}
                </h2>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Star size={22} />
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {(subscription?.perks?.length ? subscription.perks : [
                "Member-only room previews",
                "Priority support access",
                "Payment-verified privilege tracking",
              ]).map((perk) => (
                <div key={perk} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-200">
                  <CheckCircle2 size={18} className="mt-0.5 text-emerald-400 flex-shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate("/privileges")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-all shadow-md shadow-emerald-950/40"
            >
              Open Privileges
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}