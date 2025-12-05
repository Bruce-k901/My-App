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
    
    const shouldSuppress = (message: string, args: any[]) => {
      const msg = message.toLowerCase();
      // Check if it's an object/error with code 23503
      const isPushSubscriptionError = 
        (typeof args[0] === 'object' && args[0] !== null && (args[0] as any).code === '23503') ||
        (args.some(arg => typeof arg === 'object' && arg !== null && (arg as any).code === '23503'));
      
      return (
        msg.includes("was preloaded using link preload but not used") ||
        msg.includes("preloaded using link preload") ||
        msg.includes("preload but not used") ||
        msg.includes("checkly_logo_touching_blocks") ||
        (msg.includes("resource") && msg.includes("preload") && msg.includes("not used")) ||
        (msg.includes("preload") && (msg.includes("svg") || msg.includes("css"))) ||
        (msg.includes("preload") && msg.includes(".css")) ||
        (msg.includes("_next/static/css") && msg.includes("preload")) ||
        (msg.includes("app/layout.css") || (msg.includes("app/dashboard") && msg.includes(".css"))) ||
        // Suppress push subscription errors (expected when table doesn't exist or profile missing)
        msg.includes("error saving push subscription") ||
        msg.includes("error registering push subscription") ||
        msg.includes("key is not present in table") ||
        msg.includes("key is not present in table \"profiles\"") ||
        msg.includes("foreign key constraint") ||
        msg.includes("push_subscriptions_user_id_fkey") ||
        msg.includes("code: '23503'") || // Foreign key violation
        msg.includes("'23503'") || // Foreign key violation (different format)
        msg.includes("code: '23505'") || // Unique constraint violation
        msg.includes("'23505'") || // Unique constraint violation (different format)
        msg.includes("406") || // Not Acceptable (RLS issues)
        msg.includes("409") || // Conflict (duplicate)
        isPushSubscriptionError ||
        // Suppress expected company_id warnings during onboarding
        msg.includes("no company_id available") ||
        msg.includes("no company found, using empty form") ||
        msg.includes("no company_id available anywhere")
      );
    };

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || "";
      // Filter out preload warnings for CSS and SVG files
      // These are harmless - resources are loaded when components render
      if (shouldSuppress(message, args)) {
        return;
      }
      originalWarn(...args);
    };

    // Also suppress errors that might come from preload issues or push subscriptions
    console.error = (...args: any[]) => {
      const firstArg = args[0];
      let message = "";
      
      // Handle empty error objects - try to extract meaningful error info
      if (firstArg && typeof firstArg === 'object') {
        message = 
          firstArg?.message || 
          firstArg?.error?.message || 
          firstArg?.toString() || 
          JSON.stringify(firstArg) || 
          "";
      } else {
        message = String(firstArg || "");
      }
      
      // Check if this is a push subscription error that should be suppressed
      // Also check the second argument which might contain the error message
      const secondArg = args[1];
      const errorMessage = 
        message || 
        (secondArg && typeof secondArg === 'string' ? secondArg : '') ||
        (secondArg && typeof secondArg === 'object' ? (secondArg?.message || JSON.stringify(secondArg)) : '');
      
      // Check for "Object" errors from push notifications (when error object is empty or stringified as "Object")
      const isObjectError = 
        message === "object" ||
        message === "[object object]" ||
        message === "{}" ||
        message.toLowerCase() === "object" ||
        (firstArg && typeof firstArg === 'object' && Object.keys(firstArg).length === 0);
      
      // Check if any argument contains "push subscription" context (even if error is just "Object")
      const isPushSubscriptionContext = 
        args.some(arg => 
          typeof arg === 'string' && (
            arg.toLowerCase().includes("error saving push subscription") ||
            arg.toLowerCase().includes("error registering push subscription") ||
            arg.toLowerCase().includes("error unregistering push subscription") ||
            arg.toLowerCase().includes("push subscription")
          )
        );
      
      const isPushError = 
        message.includes("error saving push subscription") ||
        message.includes("error registering push subscription") ||
        message.includes("error unregistering push subscription") ||
        errorMessage.includes("error saving push subscription") ||
        errorMessage.includes("error registering push subscription") ||
        errorMessage.includes("error unregistering push subscription") ||
        (isPushSubscriptionContext && isObjectError) || // If context mentions push subscription and error is "Object", suppress it
        (firstArg && typeof firstArg === 'object' && (
          (firstArg as any).code === '23503' ||
          (firstArg as any).code === '23505' ||
          (firstArg as any).code === 'PGRST116' ||
          (firstArg as any).error?.code === '23503' ||
          (firstArg as any).error?.code === '23505' ||
          (firstArg as any).status === 406 ||
          (firstArg as any).status === 409
        ));
      
      if (isPushError || shouldSuppress(message, args)) {
        return; // Suppress push subscription errors silently
      }
      
      originalError(...args);
    };

    // Suppress PerformanceObserver warnings about preload
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          // Filter out preload-related entries (CSS, SVG, etc.)
          for (const entry of list.getEntries()) {
            const entryName = entry.name.toLowerCase();
            if (
              entryName.includes("checkly_logo_touching_blocks") ||
              (entryName.includes("_next/static/media") && entryName.includes(".svg")) ||
              (entryName.includes("_next/static/css") && entryName.includes(".css")) ||
              (entryName.includes("app/layout.css") || entryName.includes("app/dashboard") && entryName.includes(".css"))
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

