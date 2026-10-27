import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
    const variants = {
      primary:
        "bg-forest text-white hover:bg-forest-dark shadow-sm",
      secondary:
        "bg-white text-forest border border-border-theme hover:bg-sage/40 shadow-sm",
      ghost:
        "bg-transparent text-text-muted hover:bg-sage/50 hover:text-text",
      danger:
        "bg-red-100 text-red-700 hover:bg-red-200",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-sm rounded-[10px]",
      md: "px-5 py-2.5 text-sm rounded-[12px]",
      lg: "px-7 py-3.5 text-base rounded-[14px]",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
