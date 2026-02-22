import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, posProductId, posProductName, stockItemId, recipeId, isIgnored } = body;

    if (!companyId || !posProductId) {
      return NextResponse.json(
        { error: 'companyId and posProductId are required' },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from('pos_product_mappings')
      .upsert(
        {
          company_id: companyId,
          pos_provider: 'square',
          pos_product_id: posProductId,
          pos_product_name: posProductName || 'Unknown',
          stock_item_id: stockItemId || null,
          recipe_id: recipeId || null,
          is_ignored: isIgnored ?? false,
          is_auto_matched: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,pos_provider,pos_product_id' },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error('[square/catalog/map] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to save mapping';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
