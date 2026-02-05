'use client';

import useSWR, { mutate } from 'swr';
import { EquipmentType, CapacityProfile } from '@/types/planly';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface CreateEquipmentTypeInput {
  company_id: string;
  site_id?: string | null;
  name: string;
  default_capacity: number;
  description?: string;
  display_order?: number;
  capacity_profiles?: CapacityProfile[];
}

interface UpdateEquipmentTypeInput {
  name?: string;
  default_capacity?: number;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  capacity_profiles?: CapacityProfile[];
}

export function useEquipmentTypes(siteId?: string | null, options?: { includeCompanyWide?: boolean }) {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (options?.includeCompanyWide) params.set('includeCompanyWide', 'true');

  const cacheKey = siteId ? `/api/planly/equipment-types?${params.toString()}` : null;

  const { data, error, isLoading } = useSWR<EquipmentType[]>(cacheKey, fetcher);

  // Ensure data is always an array (API might return error object)
  const equipmentTypesData = Array.isArray(data) ? data : [];

  const createEquipmentType = async (input: CreateEquipmentTypeInput): Promise<EquipmentType | { error: string }> => {
    const res = await fetch('/api/planly/equipment-types', {
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

  const updateEquipmentType = async (
    id: string,
    updates: UpdateEquipmentTypeInput
  ): Promise<EquipmentType | { error: string }> => {
    const res = await fetch(`/api/planly/equipment-types/${id}`, {
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

  const deleteEquipmentType = async (id: string): Promise<boolean | { error: string }> => {
    const res = await fetch(`/api/planly/equipment-types/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      mutate(cacheKey);
      return true;
    }

    return res.json();
  };

  const checkLinkedProducts = async (id: string): Promise<number> => {
    const res = await fetch(`/api/planly/equipment-types/${id}/linked-products`);
    if (res.ok) {
      const data = await res.json();
      return data.count || 0;
    }
    return 0;
  };

  return {
    equipmentTypes: equipmentTypesData,
    isLoading,
    error,
    createEquipmentType,
    updateEquipmentType,
    deleteEquipmentType,
    checkLinkedProducts,
    mutate: () => mutate(cacheKey),
  };
}
