import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export function Card({ className, padding = "md", hover = false, ...props }: CardProps) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-7",
  };
  return (
    <div
      className={cn(
        "bg-white rounded-[20px] border border-border-theme",
        "shadow-[0_2px_12px_0_rgba(49,91,72,0.07)]",
        hover && "transition-shadow duration-200 hover:shadow-[0_6px_24px_0_rgba(49,91,72,0.13)] hover:-translate-y-0.5 cursor-pointer",
        paddings[padding],
        className
      )}
      {...props}
    />
  );
}
