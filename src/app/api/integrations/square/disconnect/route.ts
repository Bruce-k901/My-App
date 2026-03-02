import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSquareTokens } from '@/lib/square/tokens';
import { getSquareOAuthClient } from '@/lib/square/client';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, siteId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const tokens = await getSquareTokens(companyId);
    const admin = getSupabaseAdmin();

    // Attempt to revoke the token at Square (best-effort)
    if (tokens) {
      try {
        const client = getSquareOAuthClient();
        await client.oAuth.revokeToken({
          clientId: process.env.SQUARE_APP_ID!,
          accessToken: tokens.accessToken,
        });
      } catch (err) {
        // Log but don't fail — token may already be expired/revoked
        console.warn('[square/disconnect] Token revoke failed (non-fatal):', err);
      }

      // Delete the integration_connections row
      await admin
        .from('integration_connections')
        .delete()
        .eq('id', tokens.connectionId);
    }

    // Reset the site POS fields
    if (siteId) {
      await admin
        .from('sites')
        .update({
          pos_provider: null,
          pos_location_id: null,
          pos_config: {},
        })
        .eq('id', siteId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[square/disconnect] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to disconnect Square';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
