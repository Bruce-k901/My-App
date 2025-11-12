"use client";

// Dummy ToastProvider that logs to console instead of showing toasts
// This allows the codebase to compile while removing toast notifications
// Eventually all imports of this file should be removed

import { useCallback, useMemo } from "react";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  const showToast = useCallback((messageOrOptions: string | { title?: string; description?: string; type?: string }, type?: string) => {
    // Just log to console instead of showing toast
    if (typeof messageOrOptions === "string") {
      console.log(`[Toast ${type || 'info'}]:`, messageOrOptions);
    } else {
      const { title, description } = messageOrOptions;
      const logType = messageOrOptions.type || type || 'info';
      console.log(`[Toast ${logType}]:`, title ? `${title}${description ? ` - ${description}` : ''}` : description);
    }
  }, []);

  return useMemo(() => ({ showToast }), [showToast]);
}

