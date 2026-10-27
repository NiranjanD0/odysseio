import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "info" | "category";
  colorClass?: string; // for category colours
}

export function Badge({
  className,
  variant = "default",
  colorClass,
  children,
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full leading-none";
  const variants: Record<string, string> = {
    default: "bg-sage text-forest",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-lavender text-indigo-700",
    category: colorClass ?? "bg-sage text-forest",
  };

  return (
    <span
      className={cn(base, variant === "category" ? colorClass ?? "" : variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
