/**
 * Offline Assistant Banner
 * Shows when Opsly Assistant is unavailable offline
 */

'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Sparkles } from '@/components/ui/icons';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineAssistantBanner() {
  const { isOnline } = useOnlineStatus();
  const [mounted, setMounted] = useState(false);

  // Only render after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server or if online
  if (!mounted || isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="mb-6"
      >
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <WifiOff className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-semibold text-purple-300">
                  Assistant Unavailable Offline
                </h4>
              </div>
              <p className="text-xs text-purple-400 leading-relaxed">
                The Opsly Assistant requires an internet connection to provide AI-powered
                assistance. Your recent questions are cached below for reference.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Inline Assistant Unavailable Message
 * Can be used in the chat input area
 */
export function AssistantInputDisabled() {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm text-neutral-600 dark:text-neutral-400">
      <WifiOff className="w-4 h-4" />
      <span>Assistant requires internet connection</span>
    </div>
  );
}
