import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ensureValidToken } from './tokens';
import { getSquareClient } from './client';
import { withRetry, sleep } from './errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogSyncResult {
  success: boolean;
  itemsUpserted: number;
  itemsDeleted: number;
  categoriesFound: number;
  error?: string;
}

interface CatalogObject {
  id: string;
  type: string;
  isDeleted?: boolean;
  imageData?: { url?: string };
  categoryData?: { name?: string };
  itemData?: {
    name?: string;
    description?: string;
    categoryId?: string;
    imageIds?: string[];
    variations?: Array<{
      id: string;
      type: string;
      isDeleted?: boolean;
      itemVariationData?: {
        name?: string;
        priceMoney?: { amount?: bigint; currency?: string };
        itemId?: string;
      };
    }>;
    modifierListInfo?: Array<{
      modifierListId?: string;
    }>;
  };
}

// ---------------------------------------------------------------------------
// Core catalog sync
// ---------------------------------------------------------------------------

export async function syncSquareCatalog(companyId: string): Promise<CatalogSyncResult> {
  const result: CatalogSyncResult = {
    success: false,
    itemsUpserted: 0,
    itemsDeleted: 0,
    categoriesFound: 0,
  };

  const accessToken = await ensureValidToken(companyId);
  if (!accessToken) {
    result.error = 'Square token expired or unavailable — please reconnect';
    return result;
  }

  const client = getSquareClient(accessToken);
  const supabase = getSupabaseAdmin();

  try {
    // 1. Fetch entire catalog with pagination
    const allObjects: CatalogObject[] = [];
    let cursor: string | undefined;

    do {
      const response = await withRetry(() =>
        client.catalog.list({ cursor, types: 'ITEM,CATEGORY,IMAGE' }),
      ) as unknown as { data?: CatalogObject[]; cursor?: string };

      // The Square SDK v44 catalog.list returns an async iterable,
      // but we can also iterate directly. Handle both shapes.
      if (response && typeof response === 'object') {
        // If it's an async iterator
        if (Symbol.asyncIterator in response) {
          for await (const obj of response as AsyncIterable<CatalogObject>) {
            allObjects.push(obj);
          }
          break; // Async iterator handles pagination internally
        }
        // If it's a regular response with data array
        if (response.data) {
          allObjects.push(...response.data);
          cursor = response.cursor ?? undefined;
        }
      }

      if (cursor) await sleep(200);
    } while (cursor);

    // 2. Build lookup maps
    const categoryMap = new Map<string, string>(); // id -> name
    const imageMap = new Map<string, string>();     // id -> url

    for (const obj of allObjects) {
      if (obj.type === 'CATEGORY' && obj.categoryData?.name) {
        categoryMap.set(obj.id, obj.categoryData.name);
      }
      if (obj.type === 'IMAGE' && obj.imageData?.url) {
        imageMap.set(obj.id, obj.imageData.url);
      }
    }

    result.categoriesFound = categoryMap.size;

    // 3. Build menu item records from ITEM objects
    const menuItems: Record<string, unknown>[] = [];
    const seenVariationIds = new Set<string>();

    for (const obj of allObjects) {
      if (obj.type !== 'ITEM' || !obj.itemData) continue;
      const item = obj.itemData;

      const categoryName = item.categoryId
        ? categoryMap.get(item.categoryId) || null
        : null;

      // Resolve first image
      const imageUrl = (item.imageIds ?? []).length > 0
        ? imageMap.get(item.imageIds![0]) || null
        : null;

      const variations = item.variations ?? [];

      if (variations.length === 0) {
        // Item with no variations — create a single entry
        menuItems.push({
          company_id: companyId,
          pos_provider: 'square',
          catalog_item_id: obj.id,
          catalog_variation_id: obj.id, // Use item ID as variation ID
          name: item.name || 'Unknown Item',
          description: item.description || null,
          category_id: item.categoryId || null,
          category_name: categoryName,
          variation_name: null,
          price: null,
          currency: 'GBP',
          image_url: imageUrl,
          modifiers: null,
          is_active: !obj.isDeleted,
          is_deleted: !!obj.isDeleted,
        });
      } else {
        // One entry per variation
        for (const variation of variations) {
          const vData = variation.itemVariationData;
          if (!vData) continue;

          const variationId = variation.id;
          seenVariationIds.add(variationId);

          const price = vData.priceMoney?.amount
            ? Number(vData.priceMoney.amount) / 100
            : null;

          menuItems.push({
            company_id: companyId,
            pos_provider: 'square',
            catalog_item_id: obj.id,
            catalog_variation_id: variationId,
            name: item.name || 'Unknown Item',
            description: item.description || null,
            category_id: item.categoryId || null,
            category_name: categoryName,
            variation_name: vData.name || null,
            price,
            currency: (vData.priceMoney?.currency || 'GBP') as string,
            image_url: imageUrl,
            modifiers: null,
            is_active: !variation.isDeleted && !obj.isDeleted,
            is_deleted: !!variation.isDeleted || !!obj.isDeleted,
          });
        }
      }
    }

    // 4. Upsert in batches via RPC
    for (let i = 0; i < menuItems.length; i += 50) {
      const batch = menuItems.slice(i, i + 50);
      const { data: count, error } = await supabase
        .rpc('upsert_pos_menu_items', { items: batch });

      if (error) {
        console.error('[catalog-sync] Upsert batch error:', error);
      } else {
        result.itemsUpserted += (count as number) || 0;
      }
    }

    // 5. Mark items not in catalog as deleted
    // Get all existing non-deleted variation IDs for this company
    const { data: existing } = await supabase
      .from('pos_menu_items')
      .select('catalog_variation_id')
      .eq('company_id', companyId)
      .eq('pos_provider', 'square')
      .eq('is_deleted', false);

    if (existing) {
      const catalogVarIds = new Set(menuItems.map(m => m.catalog_variation_id as string));
      const toDelete = existing
        .filter(e => !catalogVarIds.has(e.catalog_variation_id))
        .map(e => e.catalog_variation_id);

      if (toDelete.length > 0) {
        // Mark as deleted in batches
        for (let i = 0; i < toDelete.length; i += 100) {
          const batch = toDelete.slice(i, i + 100);
          await supabase
            .from('pos_menu_items')
            .update({ is_deleted: true, synced_at: new Date().toISOString() } as Record<string, unknown>)
            .eq('company_id', companyId)
            .eq('pos_provider', 'square')
            .in('catalog_variation_id', batch);
        }
        result.itemsDeleted = toDelete.length;
      }
    }

    result.success = true;
    return result;
  } catch (err) {
    console.error('[catalog-sync] Sync failed:', err);
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }
}
