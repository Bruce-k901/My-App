import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Process stock drawdowns for synced sales.
 * Looks up product mappings and creates pos_drawdown stock movements
 * for mapped items (via recipe components or direct stock items).
 */
export async function processStockDrawdowns(
  companyId: string,
  siteId: string,
  importId: string,
): Promise<{ movementsCreated: number; unmappedItems: number }> {
  const supabase = getSupabaseAdmin();
  let movementsCreated = 0;
  let unmappedItems = 0;

  // Fetch sale items for this import batch that haven't been processed
  // We join through sales → sale_items
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id, sale_date, site_id')
    .eq('company_id', companyId)
    .eq('import_batch_id', importId);

  if (salesError || !sales?.length) return { movementsCreated, unmappedItems };

  const saleIds = sales.map((s) => s.id);

  // Fetch all sale items for these sales
  const { data: saleItems, error: itemsError } = await supabase
    .from('sale_items')
    .select('id, sale_id, item_name, category_name, quantity, unit_price, line_total')
    .in('sale_id', saleIds);

  if (itemsError || !saleItems?.length) return { movementsCreated, unmappedItems };

  // Fetch all product mappings for this company
  const { data: mappings } = await supabase
    .from('pos_product_mappings')
    .select('pos_product_id, stock_item_id, recipe_id, is_ignored')
    .eq('company_id', companyId)
    .eq('pos_provider', 'square');

  const mappingMap = new Map(
    (mappings ?? []).map((m) => [m.pos_product_id, m]),
  );

  const movementsBatch: Record<string, unknown>[] = [];

  for (const item of saleItems) {
    // Extract Square catalog ID from category_name (stored as "square:CATALOG_ID")
    const posProductId = item.category_name?.startsWith('square:')
      ? item.category_name.replace('square:', '')
      : null;

    if (!posProductId) {
      unmappedItems++;
      continue;
    }

    const mapping = mappingMap.get(posProductId);
    if (!mapping || mapping.is_ignored) {
      if (!mapping?.is_ignored) unmappedItems++;
      continue;
    }

    const sale = sales.find((s) => s.id === item.sale_id);

    if (mapping.recipe_id) {
      // Recipe-based drawdown — fetch recipe components
      const { data: components } = await supabase
        .from('recipe_ingredients')
        .select('ingredient_id, quantity, unit')
        .eq('recipe_id', mapping.recipe_id);

      if (components) {
        for (const comp of components) {
          movementsBatch.push({
            company_id: companyId,
            stock_item_id: comp.ingredient_id,
            site_id: siteId,
            movement_type: 'pos_drawdown',
            quantity: -(comp.quantity * item.quantity),
            unit_cost: item.unit_price,
            ref_type: 'sale_item',
            ref_id: item.id,
            notes: `POS sale: ${item.item_name} x${item.quantity}`,
            recorded_at: sale?.sale_date
              ? new Date(sale.sale_date).toISOString()
              : new Date().toISOString(),
          });
        }
      }
    } else if (mapping.stock_item_id) {
      // Direct stock item drawdown
      movementsBatch.push({
        company_id: companyId,
        stock_item_id: mapping.stock_item_id,
        site_id: siteId,
        movement_type: 'pos_drawdown',
        quantity: -item.quantity,
        unit_cost: item.unit_price,
        ref_type: 'sale_item',
        ref_id: item.id,
        notes: `POS sale: ${item.item_name} x${item.quantity}`,
        recorded_at: sale?.sale_date
          ? new Date(sale.sale_date).toISOString()
          : new Date().toISOString(),
      });
    }
  }

  // Batch insert movements in chunks of 100
  for (let i = 0; i < movementsBatch.length; i += 100) {
    const chunk = movementsBatch.slice(i, i + 100);
    const { error } = await supabase.from('stock_movements').insert(chunk);
    if (error) {
      console.error('[square/drawdown] Movement insert error:', error);
    } else {
      movementsCreated += chunk.length;
    }
  }

  return { movementsCreated, unmappedItems };
}
