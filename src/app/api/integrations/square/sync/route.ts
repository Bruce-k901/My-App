import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { syncSquareSales } from '@/lib/square/sync';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, siteId, dateFrom, dateTo } = body;

    if (!companyId || !siteId) {
      return NextResponse.json(
        { error: 'companyId and siteId are required' },
        { status: 400 },
      );
    }

    const result = await syncSquareSales(companyId, siteId, dateFrom, dateTo);

    // Update last_connected_at on success
    if (result.success) {
      const admin = getSupabaseAdmin();
      await admin
        .from('integration_connections')
        .update({
          last_connected_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .eq('integration_type', 'pos_system')
        .eq('integration_name', 'Square');
    }

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (err: unknown) {
    console.error('[square/sync] API error:', err);
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
