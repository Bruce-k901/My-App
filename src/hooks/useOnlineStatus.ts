/**
 * Online Status Hook
 * Tracks network connectivity with iOS Safari polling fallback
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAllPendingWrites } from '@/lib/offline/db';

export interface OnlineStatusState {
  isOnline: boolean;
  hasBackgroundSync: boolean;
  pendingCount: number;
}

/**
 * Hook to track online/offline status
 * - Listens to browser online/offline events
 * - Implements 30s polling for iOS Safari (no Background Sync support)
 * - Tracks pending write count for UI indicators
 */
export function useOnlineStatus() {
  // Always start with true to avoid hydration mismatch
  // Will update to actual status after mount
  const [isOnline, setIsOnline] = useState(true);

  const [hasBackgroundSync] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      'serviceWorker' in navigator &&
      'sync' in ServiceWorkerRegistration.prototype
    );
  });

  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const writes = await getAllPendingWrites();
      setPendingCount(writes.length);
    } catch (error) {
      console.error('[useOnlineStatus] Failed to load pending writes:', error);
    }
  }, []);

  // Trigger manual sync (for iOS Safari polling)
  const triggerManualSync = useCallback(async () => {
    try {
      // Trigger sync via API route
      const response = await fetch('/api/offline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await updatePendingCount();
      }
    } catch (error) {
      // Silently fail - will retry on next poll
      console.debug('[useOnlineStatus] Manual sync failed:', error);
    }
  }, [updatePendingCount]);

  useEffect(() => {
    // Set initial online status from navigator on mount
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    // Handle online/offline events
    const handleOnline = () => {
      console.log('[useOnlineStatus] Network online');
      setIsOnline(true);

      // Trigger sync immediately when coming online
      if (hasBackgroundSync && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('sync' in registration) {
            registration.sync.register('sync-offline-writes');
          }
        });
      } else {
        // Manual sync for iOS Safari
        triggerManualSync();
      }
    };

    const handleOffline = () => {
      console.log('[useOnlineStatus] Network offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count on mount
    updatePendingCount();

    // iOS Safari polling fallback (no Background Sync support)
    if (!hasBackgroundSync && isOnline) {
      let interval: NodeJS.Timeout;

      const startPolling = () => {
        console.log('[useOnlineStatus] Starting iOS Safari polling (30s interval)');

        interval = setInterval(async () => {
          // Only poll when page visible (battery optimization)
          if (document.visibilityState === 'visible') {
            await triggerManualSync();
          }
        }, 30000); // 30s for iOS battery preservation
      };

      const stopPolling = () => {
        if (interval) {
          console.log('[useOnlineStatus] Stopping iOS Safari polling');
          clearInterval(interval);
        }
      };

      // Handle visibility changes
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          startPolling();
          // Sync immediately when tab becomes visible
          triggerManualSync();
        } else {
          stopPolling();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Start polling if page is visible
      if (document.visibilityState === 'visible') {
        startPolling();
      }

      return () => {
        stopPolling();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline, hasBackgroundSync, triggerManualSync, updatePendingCount]);

  return {
    isOnline,
    hasBackgroundSync,
    pendingCount,
    refreshPendingCount: updatePendingCount,
    triggerManualSync
  };
}

/**
 * Detect if running on iOS Safari
 */
export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua); // Not Chrome on iOS
  const notFirefox = !/FxiOS/.test(ua); // Not Firefox on iOS

  return iOS && webkit && notChrome && notFirefox;
}

/**
 * Get recommended TTL for caching based on device
 * iOS Safari gets shorter TTL due to stricter storage limits
 */
export function getRecommendedTTL(): number {
  if (isIOSSafari()) {
    return 12 * 60 * 60 * 1000; // 12 hours on iOS
  }
  return 24 * 60 * 60 * 1000; // 24 hours elsewhere
}
