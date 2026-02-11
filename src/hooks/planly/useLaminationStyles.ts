import useSWR, { mutate } from 'swr';
import { LaminationStyle } from '@/types/planly';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export interface LaminationStyleWithCount extends LaminationStyle {
  product_count?: number;
}

export interface UseLaminationStylesOptions {
  baseDoughId?: string | null;
  includeProducts?: boolean;
}

export function useLaminationStyles(options: UseLaminationStylesOptions = {}) {
  const { baseDoughId, includeProducts = true } = options;

  const params = new URLSearchParams();
  if (baseDoughId) params.append('baseDoughId', baseDoughId);
  if (includeProducts) params.append('includeProducts', 'true');

  const key = `/api/planly/lamination-styles?${params.toString()}`;

  const { data, error, isLoading, isValidating } = useSWR<LaminationStyleWithCount[]>(key, fetcher);

  const createLaminationStyle = async (input: {
    base_dough_id: string;
    name: string;
    recipe_id?: string | null;
    products_per_sheet: number;
    dough_per_sheet_g?: number | null;
    laminate_lead_days?: number;
  }) => {
    const response = await fetch('/api/planly/lamination-styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to create lamination style' };
    }

    const newStyle = await response.json();

    // Invalidate both the styles list and the parent base dough
    mutate(key);
    if (input.base_dough_id) {
      mutate(`/api/planly/base-doughs/${input.base_dough_id}`);
    }
    // Also invalidate the base doughs list to update counts
    mutate((k: string) => k?.startsWith('/api/planly/base-doughs'), undefined, { revalidate: true });

    return newStyle;
  };

  const updateLaminationStyle = async (id: string, updates: Partial<LaminationStyle>) => {
    const response = await fetch(`/api/planly/lamination-styles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to update lamination style' };
    }

    const updated = await response.json();
    mutate(key);
    return updated;
  };

  const deleteLaminationStyle = async (id: string) => {
    const response = await fetch(`/api/planly/lamination-styles/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error || 'Failed to delete lamination style', product_count: errorData.product_count };
    }

    mutate(key);
    // Also invalidate the base doughs list to update counts
    mutate((k: string) => k?.startsWith('/api/planly/base-doughs'), undefined, { revalidate: true });

    return { success: true };
  };

  return {
    laminationStyles: data || [],
    isLoading,
    isValidating,
    error,
    createLaminationStyle,
    updateLaminationStyle,
    deleteLaminationStyle,
    refresh: () => mutate(key),
  };
}

export function useLaminationStyle(id: string | null) {
  const { data, error, isLoading } = useSWR<LaminationStyle>(
    id ? `/api/planly/lamination-styles/${id}` : null,
    fetcher
  );

  return {
    laminationStyle: data,
    isLoading,
    error,
  };
}
