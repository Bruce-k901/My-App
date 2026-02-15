import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch saleable ingredients from Stockly for linking to Planly
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Get company_id from the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('company_id')
      .eq('id', siteId)
      .single();

    if (siteError || !site?.company_id) {
      console.error('Error fetching site:', siteError);
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Get products already linked to Planly for this site
    const { data: linkedProducts } = await supabase
      .from('planly_products')
      .select('stockly_product_id')
      .eq('site_id', siteId);

    const linkedIds = (linkedProducts || []).map(p => p.stockly_product_id);

    // Fetch saleable ingredients from the ingredients library by company_id
    const { data, error } = await supabase
      .from('ingredients_library')
      .select('id, ingredient_name, category, unit')
      .eq('company_id', site.company_id)
      .eq('is_saleable', true)
      .order('ingredient_name', { ascending: true });

    if (error) {
      console.error('Error fetching saleable ingredients:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to the expected format and mark already linked products
    const products = (data || []).map(ingredient => ({
      id: ingredient.id,
      name: ingredient.ingredient_name || ingredient.id,
      sku: null,
      category: ingredient.category,
      unit: ingredient.unit,
      is_active: true,
      is_linked: linkedIds.includes(ingredient.id),
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error in GET /api/planly/stockly-products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
