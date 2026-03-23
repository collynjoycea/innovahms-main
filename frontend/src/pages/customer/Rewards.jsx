import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const tierCard = (title, subtitle, chores, highlight, extra) => (
  <div className={`rounded-[20px] border border-slate-200 p-6 bg-white shadow-sm ${highlight ? "ring-2 ring-[#bf9b30]" : ""}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      {highlight ? (
        <span className="text-[10px] font-black uppercase tracking-widest bg-[#bf9b30] text-white px-3 py-1 rounded-full">Popular</span>
      ) : null}
    </div>

    <ul className="mt-5 space-y-2 text-sm text-slate-600">
      {chores.map((c) => (
        <li key={c} className="flex items-start gap-2">
          <span className="mt-1 h-2 w-2 rounded-full bg-[#bf9b30]" />
          <span>{c}</span>
        </li>
      ))}
    </ul>

    {extra ? <div className="mt-6 text-[11px] text-slate-500">{extra}</div> : null}
  </div>
);

export default function Rewards() {
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState("Standard");
  const [monthly, setMonthly] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      navigate("/login", { replace: true });
      return;
    }

    let user = null;
    try {
      user = JSON.parse(raw);
    } catch {
      user = null;
    }

    if (!user?.id) {
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/innova/summary/${user.id}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || `Summary failed (HTTP ${res.status})`);
        setPoints(payload.points ?? 0);
        setTier(payload.tier ?? "STANDARD");
        setMonthly(payload.pointsThisMonth ?? 0);
      } catch {
        // ignore
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1a160d]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Elite Loyalty Program</p>
            <h1 className="text-4xl font-serif font-black text-slate-900">Gold Standard Rewards</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Experience the pinnacle of hospitality where every stay is recognized and every moment is rewarded.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-black uppercase text-[11px] tracking-[0.25em] hover:bg-slate-50"
              >
                Back
              </button>
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Current Balance</p>
                <p className="mt-1 text-2xl font-black text-slate-900 flex items-center gap-2">
                  {points.toLocaleString()} pts
                </p>
                <p className="text-xs text-slate-500">Tier: {tier}</p>
                <p className="text-xs text-slate-500">+{monthly.toLocaleString()} this month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Points Accumulation */}
        <section className="mt-12">
          <h2 className="text-2xl font-serif font-black text-slate-900">Points Accumulation</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Earn points on every stay, unlock VIP benefits, and watch your rewards grow.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[20px] border border-slate-200 bg-[#0b1229] p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300">Booking Rewards</p>
                  <p className="mt-3 text-xl font-black">Earn 1pt for every PHP 100 spent</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-lg font-black">*</span>
                </div>
              </div>
              <p className="mt-5 text-sm text-slate-300">
                Points stack across rooms, dining, and spa - so every moment counts toward your next reward.
              </p>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-[#0b1229] p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300">Innova Milestones</p>
                  <p className="mt-3 text-xl font-black">Bonus points on your 5th &amp; 10th stay</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-lg font-black">Target</span>
                </div>
              </div>
              <p className="mt-5 text-sm text-slate-300">
                Reach milestone stays and unlock surprise boosts to accelerate your way to VIP perks.
              </p>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-[#0b1229] p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300">Eco-Friendly Choice</p>
                  <p className="mt-3 text-xl font-black">Earn 50 bonus pts per night</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-lg font-black">Eco</span>
                </div>
              </div>
              <p className="mt-5 text-sm text-slate-300">
                Skip daily linen service and earn bonus points while helping the planet.
              </p>
            </div>
          </div>
        </section>

        {/* Membership Tiers */}
        <section className="mt-16">
          <h2 className="text-2xl font-serif font-black text-slate-900">Membership Tiers</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            The more you stay, the brighter your path gets. See what each tier unlocks.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {tierCard(
              "Silver",
              "Base Tier",
              [
                "5% discount on all bookings",
                "Free high-speed WiFi",
              ],
              false,
              "Requirement: Join the program"
            )}
            {tierCard(
              "Gold",
              "Popular",
              [
                "10% discount on all bookings",
                "Complimentary room upgrades",
                "Welcome fruit platter",
              ],
              true,
              "Requirement: 5 stays per year"
            )}
            {tierCard(
              "Platinum",
              "VIP Elite",
              [
                "VIP lounge access",
                "Early check-in / Late check-out",
                "Dedicated concierge line",
              ],
              false,
              "Requirement: 15 stays per year"
            )}
          </div>
        </section>

        {/* Redemption System */}
        <section className="mt-16 mb-16">
          <h2 className="text-2xl font-serif font-black text-slate-900">Redemption System</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Turn your loyalty into experiences - redeem points for perks, upgrades, and exclusive access.
          </p>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] border border-slate-200 bg-[#0b1229] p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-300">Pay with Points</p>
                  <p className="mt-3 text-xl font-black">Redeem perks in a flash</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-lg font-black">Card</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Service Swaps</p>
                    <p className="text-xs text-slate-200">Breakfast for two</p>
                  </div>
                  <span className="text-xs font-black bg-[#bf9b30] px-3 py-1 rounded-full">50 pts</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Wellness Session</p>
                    <p className="text-xs text-slate-200">60-min Swedish Massage</p>
                  </div>
                  <span className="text-xs font-black bg-[#bf9b30] px-3 py-1 rounded-full">120 pts</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Exclusive Perks</p>
                    <p className="text-xs text-slate-200">Rooftop lounge voucher</p>
                  </div>
                  <span className="text-xs font-black bg-[#bf9b30] px-3 py-1 rounded-full">80 pts</span>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Exclusive 360 Tours</p>
                  <p className="mt-3 text-xl font-black">Member-Only Access</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-[#bf9b30]/10 flex items-center justify-center">
                  <span className="text-lg font-black">Lock</span>
                </div>
              </div>
              <p className="mt-6 text-sm text-slate-600">
                Unlock virtual tours of our presidential suites and curated experiences before you arrive. Available only for Gold tier and above.
              </p>
              <button
                type="button"
                onClick={() => navigate("/innova-suites")}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#bf9b30] px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-white hover:brightness-95"
              >
                Explore Collections
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
