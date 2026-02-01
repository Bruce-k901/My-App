import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Fetch products from Stockly that are not yet configured in Planly
 */
export async function getUnconfiguredProducts(siteId: string) {
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

  // Get Stockly products
  const { data: stocklyProducts } = await supabase
    .from('stockly_stock_items')
    .select('id, name, sku')
    .eq('company_id', site.company_id)
    .eq('is_active', true);

  // Get Planly configured products
  const { data: planlyProducts } = await supabase
    .from('planly_products')
    .select('stockly_product_id')
    .eq('site_id', siteId);

  const configuredIds = new Set(planlyProducts?.map(p => p.stockly_product_id) || []);
  
  return stocklyProducts?.filter(p => !configuredIds.has(p.id)) || [];
}

/**
 * Get recipe components for a product to calculate base prep requirements
 */
export async function getProductRecipe(stocklyProductId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data } = await supabase
    .from('stockly_recipe_components')
    .select(`
      *,
      ingredient:stockly_ingredients(*)
    `)
    .eq('product_id', stocklyProductId);

  return data;
}

/**
 * Calculate base prep requirements from orders
 */
export async function calculateBasePrepRequirements(
  orders: any[],
  siteId: string
) {
  const supabase = await createServerSupabaseClient();
  const requirements: { [prepType: string]: number } = {};

  for (const order of orders) {
    for (const line of order.lines || []) {
      // Get product recipe
      const recipe = await getProductRecipe(line.product?.stockly_product_id);
      
      // Find base prep component (dough, batter, etc.)
      const basePrepComponent = recipe?.find((c: any) => 
        c.ingredient?.is_base_prep === true
      );
      
      if (basePrepComponent) {
        const prepType = basePrepComponent.ingredient.name;
        const quantityG = basePrepComponent.quantity_g * line.quantity;
        
        if (!requirements[prepType]) {
          requirements[prepType] = 0;
        }
        requirements[prepType] += quantityG;
      }
    }
  }

  return requirements;
}

/**
 * Get frozen stock levels
 */
export async function getFrozenStockLevels(siteId: string, productIds: string[]) {
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
    .from('stockly_stock_levels')
    .select('product_id, quantity, min_stock_level')
    .eq('company_id', site.company_id)
    .in('product_id', productIds);

  return data || [];
}
