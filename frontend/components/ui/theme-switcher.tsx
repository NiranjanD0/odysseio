"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

interface ThemeSwitcherProps {
  className?: string;
  variant?: "compact" | "segmented";
}

const emptySubscribe = () => () => {};

export function ThemeSwitcher({
  className = "",
  variant = "compact",
}: ThemeSwitcherProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-full bg-border-theme/40 animate-pulse ${className}`}
        aria-hidden="true"
      />
    );
  }

  const currentTheme = theme || "system";

  if (variant === "segmented") {
    return (
      <div
        role="radiogroup"
        aria-label="Theme switcher"
        className={`inline-flex items-center p-1 rounded-full bg-sage/30 dark:bg-white/5 border border-border-theme text-xs font-medium text-text-muted ${className}`}
      >
        <button
          type="button"
          role="radio"
          aria-checked={currentTheme === "system"}
          onClick={() => setTheme("system")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
            currentTheme === "system"
              ? "bg-forest text-white shadow-xs font-semibold"
              : "hover:text-text"
          }`}
        >
          <Laptop size={14} />
          <span>System</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={currentTheme === "light"}
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
            currentTheme === "light"
              ? "bg-forest text-white shadow-xs font-semibold"
              : "hover:text-text"
          }`}
        >
          <Sun size={14} />
          <span>Light</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={currentTheme === "dark"}
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
            currentTheme === "dark"
              ? "bg-forest text-white shadow-xs font-semibold"
              : "hover:text-text"
          }`}
        >
          <Moon size={14} />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  // Compact cycling toggle
  const nextTheme =
    currentTheme === "system"
      ? "light"
      : currentTheme === "light"
      ? "dark"
      : "system";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-white/10 border border-border-theme text-text hover:bg-sage/40 dark:hover:bg-sage/20 transition-colors shadow-xs ${className}`}
      title={`Theme: ${currentTheme} (click to switch to ${nextTheme})`}
      aria-label={`Toggle theme, current is ${currentTheme}`}
    >
      {currentTheme === "system" && <Laptop size={15} className="text-text" />}
      {currentTheme === "light" && <Sun size={15} className="text-amber-500" />}
      {currentTheme === "dark" && <Moon size={15} className="text-emerald-400" />}
    </button>
  );
}
