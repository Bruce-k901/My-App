'use client';

import useSWR from 'swr';
import { TrayLayoutResponse } from '@/types/planly';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export function useTrayLayout(date?: string, siteId?: string) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (siteId) params.set('siteId', siteId);

  const cacheKey = date && siteId ? `/api/planly/production-plan/tray-layout?${params.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR<TrayLayoutResponse>(cacheKey, fetcher);

  return {
    trayLayout: data,
    isLoading,
    error,
    refresh: () => mutate(),
  };
}
