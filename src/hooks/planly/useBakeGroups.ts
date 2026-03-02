'use client';

import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useBakeGroups(siteId?: string) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);

  const cacheKey = siteId ? `/api/planly/bake-groups?${params.toString()}` : null;

  const { data, error, isLoading } = useSWR(cacheKey, fetcher);

  const createGroup = async (input: {
    site_id: string;
    name: string;
    priority?: number;
  }) => {
    const res = await fetch('/api/planly/bake-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      mutate(cacheKey);
    }

    return res.json();
  };

  const updateGroup = async (groupId: string, updates: {
    name?: string;
    priority?: number;
    capacity_profile?: string | null;
  }) => {
    const res = await fetch(`/api/planly/bake-groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      mutate(cacheKey);
    }

    return res.json();
  };

  const deleteGroup = async (groupId: string) => {
    const res = await fetch(`/api/planly/bake-groups/${groupId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      mutate(cacheKey);
      // Also refresh products since they may have been unassigned
      if (siteId) {
        mutate(`/api/planly/products?siteId=${siteId}&archived=false`);
      }
    }

    return res.ok;
  };

  const addProductToGroup = async (productId: string, groupId: string) => {
    const res = await fetch(`/api/planly/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bake_group_id: groupId }),
    });

    if (res.ok && siteId) {
      mutate(`/api/planly/products?siteId=${siteId}&archived=false`);
    }

    return res.ok;
  };

  const removeProductFromGroup = async (productId: string) => {
    const res = await fetch(`/api/planly/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bake_group_id: null }),
    });

    if (res.ok && siteId) {
      mutate(`/api/planly/products?siteId=${siteId}&archived=false`);
    }

    return res.ok;
  };

  return {
    groups: data,
    isLoading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addProductToGroup,
    removeProductFromGroup,
  };
}
