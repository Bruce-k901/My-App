import { supabase } from './supabase';
import type { SiteEquipmentPosition, TemperatureLogWithPosition } from '@/types/temperature';

/**
 * Fetches temperature logs with resolved nicknames
 * Falls back to asset name if no position exists
 */
export async function fetchTemperatureLogsWithNicknames({
  siteId,
  companyId,
  startDate,
  endDate,
  assetId,
  positionId,
  limit = 100
}: {
  siteId?: string;
  companyId: string;
  startDate?: string;
  endDate?: string;
  assetId?: string;
  positionId?: string;
  limit?: number;
}): Promise<TemperatureLogWithPosition[]> {
  let query = supabase
    .from('temperature_logs')
    .select(`
      *,
      position:site_equipment_positions!position_id (
        id,
        nickname,
        position_type,
        location_notes
      ),
      asset:assets!asset_id (
        id,
        name,
        working_temp_min,
        working_temp_max,
        category
      )
    `)
    .eq('company_id', companyId)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (siteId) {
    query = query.eq('site_id', siteId);
  }
  
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }

  if (positionId) {
    query = query.eq('position_id', positionId);
  }

  if (startDate) {
    query = query.gte('recorded_at', startDate);
  }

  if (endDate) {
    query = query.lte('recorded_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching temperature logs:', error);
    throw error;
  }

  // Resolve display names with fallback
  return (data || []).map(log => ({
    ...log,
    display_name: (log.position as any)?.nickname ?? (log.asset as any)?.name ?? 'Unknown Equipment'
  })) as TemperatureLogWithPosition[];
}

/**
 * Fetches positions for a site with their current assets
 */
export async function fetchSitePositions(siteId: string): Promise<SiteEquipmentPosition[]> {
  const { data, error } = await supabase
    .from('site_equipment_positions')
    .select(`
      *,
      asset:assets!current_asset_id (
        id,
        name,
        working_temp_min,
        working_temp_max,
        category,
        brand,
        model
      )
    `)
    .eq('site_id', siteId)
    .order('nickname');

  if (error) {
    console.error('Error fetching site positions:', error);
    throw error;
  }

  return (data || []) as SiteEquipmentPosition[];
}

/**
 * Creates or updates a position
 */
export async function upsertPosition({
  siteId,
  companyId,
  nickname,
  assetId,
  positionType,
  locationNotes
}: {
  siteId: string;
  companyId: string;
  nickname: string;
  assetId?: string | null;
  positionType?: 'chilled' | 'frozen' | 'hot_holding' | 'other' | null;
  locationNotes?: string | null;
}): Promise<SiteEquipmentPosition> {
  const { data, error } = await supabase
    .from('site_equipment_positions')
    .upsert({
      site_id: siteId,
      company_id: companyId,
      nickname,
      current_asset_id: assetId || null,
      position_type: positionType || null,
      location_notes: locationNotes || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'site_id,nickname'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting position:', error);
    throw error;
  }

  return data as SiteEquipmentPosition;
}

/**
 * Gets or creates a position for an asset
 * Used when saving temperature logs to ensure position_id is set
 */
export async function getOrCreatePositionForAsset(
  siteId: string,
  companyId: string,
  assetId: string,
  nickname?: string
): Promise<SiteEquipmentPosition> {
  // First, check if a position already exists for this asset
  const { data: existingPosition } = await supabase
    .from('site_equipment_positions')
    .select('id, nickname, current_asset_id')
    .eq('current_asset_id', assetId)
    .eq('site_id', siteId)
    .maybeSingle();

  if (existingPosition) {
    // Return the full position data
    const { data: fullPosition } = await supabase
      .from('site_equipment_positions')
      .select('*')
      .eq('id', existingPosition.id)
      .single();
    
    return fullPosition as SiteEquipmentPosition;
  }

  // If no position exists, create one using the nickname or asset name
  let positionNickname = nickname;
  
  if (!positionNickname) {
    // Fetch asset name as fallback
    const { data: asset } = await supabase
      .from('assets')
      .select('name, working_temp_min, working_temp_max')
      .eq('id', assetId)
      .single();
    
    positionNickname = asset?.name ?? 'Unknown Equipment';
    
    // Determine position type from asset temps
    let positionType: 'chilled' | 'frozen' | 'hot_holding' | 'other' | null = 'other';
    if (asset?.working_temp_max !== null && asset?.working_temp_min !== null) {
      const max = asset.working_temp_max;
      const min = asset.working_temp_min;
      if (max <= 8 && min >= -5) {
        positionType = 'chilled';
      } else if (max <= 0) {
        positionType = 'frozen';
      } else if (min >= 60) {
        positionType = 'hot_holding';
      }
    }

    return upsertPosition({
      siteId,
      companyId,
      nickname: positionNickname,
      assetId,
      positionType
    });
  }

  return upsertPosition({
    siteId,
    companyId,
    nickname: positionNickname,
    assetId
  });
}

/**
 * Gets position by ID
 */
export async function getPositionById(positionId: string): Promise<SiteEquipmentPosition | null> {
  const { data, error } = await supabase
    .from('site_equipment_positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching position:', error);
    throw error;
  }

  return data as SiteEquipmentPosition;
}

/**
 * Updates a position's current asset (for equipment replacement)
 */
export async function updatePositionAsset(
  positionId: string,
  newAssetId: string | null
): Promise<SiteEquipmentPosition> {
  const { data, error } = await supabase
    .from('site_equipment_positions')
    .update({ 
      current_asset_id: newAssetId,
      updated_at: new Date().toISOString()
    })
    .eq('id', positionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating position asset:', error);
    throw error;
  }

  return data as SiteEquipmentPosition;
}
