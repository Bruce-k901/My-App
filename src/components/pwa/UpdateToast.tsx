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
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[9999] lg:bottom-4 animate-in slide-in-from-bottom-4 duration-300"
      style={{ bottom: 'calc(var(--bottom-tab-height, 3.5rem) + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-black/10 dark:border-slate-700 shadow-xl">
        <div className="w-8 h-8 rounded-lg bg-[#D37E91]/20 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-[#D37E91]" />
        </div>
        <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white whitespace-nowrap">
          A new version is available
        </span>
        <button
          onClick={handleUpdate}
          onTouchEnd={(e) => { e.preventDefault(); handleUpdate(); }}
          className="px-5 py-2.5 rounded-lg bg-[#D37E91] hover:bg-[#c06d7f] active:bg-[#b0607a] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer select-none"
        >
          Update
        </button>
        <button
          onClick={() => setVisible(false)}
          onTouchEnd={(e) => { e.preventDefault(); setVisible(false); }}
          className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
