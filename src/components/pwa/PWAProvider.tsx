'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa';
import { InstallPrompt, PWAInstalledBadge } from './InstallPrompt';

export function PWAProvider() {
  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker();
  }, []);

  return (
    <>
      <InstallPrompt />
      <PWAInstalledBadge />
    </>
  );
}

