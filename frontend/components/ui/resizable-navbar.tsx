"use client";

import React, { useState } from "react";
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

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 30) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <header className={cn("sticky inset-x-0 top-0 z-40 w-full transition-all duration-300", className)}>
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
        backdropFilter: visible ? "blur(14px)" : "blur(6px)",
        boxShadow: visible
          ? "0 10px 30px -10px rgba(49, 91, 72, 0.15), 0 0 0 1px rgba(49, 91, 72, 0.12)"
          : "none",
        width: visible ? "72%" : "100%",
        y: visible ? 8 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 35,
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between rounded-full px-5 py-2.5 transition-all duration-300 lg:flex border border-transparent",
        visible
          ? "bg-cream/95 dark:bg-neutral-900/95 border-border-theme shadow-md"
          : "bg-cream/80 dark:bg-neutral-950/80 border-b border-border-theme/40",
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
        "hidden flex-1 flex-row items-center justify-center space-x-1 text-sm font-medium transition duration-200 lg:flex",
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
              "relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors",
              active
                ? "text-forest font-bold dark:text-emerald-400"
                : "text-text-muted hover:text-text dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            {hovered === idx && (
              <motion.div
                layoutId="nav-hovered"
                className="absolute inset-0 h-full w-full rounded-full bg-sage/50 dark:bg-neutral-800 -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
              />
            )}
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-forest dark:bg-emerald-400" />
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
        backdropFilter: visible ? "blur(14px)" : "blur(6px)",
        boxShadow: visible
          ? "0 10px 30px -10px rgba(49, 91, 72, 0.15), 0 0 0 1px rgba(49, 91, 72, 0.12)"
          : "none",
        width: visible ? "94%" : "100%",
        y: visible ? 6 : 0,
        borderRadius: visible ? "20px" : "0px",
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 35,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full flex-col items-center justify-between px-4 py-2 lg:hidden transition-all duration-300",
        visible
          ? "bg-cream/95 dark:bg-neutral-900/95 border border-border-theme shadow-md"
          : "bg-cream/80 dark:bg-neutral-950/80 border-b border-border-theme/40",
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
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "w-full flex flex-col items-start justify-start gap-2 pt-4 pb-2 border-t border-border-theme mt-2",
            className
          )}
        >
          {children}
        </motion.div>
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
      className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-sage/40 transition-colors"
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
      className="relative z-20 mr-4 flex items-center space-x-2.5 px-1 py-1 font-serif text-xl tracking-tight text-forest dark:text-forest hover:opacity-85 transition-opacity"
      aria-label="ODYSSEIO Home"
    >
      <Image
        src="/apple-touch-icon.png"
        alt="ODYSSEIO Logo"
        width={36}
        height={36}
        className="rounded-lg object-contain w-8 h-8 sm:w-9 sm:h-9"
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
    "px-4 py-1.5 rounded-full text-xs font-semibold relative cursor-pointer hover:-translate-y-0.5 transition duration-200 inline-flex items-center justify-center gap-1.5";

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
