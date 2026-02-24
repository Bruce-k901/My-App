'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BuildingAsset, FabricCategory } from '@/types/rm';

export interface BuildingAssetFormData {
  name: string;
  site_id: string;
  fabric_category: FabricCategory;
  fabric_subcategory: string;
  location_description?: string;
  condition_rating?: number;
  condition_notes?: string;
  install_year?: number;
  expected_life_years?: number;
  area_or_quantity?: string;
  inspection_frequency_months?: number;
  next_inspection_date?: string;
  maintenance_contractor_id?: string;
  emergency_contractor_id?: string;
  notes?: string;
}

export function useBuildingAssets(companyId: string | undefined, siteId?: string | null) {
  const [assets, setAssets] = useState<BuildingAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      setLoading(true);

      let query = supabase
        .from('building_assets')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('fabric_category')
        .order('name');

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) {
        // Table may not exist yet
        if (error.code === '42P01') {
          setAssets([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        setAssets([]);
        setLoading(false);
        return;
      }

      // Enrich with related names
      const siteIds = [...new Set(data.map(a => a.site_id).filter(Boolean))];
      const contractorIds = [...new Set([
        ...data.map(a => a.maintenance_contractor_id),
        ...data.map(a => a.emergency_contractor_id),
      ].filter(Boolean))];

      const [sitesResult, contractorsResult] = await Promise.all([
        siteIds.length > 0
          ? supabase.from('sites').select('id, name').in('id', siteIds)
          : { data: [] },
        contractorIds.length > 0
          ? supabase.from('contractors').select('id, name').in('id', contractorIds as string[])
          : { data: [] },
      ]);

      const sitesMap = new Map((sitesResult.data || []).map(s => [s.id, s.name]));
      const contractorsMap = new Map((contractorsResult.data || []).map(c => [c.id, c.name]));

      const enriched: BuildingAsset[] = data.map((a: any) => ({
        ...a,
        photos: a.photos || [],
        site_name: sitesMap.get(a.site_id) || null,
        maintenance_contractor_name: a.maintenance_contractor_id ? contractorsMap.get(a.maintenance_contractor_id) || null : null,
        emergency_contractor_name: a.emergency_contractor_id ? contractorsMap.get(a.emergency_contractor_id) || null : null,
      }));

      setAssets(enriched);
    } catch (err) {
      console.error('Error fetching building assets:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, siteId]);

  const createAsset = async (data: BuildingAssetFormData, userId: string) => {
    const { data: asset, error } = await supabase
      .from('building_assets')
      .insert({
        company_id: companyId,
        site_id: data.site_id,
        name: data.name,
        fabric_category: data.fabric_category,
        fabric_subcategory: data.fabric_subcategory,
        location_description: data.location_description || null,
        condition_rating: data.condition_rating || null,
        condition_notes: data.condition_notes || null,
        install_year: data.install_year || null,
        expected_life_years: data.expected_life_years || null,
        area_or_quantity: data.area_or_quantity || null,
        inspection_frequency_months: data.inspection_frequency_months || null,
        next_inspection_date: data.next_inspection_date || null,
        maintenance_contractor_id: data.maintenance_contractor_id || null,
        emergency_contractor_id: data.emergency_contractor_id || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchAssets();
    return asset;
  };

  const updateAsset = async (assetId: string, data: Partial<BuildingAssetFormData>) => {
    const updates: Record<string, any> = {};
    const fields: (keyof BuildingAssetFormData)[] = [
      'name', 'site_id', 'fabric_category', 'fabric_subcategory',
      'location_description', 'condition_rating', 'condition_notes',
      'install_year', 'expected_life_years', 'area_or_quantity',
      'inspection_frequency_months', 'next_inspection_date',
      'maintenance_contractor_id', 'emergency_contractor_id', 'notes',
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates[field] = data[field] || null;
      }
    }

    // Don't null out required fields
    if (data.name) updates.name = data.name;
    if (data.site_id) updates.site_id = data.site_id;
    if (data.fabric_category) updates.fabric_category = data.fabric_category;
    if (data.fabric_subcategory) updates.fabric_subcategory = data.fabric_subcategory;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('building_assets')
        .update(updates)
        .eq('id', assetId);
      if (error) throw error;
    }

    await fetchAssets();
  };

  const archiveAsset = async (assetId: string) => {
    const { error } = await supabase
      .from('building_assets')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', assetId);
    if (error) throw error;
    await fetchAssets();
  };

  return {
    assets,
    loading,
    fetchAssets,
    createAsset,
    updateAsset,
    archiveAsset,
  };
}
