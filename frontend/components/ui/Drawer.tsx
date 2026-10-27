"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "right" | "bottom";
}

export function Drawer({ open, onClose, title, children, side = "right" }: DrawerProps) {
  // Trap focus and close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isRight = side === "right";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden
          />
          {/* Panel */}
          <motion.aside
            key="panel"
            initial={isRight ? { x: "100%" } : { y: "100%" }}
            animate={isRight ? { x: 0 } : { y: 0 }}
            exit={isRight ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className={`fixed z-50 bg-white shadow-2xl flex flex-col ${
              isRight
                ? "top-0 right-0 h-full w-full max-w-md"
                : "bottom-0 left-0 right-0 rounded-t-[24px] max-h-[90vh]"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-theme shrink-0">
              <h2 className="font-semibold text-lg text-text">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-sage/50 transition-colors text-text-muted"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
