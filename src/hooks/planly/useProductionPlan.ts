'use client';

import useSWR, { mutate } from 'swr';
import { ProductionPlan } from '@/types/planly';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProductionPlan(date?: string, siteId?: string) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (siteId) params.set('siteId', siteId);

  const cacheKey = date && siteId ? `/api/planly/production-plan?${params.toString()}` : null;

  const { data, error, isLoading } = useSWR<ProductionPlan>(cacheKey, fetcher);

  const refresh = () => {
    if (cacheKey) {
      mutate(cacheKey);
    }
  };

  return {
    plan: data,
    isLoading,
    error,
    refresh,
  };
}

// Helper functions for date navigation
export function getDateRange(days: number = 7): string[] {
  const today = new Date();
  const dates: string[] = [];

  for (let i = -days; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[date.getDay()];
  const dayNum = date.getDate().toString().padStart(2, '0');
  const monthName = months[date.getMonth()];

  return `${dayName} ${dayNum}-${monthName}`;
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}
