import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { syncSquareSales } from '@/lib/square/sync';

/**
 * GET /api/cron/square-sync
 * Runs every 4 hours via Vercel cron. Syncs last 24 hours of Square sales
 * for all active Square connections.
 *
 * Once webhooks are live (Phase 5), this becomes a safety-net/catch-up
 * mechanism rather than the primary sync path.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Find all active Square connections
    const { data: connections, error } = await supabase
      .from('integration_connections')
      .select('id, company_id, config')
      .eq('integration_type', 'pos_system')
      .eq('integration_name', 'Square')
      .eq('status', 'connected');

    if (error || !connections?.length) {
      return NextResponse.json({
        success: true,
        message: 'No active Square connections found',
      });
    }

    const results: Record<string, unknown>[] = [];
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateFrom = yesterday.toISOString().split('T')[0];
    const dateTo = now.toISOString().split('T')[0];

    for (const conn of connections) {
      const config = conn.config as Record<string, unknown>;
      const locationId = config?.location_id as string | undefined;
      if (!locationId) continue;

      // Look up which site uses this location
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('pos_location_id', locationId)
        .eq('pos_provider', 'square')
        .maybeSingle();

      const siteId = site?.id;
      if (!siteId) {
        results.push({
          companyId: conn.company_id,
          error: 'No site found for Square location',
        });
        continue;
      }

      try {
        const syncResult = await syncSquareSales(
          conn.company_id,
          siteId,
          dateFrom,
          dateTo,
        );

        // Update connection status
        await supabase
          .from('integration_connections')
          .update({
            last_connected_at: new Date().toISOString(),
            last_error: syncResult.success ? null : syncResult.error,
            status: syncResult.success ? 'connected' : 'error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conn.id);

        results.push({
          companyId: conn.company_id,
          siteId,
          ...syncResult,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[cron/square-sync] Failed for company ${conn.company_id}:`, msg);

        await supabase
          .from('integration_connections')
          .update({
            last_error: msg,
            status: 'error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conn.id);

        results.push({
          companyId: conn.company_id,
          error: msg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      synced: results.length,
      results,
    });
  } catch (err) {
    console.error('[cron/square-sync] Error:', err);
    return NextResponse.json(
      { error: 'Failed to run Square sync cron' },
      { status: 500 },
    );
  }
}
