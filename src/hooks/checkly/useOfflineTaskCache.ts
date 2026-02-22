/**
 * Offline Task Cache Hook
 * Caches today's tasks in IndexedDB for offline viewing
 */

'use client';

import { useState } from 'react';
import { cacheRead, getCachedRead } from '@/lib/offline/db';
import { useOnlineStatus, getRecommendedTTL } from '@/hooks/useOnlineStatus';

export interface CachedTaskData {
  tasks: any[];
  completedTasks: any[];
}

function buildCacheKey(companyId: string, siteId: string | null, date: string): string {
  const site = siteId || 'all';
  return `tasks:${companyId}:${site}:${date}`;
}

export function useOfflineTaskCache() {
  const { isOnline } = useOnlineStatus();
  const [isCachedData, setIsCachedData] = useState(false);

  async function cacheTasks(
    companyId: string,
    siteId: string | null,
    date: string,
    data: CachedTaskData
  ): Promise<void> {
    const key = buildCacheKey(companyId, siteId, date);
    try {
      await cacheRead(key, data, 'checkly', getRecommendedTTL());
    } catch (err) {
      console.warn('[OfflineTaskCache] Failed to cache:', err);
    }
  }

  async function getCachedTasks(
    companyId: string,
    siteId: string | null,
    date: string
  ): Promise<CachedTaskData | null> {
    const key = buildCacheKey(companyId, siteId, date);
    try {
      const cached = await getCachedRead(key);
      if (cached) {
        setIsCachedData(true);
        return cached as CachedTaskData;
      }
    } catch (err) {
      console.warn('[OfflineTaskCache] Failed to read cache:', err);
    }
    return null;
  }

  function markLiveData() {
    setIsCachedData(false);
  }

  return { isOnline, isCachedData, cacheTasks, getCachedTasks, markLiveData };
}
