'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { registerServiceWorker } from '@/lib/pwa';
import { InstallPrompt } from './InstallPrompt';

export function PWAProvider() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Register main app service worker for all routes (including admin)
    // The main service worker handles both main app and admin routes
    registerServiceWorker();
  }, []); // Empty deps - only register once

  // Don't show install prompt on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <InstallPrompt />;
}

