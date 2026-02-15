import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/products?site_id=X
 * Returns planly products with names from ingredients_library and
 * current list prices, shaped to match the Product interface.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = request.nextUrl.searchParams.get('site_id');
    if (!siteId) {
      return NextResponse.json({ error: 'site_id is required' }, { status: 400 });
    }

    // Fetch active, non-archived planly products with category and bake group
    const { data: products, error: productsError } = await supabase
      .from('planly_products')
      .select(`
        id,
        stockly_product_id,
        category_id,
        bake_group_id,
        description,
        is_active,
        default_ship_state,
        can_ship_frozen,
        category:planly_categories(id, name, display_order),
        bake_group:planly_bake_groups(id, name, priority)
      `)
      .eq('site_id', siteId)
      .eq('is_active', true)
      .is('archived_at', null);

    if (productsError) {
      console.error('Error fetching planly products:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Manual join: get product names and units from ingredients_library
    const stocklyIds = products.map(p => p.stockly_product_id).filter(Boolean);
    const { data: ingredients } = await supabase
      .from('ingredients_library')
      .select('id, ingredient_name, unit')
      .in('id', stocklyIds);

    const ingredientMap = new Map(
      (ingredients || []).map(i => [i.id, i])
    );

    // Get current list prices for all products
    const today = new Date().toISOString().split('T')[0];
    const productIds = products.map(p => p.id);
    const { data: listPrices } = await supabase
      .from('planly_product_list_prices')
      .select('product_id, list_price, effective_from, effective_to')
      .in('product_id', productIds)
      .lte('effective_from', today)
      .order('effective_from', { ascending: false });

    // Build price map: most recent effective price per product
    const priceMap = new Map<string, number>();
    (listPrices || []).forEach(lp => {
      if (priceMap.has(lp.product_id)) return; // already have the most recent
      // Check effective_to if set
      if (lp.effective_to && lp.effective_to < today) return;
      priceMap.set(lp.product_id, parseFloat(lp.list_price));
    });

    // Shape response to match Product interface
    const shaped = products
      .map(product => {
        const ingredient = ingredientMap.get(product.stockly_product_id);
        if (!ingredient) return null; // skip products without ingredient data

        const category = product.category as any;
        const bakeGroup = product.bake_group as any;

        return {
          id: product.id,
          name: ingredient.ingredient_name,
          description: product.description || null,
          category: category?.name || null,
          bake_group_id: product.bake_group_id,
          bake_group_name: bakeGroup?.name || null,
          bake_group_priority: bakeGroup?.priority || 999,
          base_price: priceMap.get(product.id) || 0,
          unit: ingredient.unit || 'unit',
          is_active: product.is_active,
          is_available: true,
          default_ship_state: product.default_ship_state,
          can_ship_frozen: product.can_ship_frozen,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // Sort by bake group priority, then by name
        if (a.bake_group_priority !== b.bake_group_priority) {
          return a.bake_group_priority - b.bake_group_priority;
        }
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ success: true, data: shaped });
  } catch (error: any) {
    console.error('Error in GET /api/customer/products:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
