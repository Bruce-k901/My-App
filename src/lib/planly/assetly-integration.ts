import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Get equipment types from Assetly
 */
export async function getEquipmentTypes(siteId: string) {
  const supabase = await createServerSupabaseClient();
  
  // Get site's company_id
  const { data: site } = await supabase
    .from('sites')
    .select('company_id')
    .eq('id', siteId)
    .single();

  if (!site) {
    return [];
  }

  const { data } = await supabase
    .from('assetly_equipment_types')
    .select('id, name, category')
    .eq('company_id', site.company_id);

  return data || [];
}

/**
 * Get specific assets (equipment instances)
 */
export async function getAssets(siteId: string, equipmentTypeId?: string) {
  const supabase = await createServerSupabaseClient();
  
  // Get site's company_id
  const { data: site } = await supabase
    .from('sites')
    .select('company_id')
    .eq('id', siteId)
    .single();

  if (!site) {
    return [];
  }

  let query = supabase
    .from('assetly_assets')
    .select('id, name, equipment_type_id, capacity_metrics')
    .eq('company_id', site.company_id);

  if (equipmentTypeId) {
    query = query.eq('equipment_type_id', equipmentTypeId);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Get capacity for a specific asset
 */
export async function getAssetCapacity(assetId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data } = await supabase
    .from('assetly_assets')
    .select('capacity_metrics')
    .eq('id', assetId)
    .single();

  return data?.capacity_metrics || {};
}
