"use client";

import { useEffect } from "react";

/**
 * Suppresses noisy console warnings in development mode
 * Filters out preload warnings for CSS and SVG files (harmless - resources loaded when needed)
 */
export function SuppressConsoleWarnings() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    // Suppress preload warnings (harmless - resources are loaded when components render)
    const originalWarn = console.warn;
    const originalError = console.error;
    
    const shouldSuppress = (message: string) => {
      const msg = message.toLowerCase();
      return (
        msg.includes("was preloaded using link preload but not used") ||
        msg.includes("preloaded using link preload") ||
        msg.includes("preload but not used") ||
        msg.includes("checkly_logo_touching_blocks") ||
        (msg.includes("preload") && msg.includes("svg"))
      );
    };

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || "";
      // Filter out preload warnings for CSS and SVG files
      // These are harmless - resources are loaded when components render
      if (shouldSuppress(message)) {
        return;
      }
      originalWarn(...args);
    };

    // Also suppress errors that might come from preload issues
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || "";
      if (shouldSuppress(message)) {
        return;
      }
      originalError(...args);
    };

    // Suppress PerformanceObserver warnings about preload
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          // Filter out preload-related entries
          for (const entry of list.getEntries()) {
            if (
              entry.name.includes("checkly_logo_touching_blocks") ||
              (entry.name.includes("_next/static/media") && entry.name.includes(".svg"))
            ) {
              // Suppress by not logging these entries
              return;
            }
          }
        });
        
        // Only observe resource timing if available
        if ("observe" in observer) {
          observer.observe({ entryTypes: ["resource"] });
        }
      } catch (e) {
        // PerformanceObserver might not support all entry types, ignore
      }
    }

    // Cleanup on unmount
    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return null;
}

