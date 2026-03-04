import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { syncSquareCatalog } from '@/lib/square/catalog-sync';

/**
 * POST /api/integrations/square/catalog/sync
 * Syncs the full Square catalog into pos_menu_items.
 */
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

    const result = await syncSquareCatalog(companyId);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (err: unknown) {
    console.error('[square/catalog/sync] Error:', err);
    const msg = err instanceof Error ? err.message : 'Catalog sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
