'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PPMGroup, PPMGroupAsset, PPMGroupFormData } from '@/types/ppm';

export function usePPMGroups(companyId: string | undefined, siteId?: string | null) {
  const [groups, setGroups] = useState<PPMGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      setLoading(true);

      let query = supabase
        .from('ppm_groups')
        .select('*, sites(name)')
        .eq('company_id', companyId)
        .order('name');

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch asset counts and asset details per group
      const groupIds = (data || []).map((g: any) => g.id);
      let assetRows: any[] = [];
      if (groupIds.length > 0) {
        const { data: junctionData } = await supabase
          .from('ppm_group_assets')
          .select('id, ppm_group_id, asset_id, added_at, assets(name, category)')
          .in('ppm_group_id', groupIds);
        assetRows = junctionData || [];
      }

      const mapped: PPMGroup[] = (data || []).map((g: any) => {
        const groupAssets = assetRows
          .filter((r: any) => r.ppm_group_id === g.id)
          .map((r: any) => ({
            id: r.id,
            ppm_group_id: r.ppm_group_id,
            asset_id: r.asset_id,
            asset_name: r.assets?.name || 'Unknown',
            asset_category: r.assets?.category || null,
            added_at: r.added_at,
          }));
        return {
          id: g.id,
          company_id: g.company_id,
          site_id: g.site_id,
          site_name: g.sites?.name || null,
          name: g.name,
          description: g.description,
          ppm_contractor_id: g.ppm_contractor_id,
          ppm_contractor_name: g.ppm_contractor_name,
          ppm_frequency_months: g.ppm_frequency_months,
          last_service_date: g.last_service_date,
          next_service_date: g.next_service_date,
          ppm_status: g.ppm_status,
          created_by: g.created_by,
          created_at: g.created_at,
          updated_at: g.updated_at,
          asset_count: groupAssets.length,
          assets: groupAssets,
        };
      });

      setGroups(mapped);
    } catch (err) {
      console.error('Error fetching PPM groups:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, siteId]);

  const createGroup = async (data: PPMGroupFormData, userId: string) => {
    const { data: group, error } = await supabase
      .from('ppm_groups')
      .insert({
        company_id: companyId,
        site_id: data.site_id,
        name: data.name,
        description: data.description || null,
        ppm_contractor_id: data.ppm_contractor_id || null,
        ppm_contractor_name: data.ppm_contractor_name || null,
        ppm_frequency_months: data.ppm_frequency_months,
        next_service_date: data.next_service_date || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert junction rows (trigger auto-syncs assets.ppm_group_id)
    if (data.asset_ids.length > 0) {
      const junctionRows = data.asset_ids.map(assetId => ({
        ppm_group_id: group.id,
        asset_id: assetId,
      }));
      const { error: jErr } = await supabase
        .from('ppm_group_assets')
        .insert(junctionRows);
      if (jErr) throw jErr;
    }

    await fetchGroups();
    return group;
  };

  const updateGroup = async (groupId: string, data: Partial<PPMGroupFormData>) => {
    const updates: Record<string, any> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description || null;
    if (data.ppm_contractor_id !== undefined) updates.ppm_contractor_id = data.ppm_contractor_id || null;
    if (data.ppm_contractor_name !== undefined) updates.ppm_contractor_name = data.ppm_contractor_name || null;
    if (data.ppm_frequency_months !== undefined) updates.ppm_frequency_months = data.ppm_frequency_months;
    if (data.next_service_date !== undefined) updates.next_service_date = data.next_service_date || null;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('ppm_groups')
        .update(updates)
        .eq('id', groupId);
      if (error) throw error;
    }

    // If asset_ids provided, sync junction table
    if (data.asset_ids !== undefined) {
      // Remove all existing, then re-insert
      await supabase.from('ppm_group_assets').delete().eq('ppm_group_id', groupId);
      if (data.asset_ids.length > 0) {
        const rows = data.asset_ids.map(assetId => ({
          ppm_group_id: groupId,
          asset_id: assetId,
        }));
        const { error: jErr } = await supabase
          .from('ppm_group_assets')
          .insert(rows);
        if (jErr) throw jErr;
      }
    }

    await fetchGroups();
  };

  const deleteGroup = async (groupId: string) => {
    // Junction table cascades, trigger clears assets.ppm_group_id
    const { error } = await supabase
      .from('ppm_groups')
      .delete()
      .eq('id', groupId);
    if (error) throw error;
    await fetchGroups();
  };

  const fetchAvailableAssets = async (forSiteId: string) => {
    // Try with ppm_group_id filter (excludes assets already in a group)
    const { data, error } = await supabase
      .from('assets')
      .select('id, name, category')
      .eq('company_id', companyId!)
      .eq('site_id', forSiteId)
      .is('ppm_group_id', null)
      .eq('archived', false)
      .order('name');

    if (!error) return data || [];

    // ppm_group_id column may not exist yet — fall back without that filter
    const fallback = await supabase
      .from('assets')
      .select('id, name, category')
      .eq('company_id', companyId!)
      .eq('site_id', forSiteId)
      .eq('archived', false)
      .order('name');
    if (fallback.error) throw fallback.error;
    return fallback.data || [];
  };

  return {
    groups,
    loading,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    fetchAvailableAssets,
  };
}
