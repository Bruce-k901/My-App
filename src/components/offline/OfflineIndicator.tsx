/**
 * Offline Indicator Component
 * Shows when offline or when syncing pending changes
 */

'use client';

import { useState, useEffect } from 'react';
import { WifiOff, CloudOff, Check } from '@/components/ui/icons';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOnlineStatus();
  const [mounted, setMounted] = useState(false);

  // Only render after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server or if online with no pending changes
  if (!mounted || (isOnline && pendingCount === 0)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50"
        data-testid="offline-indicator"
      >
        <div
          className={`
            ${!isOnline ? 'bg-orange-500/90' : 'bg-emerald-500/90'}
            backdrop-blur-sm text-theme-primary px-4 py-2 rounded-full shadow-lg
            flex items-center gap-2 text-sm font-medium
            border-2 ${!isOnline ? 'border-orange-300/30' : 'border-emerald-300/30'}
          `}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Working Offline</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {pendingCount} pending
                </span>
              )}
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <CloudOff className="w-4 h-4" />
              </motion.div>
              <span>
                Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...
              </span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Sync Success Toast Component
 * Can be used to show success after sync completes
 */
export function SyncSuccessToast({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed top-20 right-4 z-50"
      data-testid="sync-success-toast"
    >
      <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <Check className="w-5 h-5" />
        <div>
          <p className="font-medium">All changes synced</p>
          <p className="text-xs text-emerald-100">Your data is up to date</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-theme-tertiary hover:text-white transition-colors"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}
