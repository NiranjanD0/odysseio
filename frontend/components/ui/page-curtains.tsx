"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

interface PageCurtainsContextValue {
  isTransitioning: boolean;
  triggerCurtain: (callback?: () => void) => void;
}

const PageCurtainsContext = createContext<PageCurtainsContextValue>({
  isTransitioning: false,
  triggerCurtain: () => {},
});

export function usePageCurtain() {
  return useContext(PageCurtainsContext);
}

function PathnameWatcher({
  onPathChange,
}: {
  onPathChange: (path: string) => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onPathChange(pathname);
  }, [pathname, onPathChange]);

  return null;
}

export function PageCurtains({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const previousPathRef = useRef<string | null>(null);

  const handlePathChange = useCallback(
    (pathname: string) => {
      if (previousPathRef.current !== null && previousPathRef.current !== pathname) {
        setIsTransitioning(true);

        const timer = setTimeout(() => {
          setDisplayChildren(children);
          setIsTransitioning(false);
        }, 320);

        previousPathRef.current = pathname;
        return () => clearTimeout(timer);
      }
      previousPathRef.current = pathname;
      setDisplayChildren(children);
    },
    [children]
  );

  const triggerCurtain = useCallback((callback?: () => void) => {
    setIsTransitioning(true);
    setTimeout(() => {
      callback?.();
      setTimeout(() => setIsTransitioning(false), 200);
    }, 280);
  }, []);

  return (
    <PageCurtainsContext.Provider value={{ isTransitioning, triggerCurtain }}>
      <Suspense fallback={null}>
        <PathnameWatcher onPathChange={handlePathChange} />
      </Suspense>
      <PageCurtainStage isTransitioning={isTransitioning}>
        {displayChildren}
      </PageCurtainStage>
    </PageCurtainsContext.Provider>
  );
}

export function PageCurtainStage({
  children,
  isTransitioning,
}: {
  children: React.ReactNode;
  isTransitioning?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Curtain Overlay */}
      <AnimatePresence mode="wait">
        {isTransitioning && (
          <motion.div
            key="curtain-wipe"
            aria-hidden="true"
            initial={{ scaleY: 0, transformOrigin: "bottom" }}
            animate={{ scaleY: 1, transformOrigin: "bottom" }}
            exit={{ scaleY: 0, transformOrigin: "top" }}
            transition={{
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="fixed inset-0 z-[9990] bg-forest text-cream flex items-center justify-center pointer-events-none shadow-2xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="font-serif text-2xl tracking-wide text-cream">
                ODYSSEIO
              </span>
              <span className="text-xs uppercase tracking-widest text-sage/80 font-medium">
                Every minute, a new story
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PageCurtainContent>{children}</PageCurtainContent>
    </div>
  );
}

export function PageCurtainContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.92, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex flex-col min-h-screen"
    >
      {children}
    </motion.div>
  );
}
