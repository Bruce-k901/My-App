"use client";

// Dummy ToastProvider that logs to console instead of showing toasts
// This allows the codebase to compile while removing toast notifications
// Eventually all imports of this file should be removed

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  return {
    showToast: (messageOrOptions: string | { title?: string; description?: string; type?: string }, type?: string) => {
      // Just log to console instead of showing toast
      if (typeof messageOrOptions === "string") {
        console.log(`[Toast ${type || 'info'}]:`, messageOrOptions);
      } else {
        const { title, description } = messageOrOptions;
        const msg = title || description || '';
        const logType = messageOrOptions.type || type || 'info';
        console.log(`[Toast ${logType}]:`, title ? `${title}${description ? ` - ${description}` : ''}` : description);
      }
    }
  };
}

