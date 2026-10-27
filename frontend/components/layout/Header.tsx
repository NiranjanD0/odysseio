"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Compass, Map, Calendar, BookmarkCheck, Settings, Plus } from "lucide-react";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { CurtainLink } from "@/components/ui/page-curtains";

const NAV_ITEMS = [
  { name: "Explore", link: "/explore", icon: Compass },
  { name: "Plan", link: "/plan", icon: Map },
  { name: "Journeys", link: "/journeys", icon: Calendar },
  { name: "Saved", link: "/saved", icon: BookmarkCheck },
  { name: "Settings", link: "/settings", icon: Settings },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Navbar>
      {/* Desktop Navigation that dynamically shrinks & blurs into a floating pill on scroll */}
      <NavBody>
        <NavbarLogo />
        <NavItems items={NAV_ITEMS} />
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <ThemeSwitcher />
          <NavbarButton href="/plan" as={CurtainLink} variant="primary">
            <Plus size={13} />
            <span>New Trip</span>
          </NavbarButton>
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <div className="flex items-center gap-1.5">
            <ThemeSwitcher />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </div>
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          <div className="w-full flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.link);
              const Icon = item.icon;
              return (
                <CurtainLink
                  key={item.link}
                  href={item.link}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-forest text-white shadow-xs font-semibold"
                      : "text-text-muted hover:text-text hover:bg-sage/40"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </CurtainLink>
              );
            })}
          </div>

          <div className="pt-2 mt-1 border-t border-border-theme/60 w-full">
            <CurtainLink
              href="/plan"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-forest text-white text-sm font-semibold shadow-xs hover:bg-forest-dark transition-colors"
            >
              <Plus size={16} />
              <span>New Trip</span>
            </CurtainLink>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
