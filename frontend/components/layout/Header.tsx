"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Map, Compass, Calendar, BookmarkCheck, Settings, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { CurtainLink } from "@/components/ui/page-curtains";

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
      <header className="sticky top-0 z-30 bg-cream/80 dark:bg-cream/80 backdrop-blur-md border-b border-border-theme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <CurtainLink
            href="/"
            className="flex items-center gap-2.5 font-serif text-xl tracking-tight text-forest dark:text-forest hover:opacity-85 transition-opacity"
            aria-label="ODYSSEIO home"
          >
            <Image
              src="/apple-touch-icon.png"
              alt="ODYSSEIO logo"
              width={32}
              height={32}
              className="rounded-lg object-contain w-8 h-8"
              priority
            />
            <span className="font-semibold tracking-wider">ODYSSEIO</span>
          </CurtainLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1.5" role="navigation" aria-label="Main">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <CurtainLink
                  key={href}
                  href={href}
                  className={`px-3.5 py-1.5 rounded-[12px] text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-forest text-white shadow-xs"
                      : "text-text-muted hover:text-text hover:bg-sage/40 dark:hover:bg-sage/20"
                  }`}
                >
                  {label}
                </CurtainLink>
              );
            })}
          </nav>

          {/* Theme switcher + mobile toggle */}
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
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
            className="md:hidden fixed top-16 inset-x-0 z-20 bg-cream dark:bg-cream border-b border-border-theme overflow-hidden shadow-xl"
          >
            <nav className="flex flex-col gap-1.5 p-4" role="navigation" aria-label="Mobile">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <CurtainLink
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all ${
                      active
                        ? "bg-forest text-white shadow-xs"
                        : "text-text hover:bg-sage/40 dark:hover:bg-sage/20"
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </CurtainLink>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
