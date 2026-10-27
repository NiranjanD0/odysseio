"use client";

import { CurtainLink } from "@/components/ui/page-curtains";

const YEAR = 2026;

export function Footer() {
  const year = YEAR;
  return (
    <footer className="mt-auto bg-forest text-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center gap-2 font-serif text-xl text-white">
            <span>✦</span>
            <span>ODYSSEIO</span>
          </div>
          <p className="text-sm leading-relaxed max-w-xs text-white/70">
            Your intelligent city-exploration companion. Plan time-aware adventures and discover the world, one minute at a time.
          </p>
          <p className="text-xs text-white/50 italic">Every minute, a new story.</p>
        </div>

        {/* Explore */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Explore</h3>
          <ul className="space-y-2 text-sm">
            {[
              { href: "/explore", label: "Discover Places" },
              { href: "/plan", label: "Plan Adventure" },
              { href: "/journeys", label: "My Journeys" },
              { href: "/saved", label: "Saved Places" },
            ].map(({ href, label }) => (
              <li key={href}>
                <CurtainLink href={href} className="hover:text-white transition-colors">
                  {label}
                </CurtainLink>
              </li>
            ))}
          </ul>
        </div>

        {/* About */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">About</h3>
          <ul className="space-y-2 text-sm">
            <li><CurtainLink href="/settings" className="hover:text-white transition-colors">Settings</CurtainLink></li>
            <li>
              <span className="text-white/50 text-xs bg-white/10 px-2 py-1 rounded-full">
                Frontend Demo — Mock Data
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">
        © {year} ODYSSEIO. Crafted with care. · Frontend demo — no backend connected.
      </div>
    </footer>
  );
}
