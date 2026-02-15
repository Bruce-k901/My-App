'use client';

import { useEffect } from 'react';

/**
 * Admin PWA Provider
 * Registers the admin-specific service worker for separate PWA installation
 */
export function AdminPWAProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if ('serviceWorker' in navigator) {
      // Register admin service worker
      navigator.serviceWorker
        .register('/admin-sw.js', { scope: '/admin/' })
        .then((registration) => {
          console.log('[Admin PWA] Admin Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[Admin PWA] New admin service worker available');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[Admin PWA] Admin Service Worker registration failed:', error);
        });

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[Admin PWA] Admin Service Worker controller changed');
      });
    } else {
      console.warn('[Admin PWA] Service Workers not supported');
    }
  }, []);

  return null;
}

