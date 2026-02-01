import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Get ALL active, non-archived products for this site with bake groups
    const { data: allProducts, error: productsError } = await supabase
      .from('planly_products')
      .select(`
        id,
        stockly_product_id,
        default_ship_state,
        can_ship_frozen,
        is_active,
        bake_group:planly_bake_groups(id, name, priority)
      `)
      .eq('site_id', siteId)
      .eq('is_active', true)
      .is('archived_at', null);

    console.log('Order history - siteId:', siteId, 'customerId:', customerId);
    console.log('Order history - allProducts count:', allProducts?.length, 'error:', productsError);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    const productIds = (allProducts || []).map((p) => p.id);
    const stocklyProductIds = (allProducts || [])
      .map((p) => p.stockly_product_id)
      .filter(Boolean);

    console.log('Order history - productIds count:', productIds.length, 'stocklyProductIds count:', stocklyProductIds.length);

    // Get product names from ingredients_library
    let ingredients: { id: string; ingredient_name: string }[] = [];
    if (stocklyProductIds.length > 0) {
      const { data, error: ingredientsError } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name')
        .in('id', stocklyProductIds);

      if (ingredientsError) {
        console.error('Error fetching ingredients:', ingredientsError);
      }
      ingredients = data || [];
    }

    // Create ingredient name lookup
    const ingredientNames: Record<string, string> = {};
    for (const ing of ingredients || []) {
      ingredientNames[ing.id] = ing.ingredient_name;
    }

    // Build products array with names and bake groups
    const products = (allProducts || []).map((p: any) => ({
      id: p.id,
      name: ingredientNames[p.stockly_product_id] || 'Unknown Product',
      default_ship_state: p.default_ship_state,
      can_ship_frozen: p.can_ship_frozen,
      bake_group: p.bake_group ? {
        id: p.bake_group.id,
        name: p.bake_group.name,
        sort_order: p.bake_group.priority,
      } : null,
    }));

    // Sort products by bake group sort_order, then by name
    products.sort((a: any, b: any) => {
      const aOrder = a.bake_group?.sort_order ?? 999;
      const bOrder = b.bake_group?.sort_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    console.log('Order history - final products count:', products.length);

    // Build prices map (customer prices take precedence)
    const prices: Record<string, number> = {};

    if (productIds.length > 0) {
      // Get customer-specific prices
      const { data: customerPrices, error: pricesError } = await supabase
        .from('planly_customer_product_prices')
        .select('product_id, unit_price')
        .eq('customer_id', customerId)
        .in('product_id', productIds)
        .or('effective_to.is.null,effective_to.gte.' + format(new Date(), 'yyyy-MM-dd'))
        .lte('effective_from', format(new Date(), 'yyyy-MM-dd'));

      if (pricesError) {
        console.error('Error fetching customer prices:', pricesError);
      }

      // Get list prices as fallback
      const { data: listPrices, error: listPricesError } = await supabase
        .from('planly_product_list_prices')
        .select('product_id, list_price')
        .in('product_id', productIds)
        .or('effective_to.is.null,effective_to.gte.' + format(new Date(), 'yyyy-MM-dd'))
        .lte('effective_from', format(new Date(), 'yyyy-MM-dd'));

      if (listPricesError) {
        console.error('Error fetching list prices:', listPricesError);
      }

      // First set list prices
      for (const lp of listPrices || []) {
        prices[lp.product_id] = lp.list_price;
      }

      // Override with customer-specific prices
      for (const cp of customerPrices || []) {
        prices[cp.product_id] = cp.unit_price;
      }
    }

    return NextResponse.json({ products, prices });
  } catch (error) {
    console.error('Error in GET /api/planly/customers/[id]/order-history:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
