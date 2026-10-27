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
import Link, { LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

// Order of main routes in the navigation bar to determine directional sweep
export const NAV_ROUTE_ORDER: Record<string, number> = {
  "/": 0,
  "/explore": 1,
  "/plan": 2,
  "/adventure": 3,
  "/journeys": 4,
  "/saved": 5,
  "/settings": 6,
};

export function getRouteIndex(path: string): number {
  if (path === "/") return 0;
  for (const [route, idx] of Object.entries(NAV_ROUTE_ORDER)) {
    if (route !== "/" && path.startsWith(route)) {
      return idx;
    }
  }
  return 1;
}

export type CurtainDirection = "forward" | "backward"; // forward: right-to-left wipe; backward: left-to-right wipe

interface PageCurtainsContextValue {
  isTransitioning: boolean;
  direction: CurtainDirection;
  navigateTo: (href: string) => void;
}

const PageCurtainsContext = createContext<PageCurtainsContextValue>({
  isTransitioning: false,
  direction: "forward",
  navigateTo: () => {},
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
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<CurtainDirection>("forward");
  const [displayChildren, setDisplayChildren] = useState(children);

  const currentPathRef = useRef<string>("/");
  const isNavigatingRef = useRef(false);

  const handlePathChange = useCallback(
    (newPath: string) => {
      // If path changed without our navigateTo (e.g. browser back/forward)
      if (
        !isNavigatingRef.current &&
        currentPathRef.current !== newPath &&
        currentPathRef.current !== "/"
      ) {
        const fromIdx = getRouteIndex(currentPathRef.current);
        const toIdx = getRouteIndex(newPath);
        setDirection(toIdx >= fromIdx ? "forward" : "backward");
        setIsTransitioning(true);

        const timer = setTimeout(() => {
          setDisplayChildren(children);
          setIsTransitioning(false);
        }, 320);

        currentPathRef.current = newPath;
        return () => clearTimeout(timer);
      }

      currentPathRef.current = newPath;
      setDisplayChildren(children);
    },
    [children]
  );

  // Controlled transition: Start curtain -> switch route while covered -> reveal new page
  const navigateTo = useCallback(
    (targetHref: string) => {
      if (isNavigatingRef.current || targetHref === currentPathRef.current) return;
      isNavigatingRef.current = true;

      const fromIdx = getRouteIndex(currentPathRef.current);
      const toIdx = getRouteIndex(targetHref);
      const dir: CurtainDirection = toIdx >= fromIdx ? "forward" : "backward";
      setDirection(dir);
      setIsTransitioning(true);

      // Phase 1: Let curtain slide in and fully cover the viewport
      setTimeout(() => {
        // Phase 2: Switch the route while screen is 100% masked
        router.push(targetHref);

        // Phase 3: Reveal the new page by sliding curtain away
        setTimeout(() => {
          setIsTransitioning(false);
          isNavigatingRef.current = false;
        }, 300);
      }, 280);
    },
    [router]
  );

  return (
    <PageCurtainsContext.Provider value={{ isTransitioning, direction, navigateTo }}>
      <Suspense fallback={null}>
        <PathnameWatcher onPathChange={handlePathChange} />
      </Suspense>
      <PageCurtainStage isTransitioning={isTransitioning} direction={direction}>
        {displayChildren}
      </PageCurtainStage>
    </PageCurtainsContext.Provider>
  );
}

export function PageCurtainStage({
  children,
  isTransitioning,
  direction = "forward",
}: {
  children: React.ReactNode;
  isTransitioning?: boolean;
  direction?: CurtainDirection;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Direction-Aware Horizontal Curtain Overlay */}
      <AnimatePresence mode="wait">
        {isTransitioning && (
          <motion.div
            key="curtain-wipe"
            aria-hidden="true"
            initial={{
              x: direction === "forward" ? "100%" : "-100%",
            }}
            animate={{
              x: "0%",
            }}
            exit={{
              x: direction === "forward" ? "-100%" : "100%",
            }}
            transition={{
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="fixed inset-0 z-[9990] bg-forest text-cream flex items-center justify-center pointer-events-none shadow-2xl border-x border-sage/20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-2.5 px-6 text-center select-none"
            >
              <div className="w-9 h-9 rounded-full border border-sage/40 flex items-center justify-center text-sage text-sm font-serif">
                ✦
              </div>
              <span className="font-serif text-2xl sm:text-3xl tracking-[0.2em] text-cream">
                ODYSSEIO
              </span>
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-sage/80 font-medium">
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
    <div className="flex-1 flex flex-col min-h-screen transition-opacity duration-200">
      {children}
    </div>
  );
}

/**
 * Enhanced Link that triggers the directional curtain transition smoothly
 */
interface CurtainLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>, LinkProps {
  children: React.ReactNode;
  className?: string;
}

export function CurtainLink({
  href,
  children,
  onClick,
  ...props
}: CurtainLinkProps) {
  const { navigateTo } = usePageCurtain();
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (typeof href === "string" && (href.startsWith("http") || href.startsWith("#"))) return;
    if (typeof href === "string" && pathname === href) return;

    e.preventDefault();
    if (typeof href === "string") {
      navigateTo(href);
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
