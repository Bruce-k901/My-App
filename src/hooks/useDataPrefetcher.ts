import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface PrefetchOptions {
  priority?: 'high' | 'medium' | 'low';
  delay?: number;
  staleTime?: number; // Time in ms before data is considered stale
}

interface CacheEntry {
  data: any;
  timestamp: number;
  staleTime: number;
}

export function useDataPrefetcher() {
  const cache = useRef(new Map<string, CacheEntry>());
  const prefetchTimeouts = useRef(new Map<string, NodeJS.Timeout>());

  const getCacheKey = useCallback((table: string, filters: Record<string, any> = {}) => {
    return `${table}:${JSON.stringify(filters)}`;
  }, []);

  const isStale = useCallback((entry: CacheEntry) => {
    return Date.now() - entry.timestamp > entry.staleTime;
  }, []);

  const prefetchData = useCallback(async (
    table: string,
    select: string = '*',
    filters: Record<string, any> = {},
    options: PrefetchOptions = {}
  ) => {
    const { priority: _priority = 'medium', delay = 0, staleTime = 5 * 60 * 1000 } = options; // 5 min default
    const cacheKey = getCacheKey(table, { select, ...filters });

    // Check if we have fresh cached data
    const cached = cache.current.get(cacheKey);
    if (cached && !isStale(cached)) {
      return cached.data;
    }

    // Clear existing timeout for this query
    const existingTimeout = prefetchTimeouts.current.get(cacheKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const fetchData = async () => {
      try {
        let query = supabase.from(table).select(select);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (key === 'order') {
            const [column, ascending] = value.split(':');
            query = query.order(column, { ascending: ascending === 'asc' });
          } else if (key === 'limit') {
            query = query.limit(value);
          } else if (key === 'range') {
            const [from, to] = value;
            query = query.range(from, to);
          } else {
            query = query.eq(key, value);
          }
        });

        const { data, error } = await query;
        
        if (error) {
          console.warn(`Failed to prefetch ${table}:`, error);
          return null;
        }

        // Cache the result
        cache.current.set(cacheKey, {
          data,
          timestamp: Date.now(),
          staleTime,
        });

        prefetchTimeouts.current.delete(cacheKey);
        return data;
      } catch (error) {
        console.warn(`Failed to prefetch ${table}:`, error);
        return null;
      }
    };

    if (delay > 0) {
      const timeout = setTimeout(fetchData, delay);
      prefetchTimeouts.current.set(cacheKey, timeout);
      return null;
    } else {
      return await fetchData();
    }
  }, [getCacheKey, isStale]);

  const getCachedData = useCallback((
    table: string,
    select: string = '*',
    filters: Record<string, any> = {}
  ) => {
    const cacheKey = getCacheKey(table, { select, ...filters });
    const cached = cache.current.get(cacheKey);
    
    if (cached && !isStale(cached)) {
      return cached.data;
    }
    
    return null;
  }, [getCacheKey, isStale]);

  const prefetchDashboardData = useCallback(async (companyId?: string, siteId?: string) => {
    const baseFilters = companyId ? { company_id: companyId } : {};
    const siteFilters = siteId ? { ...baseFilters, site_id: siteId } : baseFilters;

    // Prefetch common dashboard data with staggered delays
    const prefetchTasks = [
      // High priority - immediate
      { table: 'tasks', filters: { ...siteFilters, status: 'pending', limit: 10 }, delay: 0 },
      { table: 'incident_reports', filters: { ...baseFilters, limit: 5, order: 'created_at:desc' }, delay: 50 },
      
      // Medium priority - slight delay
      { table: 'assets', filters: { ...siteFilters, limit: 20 }, delay: 100 },
      { table: 'breakdowns', filters: { ...baseFilters, status: 'open', limit: 10 }, delay: 150 },
      
      // Low priority - longer delay
      { table: 'ppm_schedules', filters: siteFilters, delay: 200 },
      { table: 'notifications', filters: { ...baseFilters, limit: 10, order: 'created_at:desc' }, delay: 250 },
    ];

    prefetchTasks.forEach(({ table, filters, delay }) => {
      prefetchData(table, '*', filters, { delay, priority: delay === 0 ? 'high' : 'medium' });
    });
  }, [prefetchData]);

  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      // Clear entries matching pattern
      for (const [key] of cache.current) {
        if (key.includes(pattern)) {
          cache.current.delete(key);
        }
      }
    } else {
      // Clear all cache
      cache.current.clear();
    }
  }, []);

  // Cleanup function to clear timeouts
  useEffect(() => {
    return () => {
      const timeouts = prefetchTimeouts.current;
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  // Auto-cleanup stale cache entries every 10 minutes
  useEffect(() => {
    const cleanup = setInterval(() => {
      for (const [key, entry] of cache.current) {
        if (isStale(entry)) {
          cache.current.delete(key);
        }
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(cleanup);
  }, [isStale]);

  return {
    prefetchData,
    getCachedData,
    prefetchDashboardData,
    clearCache,
  };
}