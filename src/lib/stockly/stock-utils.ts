/**
 * Shared stock utilities for Stockly and Checkly integration
 */

import { supabase } from '@/lib/supabase';

export interface LibraryItem {
  id: string;
  library_type: string;
  name: string;
  [key: string]: any;
}

export interface StockItemWithLibrary {
  id: string;
  name: string;
  library_item_id?: string;
  library_type?: string;
  library_data?: LibraryItem;
  [key: string]: any;
}

/**
 * Get library item name based on library type
 */
export function getLibraryItemName(item: any, libraryType: string): string {
  switch (libraryType) {
    case 'ingredients_library':
      return item.ingredient_name || '';
    case 'chemicals_library':
      return item.product_name || '';
    case 'equipment_library':
      return item.equipment_name || '';
    case 'ppe_library':
    case 'drinks_library':
    case 'disposables_library':
    case 'glassware_library':
    case 'packaging_library':
    case 'serving_equipment_library':
      return item.item_name || '';
    default:
      return item.item_name || item.name || '';
  }
}

/**
 * Create stock item from library item
 */
export async function createStockItemFromLibrary(
  libraryItemId: string,
  libraryType: string,
  companyId: string,
  additionalData?: Partial<any>
): Promise<string> {
  // Fetch library item
  const { data: libraryItem, error } = await supabase
    .from(libraryType)
    .select('*')
    .eq('id', libraryItemId)
    .single();

  if (error || !libraryItem) {
    throw new Error(`Library item not found: ${libraryType}/${libraryItemId}`);
  }

  // Get name from library item
  const name = getLibraryItemName(libraryItem, libraryType);

  // Get unit from library item if available
  const unitId = libraryItem.unit_id || libraryItem.base_unit_id || null;

  // Create stock item
  const { data: stockItem, error: createError } = await supabase
    .from('stock_items')
    .insert({
      company_id: companyId,
      name,
      library_item_id: libraryItemId,
      library_type: libraryType,
      base_unit_id: unitId,
      is_purchasable: true,
      track_stock: true,
      ...additionalData,
    })
    .select('id')
    .single();

  if (createError || !stockItem) {
    throw new Error(`Failed to create stock item: ${createError?.message}`);
  }

  return stockItem.id;
}

/**
 * Search stock items with library data
 */
export async function searchStockItemsWithLibrary(
  companyId: string,
  searchTerm: string,
  limit: number = 50
): Promise<StockItemWithLibrary[]> {
  const { data, error } = await supabase
    .from('stock_items')
    .select(`
      *,
      library_item_id,
      library_type
    `)
    .eq('company_id', companyId)
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .limit(limit);

  if (error) {
    throw error;
  }

  // Enrich with library data
  const enriched = await Promise.all(
    (data || []).map(async (item) => {
      if (item.library_item_id && item.library_type) {
        const { data: libraryData } = await supabase
          .from(item.library_type)
          .select('*')
          .eq('id', item.library_item_id)
          .single();

        return {
          ...item,
          library_data: libraryData,
        };
      }
      return item;
    })
  );

  return enriched;
}

/**
 * Find or create stock item from library item
 */
export async function findOrCreateStockItemFromLibrary(
  libraryItemId: string,
  libraryType: string,
  companyId: string
): Promise<{ id: string; created: boolean }> {
  // Check if stock item already exists
  const { data: existing } = await supabase
    .from('stock_items')
    .select('id')
    .eq('company_id', companyId)
    .eq('library_item_id', libraryItemId)
    .eq('library_type', libraryType)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, created: false };
  }

  // Create new stock item
  const id = await createStockItemFromLibrary(
    libraryItemId,
    libraryType,
    companyId
  );

  return { id, created: true };
}

/**
 * Get stock item with library data
 */
export async function getStockItemWithLibrary(
  stockItemId: string
): Promise<StockItemWithLibrary | null> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('id', stockItemId)
    .single();

  if (error || !data) {
    return null;
  }

  // Fetch library data if linked
  if (data.library_item_id && data.library_type) {
    const { data: libraryData } = await supabase
      .from(data.library_type)
      .select('*')
      .eq('id', data.library_item_id)
      .single();

    return {
      ...data,
      library_data: libraryData,
    };
  }

  return data;
}
