'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { registerServiceWorker } from '@/lib/pwa';
import { InstallPrompt } from './InstallPrompt';

export function PWAProvider() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Skip registration on admin routes - admin has its own service worker
    if (pathname?.startsWith('/admin')) {
      return;
    }
    
    // Register main app service worker
    registerServiceWorker();
  }, [pathname]);

  // Don't show install prompt on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <InstallPrompt />;
}

