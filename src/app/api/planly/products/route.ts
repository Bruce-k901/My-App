import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const isActive = searchParams.get('isActive');
    const archived = searchParams.get('archived');

    let query = supabase
      .from('planly_products')
      .select(`
        *,
        category:planly_categories(*),
        process_template:planly_process_templates(*),
        bake_group:planly_bake_groups(*)
      `)
      .order('created_at', { ascending: false });

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    // Only filter by isActive if explicitly provided
    if (isActive === 'true' || isActive === 'false') {
      query = query.eq('is_active', isActive === 'true');
    }

    // Filter by archived status
    if (archived === 'true') {
      query = query.not('archived_at', 'is', null);
    } else if (archived === 'false') {
      query = query.is('archived_at', null);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch ingredient names for all products (no foreign key, so manual join)
    if (products && products.length > 0) {
      const stocklyProductIds = products
        .map(p => p.stockly_product_id)
        .filter(Boolean);

      if (stocklyProductIds.length > 0) {
        const { data: ingredients } = await supabase
          .from('ingredients_library')
          .select('id, ingredient_name, category, unit')
          .in('id', stocklyProductIds);

        // Create a lookup map
        const ingredientMap = new Map(
          (ingredients || []).map(i => [i.id, i])
        );

        // Attach stockly_product to each product
        const productsWithNames = products.map(product => ({
          ...product,
          stockly_product: ingredientMap.get(product.stockly_product_id) || null
        }));

        return NextResponse.json(productsWithNames);
      }
    }

    return NextResponse.json(products || []);
  } catch (error) {
    console.error('Error in GET /api/planly/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('planly_products')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
