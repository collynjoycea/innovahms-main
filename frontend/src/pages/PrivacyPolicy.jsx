import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, LockKeyhole, Database, BellRing } from "lucide-react";

const policySections = [
  {
    title: "Information We Collect",
    icon: <Database size={16} className="text-[#bf9b30]" />,
    points: [
      "Account details like full name, email address, and contact number.",
      "Booking and reservation records for customer and hotel management workflows.",
      "System activity logs used for security, auditing, and service improvement.",
    ],
  },
  {
    title: "How We Use Information",
    icon: <ShieldCheck size={16} className="text-[#bf9b30]" />,
    points: [
      "To provide core hotel management and guest services inside INNOVA-HMS.",
      "To personalize recommendations, loyalty features, and customer support experience.",
      "To monitor platform reliability, prevent abuse, and maintain operational integrity.",
    ],
  },
  {
    title: "Security and Protection",
    icon: <LockKeyhole size={16} className="text-[#bf9b30]" />,
    points: [
      "Authentication controls and role-based access are enforced across system modules.",
      "Sensitive account actions are validated before profile or password updates.",
      "Only authorized personnel can access protected administrative and operational data.",
    ],
  },
  {
    title: "Notifications and Integrations",
    icon: <BellRing size={16} className="text-[#bf9b30]" />,
    points: [
      "Email and SMS alerts are used for booking and account related communications.",
      "Map, AI, and analytics integrations are used strictly for operational features.",
      "Third-party services are connected only to support agreed system functionality.",
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#f6f1e5] dark:bg-[#0d0c0a] text-[#1a160d] dark:text-[#e8e2d5] transition-colors duration-300">
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[#bf9b30] text-xs font-black uppercase tracking-widest hover:opacity-80"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>

        <div className="rounded-3xl border border-[#e7dcc6] dark:border-white/10 bg-white/85 dark:bg-[#14130f] p-8 md:p-10 shadow-[0_20px_45px_rgba(191,155,48,0.12)] dark:shadow-none">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#bf9b30]">Legal and Compliance</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-black uppercase tracking-tight">
            Privacy <span className="text-[#bf9b30]">& Policy</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-[#6f6452] dark:text-gray-400 max-w-3xl">
            This page explains how INNOVA-HMS collects, processes, protects, and stores information within the system.
            By using this platform, users acknowledge and agree to these privacy and data handling practices.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            {policySections.map((section) => (
              <article
                key={section.title}
                className="rounded-2xl border border-[#eadfc9] dark:border-white/10 bg-[#fffaf0] dark:bg-[#1a1915] p-5"
              >
                <div className="flex items-center gap-2">
                  {section.icon}
                  <h2 className="text-sm font-black uppercase tracking-wider">{section.title}</h2>
                </div>
                <ul className="mt-4 space-y-2">
                  {section.points.map((item) => (
                    <li key={item} className="text-xs leading-relaxed text-[#6f6452] dark:text-gray-400">
                      - {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-[#d7c79f] dark:border-[#bf9b30]/30 bg-[#bf9b30]/10 px-5 py-4">
            <p className="text-[11px] font-semibold text-[#5c4a1d] dark:text-[#d9c89d] leading-relaxed">
              Last updated: March 20, 2026. For questions about privacy requests or data concerns, contact your system
              administrator or official INNOVA-HMS support channels.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
