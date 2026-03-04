import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { syncSquareLabor } from '@/lib/square/labor';

/**
 * POST /api/integrations/square/labor/sync
 * Manual trigger for Square labor/timecard sync.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, siteId, dateFrom, dateTo } = await request.json();
    if (!companyId || !siteId) {
      return NextResponse.json({ error: 'companyId and siteId are required' }, { status: 400 });
    }

    const result = await syncSquareLabor(companyId, siteId, dateFrom, dateTo);

    return NextResponse.json({ success: result.success, result });
  } catch (err) {
    console.error('[api/square/labor/sync] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Labor sync failed' },
      { status: 500 },
    );
  }
}
