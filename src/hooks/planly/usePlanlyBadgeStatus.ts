'use client';

import useSWR from 'swr';
import type { PlanlyBadgeData } from '@/types/planly';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook to fetch Planly badge status for a single ingredient
 */
export function usePlanlyBadgeStatus(ingredientId?: string, siteId?: string) {
  const params = new URLSearchParams();
  if (ingredientId) params.set('ingredientId', ingredientId);
  if (siteId) params.set('siteId', siteId);

  const cacheKey = ingredientId
    ? `/api/planly/badge-status?${params.toString()}`
    : null;

  const { data, error, isLoading } = useSWR<PlanlyBadgeData>(cacheKey, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    badgeData: data,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch Planly badge status for multiple ingredients at once
 * Returns a map of ingredient ID -> badge data
 */
export function usePlanlyBadgeStatusBulk(ingredientIds?: string[], siteId?: string) {
  const params = new URLSearchParams();
  if (ingredientIds && ingredientIds.length > 0) {
    params.set('ingredientIds', ingredientIds.join(','));
  }
  if (siteId) params.set('siteId', siteId);

  const cacheKey =
    ingredientIds && ingredientIds.length > 0
      ? `/api/planly/badge-status?${params.toString()}`
      : null;

  const { data, error, isLoading } = useSWR<Record<string, PlanlyBadgeData>>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    statusMap: data || {},
    isLoading,
    error,
  };
}
