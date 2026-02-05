import useSWR, { mutate } from 'swr';
import { BaseDough, LaminationStyle } from '@/types/planly';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export interface BaseDoughWithCount extends BaseDough {
  product_count?: number;
}

export interface UseBaseDoughsOptions {
  includeStyles?: boolean;
  includeProducts?: boolean;
}

export function useBaseDoughs(siteId: string | null, options: UseBaseDoughsOptions = {}) {
  const { includeStyles = true, includeProducts = true } = options;

  const params = new URLSearchParams();
  if (siteId) params.append('siteId', siteId);
  if (includeStyles) params.append('includeStyles', 'true');
  if (includeProducts) params.append('includeProducts', 'true');

  const key = siteId ? `/api/planly/base-doughs?${params.toString()}` : null;

  const { data, error, isLoading, isValidating } = useSWR<BaseDoughWithCount[]>(key, fetcher);

  const createBaseDough = async (input: {
    name: string;
    recipe_id?: string | null;
    mix_lead_days?: number;
    batch_size_kg?: number | null;
    units_per_batch?: number | null;
  }) => {
    if (!siteId) return { error: 'No site selected' };

    const response = await fetch('/api/planly/base-doughs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, ...input }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create base dough' };
    }

    const newDough = await response.json();
    mutate(key);
    return newDough;
  };

  const updateBaseDough = async (id: string, updates: Partial<BaseDough>) => {
    const response = await fetch(`/api/planly/base-doughs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to update base dough' };
    }

    const updated = await response.json();
    mutate(key);
    return updated;
  };

  const deleteBaseDough = async (id: string) => {
    const response = await fetch(`/api/planly/base-doughs/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to delete base dough', product_count: errorData.product_count };
    }

    mutate(key);
    return { success: true };
  };

  return {
    baseDoughs: data || [],
    isLoading,
    isValidating,
    error,
    createBaseDough,
    updateBaseDough,
    deleteBaseDough,
    refresh: () => mutate(key),
  };
}

export function useBaseDough(id: string | null) {
  const { data, error, isLoading } = useSWR<BaseDough>(
    id ? `/api/planly/base-doughs/${id}` : null,
    fetcher
  );

  return {
    baseDough: data,
    isLoading,
    error,
  };
}
