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
    <footer className="border-t border-gray-100 bg-white py-8 text-gray-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
      <div className="mx-auto max-w-7xl px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-gray-100 pb-8 md:grid-cols-[1.4fr_0.9fr_0.9fr] dark:border-white/10">
          <div className="space-y-3">
            <Link to="/" className="flex w-fit items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-emerald-600 shadow-sm">
                <span className="text-[10px] font-black text-white">IA</span>
              </div>
              <h2 className="text-xl font-black tracking-tighter text-gray-900 dark:text-white">
                INNOVA-<span className="text-emerald-600">HMS</span>
              </h2>
            </Link>

            <p className="max-w-md text-sm font-bold leading-relaxed text-gray-500 dark:text-zinc-400">
              Smart hotel booking, room discovery, and guest support in one simple platform.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="w-fit border-b-2 border-emerald-600 pb-1 text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
              Navigation
            </h3>
            <ul className="space-y-3 text-sm font-bold">
              <li>
                <button
                  type="button"
                  onClick={() => scrollToHomeSection("hero")}
                  className="transition-colors hover:text-emerald-600"
                >
                  Home
                </button>
              </li>
              <li>
                <Link to="/features" className="transition-colors hover:text-emerald-600">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition-colors hover:text-emerald-600">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/vision-suites" className="transition-colors hover:text-emerald-600">
                  Vision Suites
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="w-fit border-b-2 border-emerald-600 pb-1 text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
              Contact
            </h3>
            <ul className="space-y-3 text-sm font-bold">
              <li>
                <a href="tel:+18005550199" className="transition-colors hover:text-emerald-600">
                  +1 (800) 555-0199
                </a>
              </li>
              <li>
                <a href="sms:+18005550199" className="transition-colors hover:text-emerald-600">
                  SMS Support
                </a>
              </li>
              <li>
                <a href="mailto:support@innova-hms.com" className="transition-colors hover:text-emerald-600">
                  support@innova-hms.com
                </a>
              </li>
              <li className="text-gray-600 dark:text-zinc-400">Metro Manila, Philippines</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 md:flex-row md:text-left">
          <p>
            Copyright {new Date().getFullYear()} <span className="text-emerald-600">INNOVA-HMS</span>. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/about" className="transition-colors hover:text-gray-900 dark:hover:text-white">
              About Us
            </Link>
            <Link to="/features" className="transition-colors hover:text-gray-900 dark:hover:text-white">
              Features
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}