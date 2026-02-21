'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, X } from '@/components/ui/icons';
import { activateWaitingWorker } from '@/lib/pwa';

export function UpdateToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);

    window.addEventListener('pwa-update-available', show);

    return () => {
      window.removeEventListener('pwa-update-available', show);
    };
  }, []);

  if (!visible) return null;

  const handleUpdate = () => {
    // Tell the waiting SW to activate — controllerchange listener in pwa.ts
    // will automatically reload the page once the new SW takes control
    activateWaitingWorker();
  };

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+0.5rem)] lg:bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-black/10 dark:border-slate-700 shadow-xl">
        <div className="w-8 h-8 rounded-lg bg-[#D37E91]/20 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-[#D37E91]" />
        </div>
        <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white whitespace-nowrap">
          A new version is available
        </span>
        <button
          onClick={handleUpdate}
          className="px-3 py-1.5 rounded-lg bg-[#D37E91] hover:bg-[#c06d7f] text-white text-sm font-medium transition-colors whitespace-nowrap"
        >
          Update
        </button>
        <button
          onClick={() => setVisible(false)}
          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
