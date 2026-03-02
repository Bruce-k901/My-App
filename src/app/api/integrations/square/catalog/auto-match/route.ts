import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureValidToken } from '@/lib/square/tokens';
import { getSquareClient } from '@/lib/square/client';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { withRetry } from '@/lib/square/errors';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId } = body;

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
    const admin = getSupabaseAdmin();

    // Fetch Square catalog items
    const squareItems: { id: string; name: string }[] = [];
    let cursor: string | undefined;
    do {
      const response = await withRetry(() =>
        client.catalog.searchItems({ limit: 100, cursor }),
      );
      for (const item of response.items ?? []) {
        const variation = item.itemData?.variations?.[0];
        squareItems.push({
          id: variation?.id || item.id || '',
          name: item.itemData?.name || '',
        });
      }
      cursor = response.cursor ?? undefined;
    } while (cursor);

    // Fetch existing mappings (skip already mapped items)
    const { data: existingMappings } = await admin
      .from('pos_product_mappings')
      .select('pos_product_id')
      .eq('company_id', companyId)
      .eq('pos_provider', 'square');

    const alreadyMapped = new Set(
      (existingMappings ?? []).map((m) => m.pos_product_id),
    );

    const unmappedItems = squareItems.filter((i) => !alreadyMapped.has(i.id));

    // Fetch all stock items for name matching
    const { data: stockItems } = await admin
      .from('stock_items')
      .select('id, name, sku')
      .eq('company_id', companyId);

    if (!stockItems?.length) {
      return NextResponse.json({
        success: true,
        matched: 0,
        unmatched: unmappedItems.length,
        total: squareItems.length,
      });
    }

    // Build lookup maps for matching
    const stockByNameLower = new Map(
      stockItems.map((s) => [s.name.toLowerCase().trim(), s.id]),
    );
    const stockBySkuLower = new Map(
      stockItems
        .filter((s) => s.sku)
        .map((s) => [s.sku!.toLowerCase().trim(), s.id]),
    );

    // Attempt to match
    const newMappings: Record<string, unknown>[] = [];
    let matched = 0;

    for (const item of unmappedItems) {
      const nameLower = item.name.toLowerCase().trim();

      // Exact name match
      let stockItemId = stockByNameLower.get(nameLower);

      // SKU match
      if (!stockItemId) {
        stockItemId = stockBySkuLower.get(nameLower);
      }

      // Fuzzy: check if Square name contains a stock item name or vice versa
      if (!stockItemId) {
        for (const [stockName, stockId] of stockByNameLower) {
          if (
            nameLower.includes(stockName) ||
            stockName.includes(nameLower)
          ) {
            stockItemId = stockId;
            break;
          }
        }
      }

      if (stockItemId) {
        newMappings.push({
          company_id: companyId,
          pos_provider: 'square',
          pos_product_id: item.id,
          pos_product_name: item.name,
          stock_item_id: stockItemId,
          is_auto_matched: true,
        });
        matched++;
      }
    }

    // Insert auto-matched mappings
    if (newMappings.length > 0) {
      const { error } = await admin
        .from('pos_product_mappings')
        .upsert(newMappings, { onConflict: 'company_id,pos_provider,pos_product_id' });
      if (error) {
        console.error('[square/auto-match] Insert error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      matched,
      unmatched: unmappedItems.length - matched,
      total: squareItems.length,
    });
  } catch (err: unknown) {
    console.error('[square/auto-match] Error:', err);
    const msg = err instanceof Error ? err.message : 'Auto-match failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
