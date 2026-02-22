import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureValidToken } from '@/lib/square/tokens';
import { getSquareClient } from '@/lib/square/client';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { withRetry } from '@/lib/square/errors';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const accessToken = await ensureValidToken(companyId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Square is not connected or token expired' },
        { status: 401 },
      );
    }

    const client = getSquareClient(accessToken);

    // Fetch catalog items from Square
    const items: {
      id: string;
      name: string;
      categoryName: string | null;
    }[] = [];

    // Use searchItems for ITEM type — gives us item names directly
    let cursor: string | undefined;
    do {
      const response = await withRetry(() =>
        client.catalog.searchItems({
          limit: 100,
          cursor,
        }),
      );

      for (const item of response.items ?? []) {
        const variation = item.itemData?.variations?.[0];
        items.push({
          id: variation?.id || item.id || '',
          name: item.itemData?.name || 'Unknown',
          categoryName: item.itemData?.categoryId || null,
        });
      }

      cursor = response.cursor ?? undefined;
    } while (cursor);

    // Fetch existing mappings for this company
    const admin = getSupabaseAdmin();
    const { data: mappings } = await admin
      .from('pos_product_mappings')
      .select('pos_product_id, stock_item_id, recipe_id, is_auto_matched, is_ignored')
      .eq('company_id', companyId)
      .eq('pos_provider', 'square');

    const mappingMap = new Map(
      (mappings ?? []).map((m) => [m.pos_product_id, m]),
    );

    // Merge items with their mapping status
    const catalogItems = items.map((item) => {
      const mapping = mappingMap.get(item.id);
      return {
        id: item.id,
        name: item.name,
        categoryName: item.categoryName,
        stockItemId: mapping?.stock_item_id ?? null,
        recipeId: mapping?.recipe_id ?? null,
        isAutoMatched: mapping?.is_auto_matched ?? false,
        isIgnored: mapping?.is_ignored ?? false,
        isMapped: !!(mapping?.stock_item_id || mapping?.recipe_id),
      };
    });

    return NextResponse.json({ success: true, items: catalogItems });
  } catch (err: unknown) {
    console.error('[square/catalog] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to fetch catalog';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
