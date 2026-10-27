"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { cn } from "@/lib/utils";
import { CurtainLink } from "@/components/ui/page-curtains";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState<boolean>(false);

  // Check initial scroll on mount without triggering sync effect lint rule
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (scrollY.get() > 30) {
        setVisible(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollY]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 30) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <header
      className={cn(
        "sticky top-2 sm:top-3.5 inset-x-0 z-40 w-full px-3 sm:px-6 pointer-events-none transition-all duration-300",
        className
      )}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible }
            )
          : child
      )}
    </header>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        width: visible ? "min(900px, 92%)" : "min(1180px, 100%)",
        backdropFilter: visible ? "blur(18px)" : "blur(10px)",
        boxShadow: visible
          ? "0 14px 40px -10px rgba(49, 91, 72, 0.22), 0 0 0 1px rgba(49, 91, 72, 0.12)"
          : "0 4px 20px -4px rgba(49, 91, 72, 0.08), 0 0 0 1px rgba(49, 91, 72, 0.06)",
        paddingTop: visible ? "7px" : "10px",
        paddingBottom: visible ? "7px" : "10px",
        paddingLeft: visible ? "18px" : "24px",
        paddingRight: visible ? "18px" : "24px",
      }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 28,
      }}
      className={cn(
        "relative z-40 mx-auto hidden md:flex items-center justify-between rounded-full border transition-colors duration-200 pointer-events-auto",
        visible
          ? "bg-cream/95 dark:bg-neutral-900/95 border-border-theme shadow-md"
          : "bg-cream/80 dark:bg-neutral-950/80 border-border-theme/70 shadow-xs",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "hidden md:flex flex-1 items-center justify-center space-x-1 sm:space-x-1.5 text-sm font-medium transition duration-200",
        className
      )}
    >
      {items.map((item, idx) => {
        const active = pathname.startsWith(item.link);
        return (
          <CurtainLink
            key={`link-${idx}`}
            href={item.link}
            onMouseEnter={() => setHovered(idx)}
            onClick={onItemClick}
            className={cn(
              "relative px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors whitespace-nowrap",
              active
                ? "text-forest dark:text-emerald-400 bg-forest/10 dark:bg-emerald-500/15"
                : "text-text-muted hover:text-text dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            {hovered === idx && (
              <motion.div
                layoutId="nav-pill-hover"
                className="absolute inset-0 rounded-full bg-sage/40 dark:bg-neutral-800 -z-10"
                transition={{ type: "spring", bounce: 0.15, duration: 0.25 }}
              />
            )}
            <span className="relative z-20">{item.name}</span>
          </CurtainLink>
        );
      })}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        width: visible ? "min(480px, 94%)" : "100%",
        backdropFilter: visible ? "blur(18px)" : "blur(10px)",
        boxShadow: visible
          ? "0 12px 32px -8px rgba(49, 91, 72, 0.2), 0 0 0 1px rgba(49, 91, 72, 0.12)"
          : "0 4px 16px -4px rgba(49, 91, 72, 0.08), 0 0 0 1px rgba(49, 91, 72, 0.06)",
        paddingTop: visible ? "6px" : "8px",
        paddingBottom: visible ? "6px" : "8px",
      }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 28,
      }}
      className={cn(
        "relative z-40 mx-auto flex md:hidden w-full items-center justify-between px-4 rounded-full border transition-colors duration-200 pointer-events-auto",
        visible
          ? "bg-cream/95 dark:bg-neutral-900/95 border-border-theme"
          : "bg-cream/85 dark:bg-neutral-950/85 border-border-theme/70",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop click dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs md:hidden"
          />
          {/* Dropdown Card */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={cn(
              "absolute top-[calc(100%+8px)] inset-x-0 z-50 flex w-full flex-col items-start justify-start gap-1 rounded-2xl bg-cream/95 dark:bg-neutral-900/95 p-3.5 backdrop-blur-xl border border-border-theme shadow-2xl",
              className
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-full text-text-muted hover:text-text hover:bg-sage/40 transition-colors"
      aria-label="Toggle navigation menu"
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  );
};

export const NavbarLogo = () => {
  return (
    <CurtainLink
      href="/"
      className="relative z-20 flex shrink-0 items-center space-x-2 py-0.5 font-serif text-lg tracking-tight text-forest dark:text-forest hover:opacity-85 transition-opacity"
      aria-label="ODYSSEIO Home"
    >
      <Image
        src="/apple-touch-icon.png"
        alt="ODYSSEIO Logo"
        width={32}
        height={32}
        className="rounded-lg object-contain w-7 h-7 sm:w-8 sm:h-8"
        priority
      />
      <span className="font-semibold tracking-wider text-base sm:text-lg">ODYSSEIO</span>
    </CurtainLink>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-flex items-center justify-center gap-1.5 shrink-0";

  const variantStyles = {
    primary: "bg-forest text-white hover:bg-forest-dark shadow-xs",
    secondary: "bg-transparent text-text-muted hover:text-text hover:bg-sage/40 border border-border-theme",
    dark: "bg-black text-white hover:bg-neutral-800",
    gradient: "bg-gradient-to-r from-forest to-forest-dark text-white shadow-xs",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
