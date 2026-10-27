"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Map, Compass, Calendar, BookmarkCheck, Settings, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

const NAV_LINKS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/plan", label: "Plan", icon: Map },
  { href: "/journeys", label: "Journeys", icon: Calendar },
  { href: "/saved", label: "Saved", icon: BookmarkCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-md border-b border-border-theme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-serif text-xl text-forest hover:opacity-80 transition-opacity"
            aria-label="ODYSSEIO home"
          >
            <span className="text-2xl">✦</span>
            <span>ODYSSEIO</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 rounded-[12px] text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-forest text-white"
                      : "text-text-muted hover:text-text hover:bg-sage/50"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-2.5">
            <ThemeSwitcher />
            <Link
              href="/plan"
              className="hidden sm:inline-flex items-center gap-2 bg-forest text-white px-4 py-2 rounded-[12px] text-sm font-medium hover:bg-forest-dark transition-colors"
            >
              Plan adventure
            </Link>
            <button
              className="md:hidden p-2 rounded-[10px] text-text-muted hover:bg-sage/50 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed top-16 inset-x-0 z-20 bg-cream border-b border-border-theme overflow-hidden"
          >
            <nav className="flex flex-col gap-1 p-4" role="navigation" aria-label="Mobile">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all ${
                      active
                        ? "bg-forest text-white"
                        : "text-text hover:bg-sage/50"
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
              <Link
                href="/plan"
                onClick={() => setMobileOpen(false)}
                className="mt-2 flex items-center justify-center gap-2 bg-forest text-white px-4 py-3 rounded-[12px] text-sm font-medium hover:bg-forest-dark transition-colors"
              >
                Plan my adventure
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
