import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Recalculate items_counted for a specific stock count
 * This manually triggers the recalculation based on items with is_counted = true
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    let countId: string | undefined;
    
    // Try to get ID from params (handle both sync and async)
    if (params) {
      const resolvedParams = params instanceof Promise ? await params : params;
      countId = resolvedParams?.id;
    }
    
    // Fallback: extract from URL if params didn't work
    if (!countId) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const idIndex = pathParts.indexOf('recalculate-items-counted');
      if (idIndex >= 0 && pathParts[idIndex + 1]) {
        countId = pathParts[idIndex + 1];
      }
    }
    
    if (!countId) {
      console.error('Count ID is missing. URL:', request.url, 'Params:', params);
      return NextResponse.json(
        { error: 'Stock count ID is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client for operations that need to bypass RLS
    const supabaseAdmin = getSupabaseAdmin();

    // Get the stock count
    const { data: count, error: countError } = await supabaseAdmin
      .from('stock_counts')
      .select('id')
      .eq('id', countId)
      .single();

    if (countError || !count) {
      return NextResponse.json(
        { error: 'Stock count not found' },
        { status: 404 }
      );
    }

    // First, fix any items that have counted_quantity but is_counted is false
    const { error: fixItemsError } = await supabaseAdmin
      .from('stock_count_items')
      .update({ is_counted: true })
      .eq('stock_count_id', countId)
      .not('counted_quantity', 'is', null)
      .or('is_counted.is.null,is_counted.eq.false');

    if (fixItemsError) {
      console.warn('Error fixing is_counted flags:', fixItemsError);
      // Continue anyway
    }

    // Recalculate items_counted - count items with is_counted = true
    // First try with is_counted field, fallback to counted_quantity if is_counted doesn't exist
    let itemsCounted = 0;
    let itemsError: any = null;

    // Try counting with is_counted field
    const { count: countWithIsCounted, error: errorWithIsCounted } = await supabaseAdmin
      .from('stock_count_items')
      .select('id', { count: 'exact', head: true })
      .eq('stock_count_id', countId)
      .eq('is_counted', true);

    if (!errorWithIsCounted && countWithIsCounted !== null) {
      itemsCounted = countWithIsCounted;
    } else {
      // Fallback: count items that have counted_quantity set (even if is_counted field doesn't exist)
      const { data: itemsWithCount, error: errorWithCount } = await supabaseAdmin
        .from('stock_count_items')
        .select('id')
        .eq('stock_count_id', countId)
        .not('counted_quantity', 'is', null);

      if (errorWithCount) {
        console.error('Error counting items:', errorWithCount);
        itemsError = errorWithCount;
      } else {
        itemsCounted = itemsWithCount?.length || 0;
      }
    }

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to count items: ' + itemsError.message },
        { status: 500 }
      );
    }

    // Update the stock count
    const { error: updateError } = await supabaseAdmin
      .from('stock_counts')
      .update({
        items_counted: itemsCounted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', countId);

    if (updateError) {
      console.error('Error updating count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Items counted recalculated successfully',
      items_counted: itemsCounted,
    });

  } catch (error: any) {
    console.error('Error in recalculate-items-counted endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
