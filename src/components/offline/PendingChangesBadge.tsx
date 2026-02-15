/**
 * Pending Changes Badge
 * Shows count of pending offline writes (for header/nav)
 */

'use client';

import { useEffect, useState } from 'react';
import { CloudOff } from '@/components/ui/icons';
import { getPendingWriteCount } from '@/lib/offline/db';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export function PendingChangesBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function loadCount() {
      const pendingCount = await getPendingWriteCount();
      setCount(pendingCount);
    }

    loadCount();

    // Poll every 10 seconds
    const interval = setInterval(loadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <Link href="/dashboard/settings/sync">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-full transition-colors cursor-pointer group"
        >
          <CloudOff className="w-4 h-4 text-orange-500 group-hover:animate-pulse" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
            {count} pending
          </span>
        </motion.div>
      </AnimatePresence>
    </Link>
  );
}
