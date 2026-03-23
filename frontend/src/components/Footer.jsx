import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToHomeSection = (sectionId) => {
    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="bg-white text-gray-700 py-10 border-t border-gray-100 dark:bg-zinc-950 dark:text-zinc-300 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <div className="w-6 h-6 bg-[#bf9b30] rounded-sm flex items-center justify-center shadow-sm">
                <span className="text-white text-[10px] font-black">IA</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tighter dark:text-white">
                INNOVA-<span className="text-[#bf9b30]">HMS</span>
              </h2>
            </Link>

            <p className="text-sm leading-relaxed font-bold text-gray-500 dark:text-zinc-400">
              Leading the transformation of hospitality through artificial intelligence and smart guest experiences.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest border-b-2 border-[#bf9b30] w-fit pb-1 dark:text-white">
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm font-bold">
              <li>
                <Link to="/about" className="hover:text-[#bf9b30] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToHomeSection("suites")}
                  className="hover:text-[#bf9b30] transition-colors"
                >
                  Rooms and Suites
                </button>
              </li>
              <li>
                <Link to="/vision-suites" className="hover:text-[#bf9b30] transition-colors">
                  Virtual 360 Tours
                </Link>
              </li>
              <li>
                <Link to="/facilities" className="hover:text-[#bf9b30] transition-colors">
                  Dining and Experiences
                </Link>
              </li>
              <li>
                <Link to="/rewards" className="hover:text-[#bf9b30] transition-colors">
                  Loyalty Portal
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest border-b-2 border-[#bf9b30] w-fit pb-1 dark:text-white">
              Contact and Support
            </h3>
            <ul className="space-y-3 text-sm font-bold">
              <li>
                <a href="mailto:support@innova-hms.com" className="hover:text-[#bf9b30] transition-colors">
                  support@innova-hms.com
                </a>
              </li>
              <li>
                <a href="tel:+18005550199" className="hover:text-[#bf9b30] transition-colors">
                  +1 (800) 555-0199
                </a>
              </li>
              <li className="text-gray-600 dark:text-zinc-400">1200 Smart Ave, Dubai UAE</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest border-b-2 border-[#bf9b30] w-fit pb-1 dark:text-white">
              Stay Alerted
            </h3>
            <p className="text-sm leading-relaxed font-bold text-gray-500 dark:text-zinc-400">
              Get instant notifications via email or SMS for price drops.
            </p>
            <div className="flex items-center gap-5">
              <a
                href="mailto:support@innova-hms.com?subject=Innova-HMS%20Updates"
                className="text-[#bf9b30] font-black text-[11px] uppercase tracking-tighter hover:scale-105 transition-transform"
              >
                Email
              </a>
              <a
                href="sms:+18005550199"
                className="text-gray-500 font-black text-[11px] uppercase tracking-tighter hover:text-[#bf9b30] transition-colors dark:text-zinc-400"
              >
                SMS
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black tracking-widest text-gray-400 uppercase">
          <p>
            Copyright {new Date().getFullYear()} <span className="text-[#bf9b30]">INNOVA-HMS</span>. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-gray-900 transition-colors dark:hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/features" className="hover:text-gray-900 transition-colors dark:hover:text-white">
              Terms of Service
            </Link>
            <button
              type="button"
              onClick={() => scrollToHomeSection("promotions")}
              className="hover:text-gray-900 transition-colors dark:hover:text-white"
            >
              Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
