/**
 * Dashboard Data Cache
 * 
 * Provides persistent caching for dashboard data across navigations.
 * This prevents full page reloads when navigating between dashboard pages.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number; // milliseconds
}

class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultStaleTime = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if it exists and is not stale
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isStale = Date.now() - entry.timestamp > entry.staleTime;
    if (isStale) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, staleTime?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime: staleTime || this.defaultStaleTime,
    });
  }

  /**
   * Check if data exists and is fresh
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isStale = Date.now() - entry.timestamp > entry.staleTime;
    if (isStale) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      staleTime: entry.staleTime,
      isStale: now - entry.timestamp > entry.staleTime,
    }));

    return {
      totalEntries: this.cache.size,
      entries,
    };
  }
}

// Singleton instance - persists across navigations
export const dashboardCache = new DashboardCache();

/**
 * Helper function to create cache keys
 */
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}|${sortedParams}`;
}

/**
 * React Query configuration for dashboard pages
 * Use this in your useQuery hooks for consistent caching
 */
export const dashboardQueryConfig = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  refetchOnWindowFocus: false, // Don't refetch when user returns to tab
  refetchOnMount: false, // Don't refetch on component mount if data is fresh
  refetchOnReconnect: true, // Refetch if connection is restored
};



