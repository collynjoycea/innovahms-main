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
    <div className="min-h-screen bg-[#FDFCFB] text-[#1a160d] dark:bg-[#0d0c0a] dark:text-[#ebe3d1]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <section className="overflow-hidden rounded-[2.2rem] border border-[#e6d8bb] bg-[#111111] text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.85)]">
          <div className="grid gap-8 px-8 py-10 md:grid-cols-[1.08fr_0.92fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#d2b04e]">Elite Loyalty Program</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Customer Rewards Center</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
                Track your paid privilege access, bonus points, and current membership standing in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/privileges")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#bf9b30] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white hover:bg-[#a8872a]"
                >
                  Manage Privileges
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/customer/bookings")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white hover:bg-white/15"
                >
                  My Bookings
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#bf9b30]/15 p-3 text-[#e8c868]"><Crown size={22} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Current Status</p>
                  <h2 className="mt-1 text-2xl font-black">{loading ? "Loading..." : (subscription?.packageName || summary?.tier || "STANDARD")}</h2>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-white/75">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{item.label}</p>
                    <p className="mt-2 text-lg font-black text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-white/55">{item.helper}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: <Gift size={18} className="text-[#bf9b30]" />,
              title: "Paid member perks",
              desc: subscription?.isActive
                ? `${subscription?.packageName} is active with ${Number(subscription?.bonusPoints || 0).toLocaleString()} bonus points on successful payment.`
                : "Upgrade through the Privileges page to unlock paid discounts, support priority, and activation bonus points.",
            },
            {
              icon: <ShieldCheck size={18} className="text-[#bf9b30]" />,
              title: "Verified payment flow",
              desc: "Privilege subscriptions are now connected to payment verification and renewal tracking in the database.",
            },
            {
              icon: <Sparkles size={18} className="text-[#bf9b30]" />,
              title: "Loyalty sync",
              desc: "Successful privilege payments update your summary, tier presentation, and bonus point balance automatically.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#14120e]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#bf9b30]/10">
                  {card.icon}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{card.title}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-[#c5b79d]">{card.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-[#14120e]">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 dark:text-[#bcaf95]">Points Balance</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">How your balance is built</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-[#bcaf95]">
              {pointsBalance?.explanation || "Your balance combines stay spend points and privilege bonus points."}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-[#bcaf95]">Total Balance</p>
                <p className="mt-2 text-3xl font-black text-[#bf9b30]">{Number(pointsBalance?.total || summary?.points || 0).toLocaleString()} pts</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-[#bcaf95]">{Number(pointsBalance?.thisMonth || summary?.pointsThisMonth || 0).toLocaleString()} points added this month</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-[#bcaf95]">Earn Rate</p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {Number(pointsBalance?.earnRatePoints || 1).toLocaleString()} point / PHP {Number(pointsBalance?.earnRatePhp || 100).toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-[#bcaf95]">Eligible booking spend converts automatically into stay points.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-[#14120e]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 dark:text-[#bcaf95]">Point Sources</p>
                <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">What points you have</h2>
              </div>
              <span className="rounded-full bg-[#bf9b30]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#bf9b30]">
                Live breakdown
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {pointSources.map((source) => (
                <div key={source.key} className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{source.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-[#bcaf95]">{source.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-[#bf9b30]">{Number(source.points || 0).toLocaleString()} pts</p>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-[#bcaf95]">+{Number(source.pointsThisMonth || 0).toLocaleString()} this month</p>
                    </div>
                  </div>
                </div>
              ))}
              {!pointSources.length ? <p className="text-sm text-slate-500 dark:text-[#bcaf95]">Point source details will appear after your rewards summary loads.</p> : null}
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-[#14120e]">
            <h2 className="text-2xl font-serif font-black text-slate-900 dark:text-white">Membership Tiers</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-[#bcaf95]">
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
                  className={`rounded-[18px] border p-5 ${
                    summary?.tier === tierCard.name.toUpperCase()
                      ? "border-[#bf9b30] bg-[#fff8eb] dark:border-[#bf9b30] dark:bg-[#1a150d]"
                      : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                  }`}
                >
                  <p className="text-lg font-black text-slate-900 dark:text-white">{tierCard.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[#bcaf95]">{tierCard.helper}</p>
                  <p className="mt-4 text-sm font-black text-[#bf9b30]">{tierCard.points}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-[#14120e]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400 dark:text-[#bcaf95]">Active Benefits</p>
                <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                  {subscription?.isActive ? `${subscription?.packageName} Benefits` : "No Paid Benefits Yet"}
                </h2>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bf9b30]/10">
                <Star size={20} className="text-[#bf9b30]" />
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {(subscription?.perks?.length ? subscription.perks : [
                "Member-only room previews",
                "Priority support access",
                "Payment-verified privilege tracking",
              ]).map((perk) => (
                <div key={perk} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-[#d9ccb1]">
                  <CheckCircle2 size={16} className="mt-0.5 text-[#bf9b30]" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate("/privileges")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#bf9b30] px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-white hover:brightness-95"
            >
              Open Privileges
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
