import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Crown, Gift, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fallbackOffers = [
  {
    id: "priv-early-access",
    badge: "Members First",
    title: "Early Access Rates",
    desc: "See premium room deals before they are released to regular guest traffic.",
    value: "20%",
    valueLabel: "member savings",
  },
  {
    id: "priv-room-upgrade",
    badge: "Stay Bonus",
    title: "Priority Upgrade Window",
    desc: "Eligible stays can unlock complimentary upgrade review before check-in.",
    value: "VIP",
    valueLabel: "upgrade lane",
  },
  {
    id: "priv-rewards",
    badge: "Loyalty Perk",
    title: "Reward Points Boost",
    desc: "Earn additional points on selected bookings and seasonal room packages.",
    value: "2x",
    valueLabel: "points boost",
  },
];

const privilegeHighlights = [
  {
    icon: <Crown size={18} className="text-[#bf9b30]" />,
    title: "Member-only offers",
    desc: "Exclusive rates and curated perks reserved for signed-in Innova-HMS guests.",
  },
  {
    icon: <Gift size={18} className="text-[#bf9b30]" />,
    title: "Stay upgrades",
    desc: "Access bonus room inclusions, added amenities, and limited-time gift perks.",
  },
  {
    icon: <ShieldCheck size={18} className="text-[#bf9b30]" />,
    title: "Priority support",
    desc: "Faster support handling and more tailored assistance during your booking flow.",
  },
];

export default function Privileges() {
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState(null);
  const [offers, setOffers] = useState(fallbackOffers);

  useEffect(() => {
    const loadSessionUser = () => {
      const raw = localStorage.getItem("user") || localStorage.getItem("customerSession");
      if (!raw) {
        setSessionUser(null);
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        setSessionUser(parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed);
      } catch {
        setSessionUser(null);
      }
    };

    loadSessionUser();
    window.addEventListener("userUpdated", loadSessionUser);
    window.addEventListener("storage", loadSessionUser);

    return () => {
      window.removeEventListener("userUpdated", loadSessionUser);
      window.removeEventListener("storage", loadSessionUser);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadOffers = async () => {
      try {
        const response = await fetch("/api/guest-offers");
        const payload = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(payload) || payload.length === 0 || !mounted) return;

        const nextOffers = payload.slice(0, 3).map((offer, index) => ({
          id: offer.id || `privilege-offer-${index}`,
          badge: offer.badge_text || "Featured Privilege",
          title: offer.title || "Member Offer",
          desc: offer.description || "Unlock a better rate and upgraded booking benefits.",
          value:
            Number(offer.discount_percentage || 0) > 0
              ? `${Number(offer.discount_percentage)}%`
              : "VIP",
          valueLabel:
            Number(offer.discount_percentage || 0) > 0 ? "member savings" : "exclusive rate",
        }));

        setOffers(nextOffers);
      } catch {
        // Keep fallback offers for a stable public page experience.
      }
    };

    loadOffers();
    return () => {
      mounted = false;
    };
  }, []);

  const handlePrimaryAction = () => {
    if (sessionUser?.id) {
      navigate("/offers?view=privileged");
      return;
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen text-[#1a160d] dark:bg-[#0d0c0a] dark:text-[#ebe3d1]">
      <section className="relative flex min-h-[52vh] items-center overflow-hidden border-b border-[#eadfc9] bg-[#1a160d] px-6 py-16 dark:border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(191,155,48,0.28),transparent_30%),linear-gradient(135deg,rgba(13,12,10,0.82),rgba(30,25,17,0.68),rgba(13,12,10,0.88))]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#f1d27b]">
              <Star size={12} />
              Member Privileges
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] text-white md:text-6xl">
              Premium benefits for every smarter stay.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/82 md:text-base">
              Explore the added value of booking with an Innova-HMS account, from member pricing to faster support and better room perks.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="inline-flex items-center gap-2 rounded-full bg-[#bf9b30] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-[#a8872a]"
              >
                {sessionUser?.id ? "Open Privileged Offers" : "Sign In to Unlock"}
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/vision-suites")}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-white/15"
              >
                Find a Room
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f1d27b]">Included Benefits</p>
            <div className="mt-5 space-y-4">
              {privilegeHighlights.map((item) => (
                <div key={item.title} className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      {item.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">{item.title}</h3>
                      <p className="mt-1 text-sm text-white/70">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#bf9b30]">Curated Offers</p>
            <h2 className="mt-3 text-3xl font-black text-[#1a160d] dark:text-white md:text-5xl">
              Privileged booking collection
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-[#6e624f] dark:text-[#baad91]">
            These perks are designed to reward returning guests and make each reservation more flexible, personal, and valuable.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {offers.map((offer, index) => (
            <motion.article
              key={offer.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="rounded-[1.8rem] border border-[#e6d9bf] bg-white p-7 shadow-[0_18px_48px_rgba(80,58,18,0.09)] dark:border-white/10 dark:bg-[#14120e]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-[#ead9b4] bg-[#fcf6e8] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#9b7619] dark:border-white/10 dark:bg-white/5 dark:text-[#e6d7b8]">
                  {offer.badge}
                </span>
                <span className="text-3xl font-black tracking-tight text-[#bf9b30]">{offer.value}</span>
              </div>
              <h3 className="mt-6 text-2xl font-black text-[#1a160d] dark:text-white">{offer.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#726654] dark:text-[#c5b79d]">{offer.desc}</p>
              <div className="mt-8 flex items-center justify-between border-t border-[#efe3cb] pt-5 dark:border-white/10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a7241] dark:text-[#d9cca9]">
                  {offer.valueLabel}
                </span>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d8c79d] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8f732d] transition-all hover:bg-[#f7f0df] dark:border-white/10 dark:text-[#eadcbf] dark:hover:bg-white/5"
                >
                  {sessionUser?.id ? "Claim" : "Unlock"}
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2.2rem] border border-[#e6d8bb] bg-gradient-to-r from-[#fff8e9] via-[#f8f1e1] to-[#f3e8c8] p-8 shadow-[0_18px_45px_rgba(80,58,18,0.08)] dark:border-white/10 dark:bg-[#14120e]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#bf9b30]">Ready to Unlock</p>
              <h3 className="mt-3 text-3xl font-black text-[#1a160d] dark:text-white">Make every stay work harder for you.</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6d614d] dark:text-[#bcaf95]">
                Access your member view, or browse rooms first and come back once you are ready to claim your privileges.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="inline-flex items-center gap-2 rounded-full bg-[#bf9b30] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-[#a8872a]"
              >
                <Sparkles size={14} />
                {sessionUser?.id ? "Open Benefits" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/customer/bookings")}
                className="inline-flex items-center gap-2 rounded-full border border-[#d9ca9f] px-6 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#8f732d] transition-all hover:bg-[#fbf4e4] dark:border-white/10 dark:text-[#e8dcc1] dark:hover:bg-white/5"
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
