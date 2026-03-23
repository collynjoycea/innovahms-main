import React from 'react';

export default function Footer() {
  return (
    // Ginawang py-10 mula sa py-16 para mabawasan ang laki ng white part
    <footer className="bg-white text-gray-700 py-10 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-8">
        
        {/* Main Grid: Ginawang mb-12 mula sa mb-20 para mas compact */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#bf9b30] rounded-sm flex items-center justify-center shadow-sm">
                 <span className="text-white text-[10px] font-black">IA</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tighter">
                INNOVA-<span className="text-[#bf9b30]">HMS</span>
              </h2>
            </div>
            <p className="text-sm leading-relaxed font-bold text-gray-500">
              Leading the transformation of hospitality through artificial intelligence and smart guest experiences.
            </p>
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:border-[#bf9b30] transition-all cursor-pointer group">
                  <div className="w-3 h-3 bg-gray-400 rounded-sm group-hover:bg-[#bf9b30] transition-colors"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest border-b-2 border-[#bf9b30] w-fit pb-1">
              Quick Links
            </h3>
            <ul className="space-y-3 text-sm font-bold">
              <li className="hover:text-[#bf9b30] cursor-pointer transition-colors">Rooms & Suites</li>
              <li className="hover:text-[#bf9b30] cursor-pointer transition-colors">Virtual 360° Tours</li>
              <li className="hover:text-[#bf9b30] cursor-pointer transition-colors">Dining & Experiences</li>
              <li className="hover:text-[#bf9b30] cursor-pointer transition-colors">Loyalty Portal</li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-4">
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest border-b-2 border-[#bf9b30] w-fit pb-1">
              Contact & Support
            </h3>
            <ul className="space-y-3 text-sm font-bold">
              <li className="flex items-center gap-3">
                <span className="text-[#bf9b30] font-black">✉</span> support@innova-hms.com
              </li>
              <li className="flex items-center gap-3">
                <span className="text-[#bf9b30] font-black">📞</span> +1 (800) 555-0199
              </li>
              <li className="flex items-center gap-3">
                <span className="text-[#ff4d6d] font-black">📍</span> <span className="text-gray-600">1200 Smart Ave, Dubai UAE</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Stay Alerted */}
          <div className="space-y-4">
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest border-b-2 border-[#bf9b30] w-fit pb-1">
              Stay Alerted
            </h3>
            <p className="text-sm leading-relaxed font-bold text-gray-500">
              Get instant notifications via Email or SMS for price drops.
            </p>
            <div className="flex items-center gap-5">
               <button className="flex items-center gap-2 text-[#bf9b30] font-black text-[11px] uppercase tracking-tighter hover:scale-105 transition-transform">
                 <span className="text-base">✉</span> EMAIL
               </button>
               <button className="flex items-center gap-2 text-gray-500 font-black text-[11px] uppercase tracking-tighter hover:text-[#bf9b30] transition-colors">
                 <span className="text-lg">💬</span> SMS
               </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Mas maliit na padding sa taas (pt-6) */}
        <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black tracking-widest text-gray-400 uppercase">
          <p>© {new Date().getFullYear()} <span className="text-[#bf9b30]">INNOVA-HMS</span>. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Cookies</span>
          </div>
        </div>

      </div>
    </footer>
  );
}