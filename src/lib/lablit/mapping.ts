import { allergenKeyToLabel } from '@/lib/stockly/allergens';
import type { ProductionBatch, ProductionBatchOutput, StockBatch } from '@/lib/types/stockly';
import type { LablitLabelPayload, LablitProduct } from './types';

// ---------------------------------------------------------------------------
// Data mapping: Opsly batch/product data → Labl.it label payloads
// This layer is fully functional today — it only depends on Opsly types.
// When Labl.it API docs arrive, adjust `labelPayloadToLablitProduct()`.
// ---------------------------------------------------------------------------

/**
 * Map a production batch output (finished product) into a label payload.
 * Primary use case: production batch → output → label.
 */
export function mapProductionOutputToLabel(
  output: ProductionBatchOutput,
  batch: ProductionBatch,
  companyName?: string,
  siteName?: string,
): LablitLabelPayload {
  const allergenKeys = batch.allergens ?? batch.recipe?.allergens ?? [];
  const mayContainKeys = batch.may_contain_allergens ?? batch.recipe?.may_contain_allergens ?? [];

  return {
    product_name: output.stock_item?.name ?? 'Unknown Product',
    batch_code: output.batch_code ?? batch.batch_code,
    production_date: batch.production_date,
    use_by_date: output.use_by_date,
    best_before_date: output.best_before_date,
    allergens: allergenKeys.map(allergenKeyToLabel),
    may_contain_allergens: mayContainKeys.map(allergenKeyToLabel),
    quantity: output.quantity,
    unit: output.unit,
    recipe_name: batch.recipe?.name ?? null,
    company_name: companyName ?? null,
    site_name: siteName ?? null,
    storage_conditions: null, // Could be pulled from product_specifications if available
    ingredients_list: null, // Could be derived from recipe inputs in future
  };
}

/**
 * Map a stock batch (received goods) into a label payload.
 * Secondary use case: re-labelling received stock at goods-in.
 */
export function mapStockBatchToLabel(
  stockBatch: StockBatch,
  companyName?: string,
  siteName?: string,
): LablitLabelPayload {
  return {
    product_name: stockBatch.stock_item?.name ?? 'Unknown Product',
    batch_code: stockBatch.batch_code,
    production_date: null, // Not known for received goods
    use_by_date: stockBatch.use_by_date,
    best_before_date: stockBatch.best_before_date,
    allergens: [], // Allergens are on stock_items, not stock_batches — caller should enrich
    may_contain_allergens: [],
    quantity: stockBatch.quantity_remaining,
    unit: stockBatch.unit,
    recipe_name: null,
    company_name: companyName ?? null,
    site_name: siteName ?? null,
    storage_conditions: null,
    ingredients_list: null,
  };
}

/**
 * Convert a label payload into the Labl.it product format.
 * TODO: Adjust field names to match actual Labl.it API schema once docs arrive.
 */
export function labelPayloadToLablitProduct(payload: LablitLabelPayload): LablitProduct {
  return {
    name: payload.product_name,
    allergens: payload.allergens,
    may_contain: payload.may_contain_allergens,
    batch_code: payload.batch_code,
    use_by_date: payload.use_by_date ?? undefined,
    best_before_date: payload.best_before_date ?? undefined,
    storage_conditions: payload.storage_conditions ?? undefined,
  };
}
