import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSquareTokens } from '@/lib/square/tokens';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, siteId, locationId, locationName } = body;

    if (!companyId || !siteId || !locationId) {
      return NextResponse.json(
        { error: 'companyId, siteId, and locationId are required' },
        { status: 400 },
      );
    }

    const tokens = await getSquareTokens(companyId);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Square is not connected' },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    // Update integration_connections with the selected location
    const { error: connError } = await admin
      .from('integration_connections')
      .update({
        config: {
          ...((await admin
            .from('integration_connections')
            .select('config')
            .eq('id', tokens.connectionId)
            .single()
          ).data?.config as Record<string, unknown> ?? {}),
          location_id: locationId,
          location_name: locationName || '',
        },
        status: 'connected',
        last_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokens.connectionId);

    if (connError) {
      return NextResponse.json(
        { error: `Failed to update integration: ${connError.message}` },
        { status: 500 },
      );
    }

    // Update the site with POS config
    const { error: siteError } = await admin
      .from('sites')
      .update({
        pos_provider: 'square',
        pos_location_id: locationId,
        pos_config: {
          merchant_id: tokens.merchantId,
          location_name: locationName || '',
        },
      })
      .eq('id', siteId);

    if (siteError) {
      console.error('[square/select-location] Site update error:', siteError);
      // Non-fatal — the integration is still connected
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[square/select-location] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to select location';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
