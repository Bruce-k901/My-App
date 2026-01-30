import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId query parameter is required' },
        { status: 400 }
      );
    }

    // Get all Stockly products for this site
    const { data: stocklyProducts, error: stocklyError } = await supabase
      .from('stockly_stock_items')
      .select('id, name, sku')
      .eq('company_id', (
        await supabase
          .from('sites')
          .select('company_id')
          .eq('id', siteId)
          .single()
      ).data?.company_id)
      .eq('is_active', true);

    if (stocklyError) {
      console.error('Error fetching Stockly products:', stocklyError);
      return NextResponse.json(
        { error: 'Failed to fetch Stockly products' },
        { status: 500 }
      );
    }

    // Get Planly configured products
    const { data: planlyProducts, error: planlyError } = await supabase
      .from('planly_products')
      .select('stockly_product_id')
      .eq('site_id', siteId);

    if (planlyError) {
      console.error('Error fetching Planly products:', planlyError);
      return NextResponse.json(
        { error: 'Failed to fetch Planly products' },
        { status: 500 }
      );
    }

    const configuredIds = new Set(planlyProducts?.map(p => p.stockly_product_id) || []);
    const unconfigured = stocklyProducts?.filter(p => !configuredIds.has(p.id)) || [];

    return NextResponse.json(unconfigured);
  } catch (error) {
    console.error('Error in GET /api/planly/products/unconfigured:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
