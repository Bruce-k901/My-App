'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';

export interface ActivityItem {
  id: string;
  type: 'task_completed' | 'task_overdue' | 'incident' | 'stock_alert' | 'clock_in' | 'clock_out';
  title: string;
  detail?: string;
  severity?: string;
  timestamp: string;
  module: 'checkly' | 'stockly' | 'teamly' | 'assetly';
  href?: string;
}

export function useActivityFeed(limit = 15) {
  const { companyId, siteId } = useAppContext();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ companyId, limit: String(limit) });
      if (siteId && siteId !== 'all') params.set('siteId', siteId);

      const res = await fetch(`/api/activity?${params}`);
      if (!res.ok) throw new Error('Failed to fetch activity');

      const data = await res.json();
      setItems(data.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companyId, siteId, limit]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return { items, loading, error, refresh: fetchActivity };
}
