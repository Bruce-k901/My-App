'use client';

import useSWR, { mutate } from 'swr';
import { ProcessingGroup, RoundingMethod, LeftoverHandling } from '@/types/planly';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface CreateProcessingGroupInput {
  company_id: string;
  site_id?: string;
  name: string;
  base_prep_recipe_id: string;
  batch_size_kg: number;
  units_per_batch: number;
  sheet_yield_kg?: number | null;
  laminated_sheet_recipe_id?: string | null;
  production_plan_label?: string | null;
  rounding_method?: RoundingMethod;
  leftover_handling?: LeftoverHandling;
  process_template_id?: string | null;
  sop_id?: string | null;
  description?: string | null;
  display_order?: number;
}

interface UpdateProcessingGroupInput {
  name?: string;
  base_prep_recipe_id?: string;
  batch_size_kg?: number;
  units_per_batch?: number;
  sheet_yield_kg?: number | null;
  laminated_sheet_recipe_id?: string | null;
  production_plan_label?: string | null;
  rounding_method?: RoundingMethod;
  leftover_handling?: LeftoverHandling | null;
  process_template_id?: string | null;
  sop_id?: string | null;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export function useProcessingGroups(siteId?: string, options?: { includeCompanyWide?: boolean }) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (options?.includeCompanyWide) params.set('includeCompanyWide', 'true');

  const cacheKey = siteId ? `/api/planly/processing-groups?${params.toString()}` : null;

  const { data, error, isLoading } = useSWR<ProcessingGroup[]>(cacheKey, fetcher);

  // Ensure data is always an array (API might return error object)
  const processingGroupsData = Array.isArray(data) ? data : [];

  const createProcessingGroup = async (input: CreateProcessingGroupInput): Promise<ProcessingGroup | { error: string }> => {
    const res = await fetch('/api/planly/processing-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const result = await res.json();

    if (res.ok) {
      mutate(cacheKey);
    }

    return result;
  };

  const updateProcessingGroup = async (
    id: string,
    updates: UpdateProcessingGroupInput
  ): Promise<ProcessingGroup | { error: string }> => {
    const res = await fetch(`/api/planly/processing-groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const result = await res.json();

    if (res.ok) {
      mutate(cacheKey);
    }

    return result;
  };

  const deleteProcessingGroup = async (id: string): Promise<boolean | { error: string }> => {
    const res = await fetch(`/api/planly/processing-groups/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      mutate(cacheKey);
      return true;
    }

    return res.json();
  };

  const checkLinkedProducts = async (id: string): Promise<number> => {
    const res = await fetch(`/api/planly/processing-groups/${id}/linked-products`);
    if (res.ok) {
      const data = await res.json();
      return data.count || 0;
    }
    return 0;
  };

  return {
    processingGroups: processingGroupsData,
    isLoading,
    error,
    createProcessingGroup,
    updateProcessingGroup,
    deleteProcessingGroup,
    checkLinkedProducts,
    mutate: () => mutate(cacheKey),
  };
}

// Hook to fetch a single processing group
export function useProcessingGroup(id?: string) {
  const cacheKey = id ? `/api/planly/processing-groups/${id}` : null;

  const { data, error, isLoading, mutate: refresh } = useSWR<ProcessingGroup>(cacheKey, fetcher);

  return {
    processingGroup: data,
    isLoading,
    error,
    refresh,
  };
}
