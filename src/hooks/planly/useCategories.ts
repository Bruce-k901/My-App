'use client';

import useSWR, { mutate } from 'swr';
import { PlanlyCategory } from '@/types/planly';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface CreateCategoryInput {
  site_id: string;
  name: string;
  base_prep_type?: string;
  description?: string;
  display_order?: number;
}

interface UpdateCategoryInput {
  name?: string;
  base_prep_type?: string;
  description?: string;
  display_order?: number;
}

export function useCategories(siteId?: string) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);

  const cacheKey = siteId ? `/api/planly/categories?${params.toString()}` : null;

  const { data, error, isLoading } = useSWR<PlanlyCategory[]>(cacheKey, fetcher);

  // Ensure data is always an array (API might return error object)
  const categoriesData = Array.isArray(data) ? data : [];

  const createCategory = async (input: CreateCategoryInput): Promise<PlanlyCategory | { error: string }> => {
    const res = await fetch('/api/planly/categories', {
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

  const updateCategory = async (
    id: string,
    updates: UpdateCategoryInput
  ): Promise<PlanlyCategory | { error: string }> => {
    const res = await fetch(`/api/planly/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const result = await res.json();

    if (res.ok) {
      mutate(cacheKey);
    }

    return result;
  };

  const deleteCategory = async (id: string): Promise<boolean | { error: string }> => {
    const res = await fetch(`/api/planly/categories/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      mutate(cacheKey);
      return true;
    }

    return res.json();
  };

  const checkLinkedProducts = async (id: string): Promise<number> => {
    const res = await fetch(`/api/planly/categories/${id}/linked-products`);
    if (res.ok) {
      const data = await res.json();
      return data.count || 0;
    }
    return 0;
  };

  return {
    categories: categoriesData,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    checkLinkedProducts,
    mutate: () => mutate(cacheKey),
  };
}
