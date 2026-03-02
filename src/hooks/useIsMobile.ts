"use client";

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 1024; // lg breakpoint - matches Tailwind

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check initial state
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    setIsHydrated(true);

    // Listen for resize events
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMobile, isHydrated };
}

/**
 * Returns true when viewport is tablet-landscape size (1024px–1279px).
 * At this range the desktop layout renders but space is tight.
 */
export function useIsTablet() {
  return useMediaQuery('(min-width: 1024px) and (max-width: 1279px)');
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
