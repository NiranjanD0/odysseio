"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  animate?: boolean;
}

/**
 * Single skeleton placeholder with motion shimmer sweep
 */
export function Skeleton({
  className = "",
  animate = true,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[10px] bg-sage/30 dark:bg-sage/10",
        className
      )}
      style={style}
      {...props}
    >
      {animate && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent"
          animate={{ translateX: ["100%", "-100%"] }}
          transition={{
            repeat: Infinity,
            duration: 1.6,
            ease: "easeInOut",
          }}
        />
      )}
    </div>
  );
}

export const LoaderSkeleton = Skeleton;

/**
 * SkeletonReveal manages single-item load handoffs with zero layout shift
 */
interface SkeletonRevealProps {
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SkeletonReveal({
  loading,
  skeleton,
  children,
  className = "",
}: SkeletonRevealProps) {
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Pre-built Place Card Skeleton with motion shimmer
 */
export function PlaceCardSkeleton() {
  return (
    <div className="bg-white dark:bg-white/5 rounded-[20px] border border-border-theme overflow-hidden shadow-xs">
      <div className="flex items-center justify-between p-4 pb-2 border-b border-border-theme/40">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      </div>
    </div>
  );
}

/**
 * Pre-built Destination Card Skeleton with motion shimmer
 */
export function DestinationCardSkeleton() {
  return (
    <div className="bg-white dark:bg-white/5 rounded-[20px] border border-border-theme overflow-hidden shadow-xs">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
    </div>
  );
}

/**
 * Staggered list container for resolving feeds seamlessly
 */
export function SkeletonResolveList({
  count = 3,
  renderSkeleton,
  className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
}: {
  count?: number;
  renderSkeleton?: (index: number) => React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
        >
          {renderSkeleton ? renderSkeleton(i) : <PlaceCardSkeleton />}
        </motion.div>
      ))}
    </div>
  );
}
