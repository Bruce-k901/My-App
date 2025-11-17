"use client";

import { useEffect } from "react";

/**
 * Suppresses noisy console warnings in development mode
 * Specifically filters out CSS preload warnings that are harmless HMR artifacts
 */
export function SuppressConsoleWarnings() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    // Suppress CSS preload warnings (harmless HMR artifacts)
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || "";
      // Filter out CSS preload warnings
      if (message.includes("was preloaded using link preload but not used")) {
        return;
      }
      originalWarn(...args);
    };

    // Cleanup on unmount
    return () => {
      console.warn = originalWarn;
    };
  }, []);

  return null;
}

