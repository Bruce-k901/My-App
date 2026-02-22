import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSquareClient } from '@/lib/square/client';
import { storeSquareTokens } from '@/lib/square/tokens';

/**
 * DEV-ONLY: Connect using a sandbox access token directly.
 * Square's sandbox OAuth page is unreliable, so this allows
 * testing the integration by pasting the token from the Dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    // Block in production
    if (process.env.SQUARE_ENVIRONMENT === 'production') {
      return NextResponse.json(
        { error: 'Sandbox connect is not available in production' },
        { status: 403 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, siteId, accessToken } = await request.json();
    if (!companyId || !accessToken) {
      return NextResponse.json(
        { error: 'companyId and accessToken are required' },
        { status: 400 },
      );
    }

    // Verify the token works by fetching merchant info
    const client = getSquareClient(accessToken);
    const { merchant } = await client.merchants.get({ merchantId: 'me' });

    if (!merchant) {
      return NextResponse.json(
        { error: 'Could not verify Square token — invalid or expired' },
        { status: 400 },
      );
    }

    // Store with a far-future expiry (sandbox tokens don't expire)
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10);

    await storeSquareTokens(companyId, siteId || '', {
      accessToken,
      refreshToken: 'sandbox-no-refresh',
      expiresAt: farFuture.toISOString(),
      merchantId: merchant.id || 'sandbox',
    });

    return NextResponse.json({
      success: true,
      merchantId: merchant.id,
      businessName: merchant.businessName,
    });
  } catch (err: unknown) {
    console.error('[square/sandbox-connect] Error:', err);
    const msg = err instanceof Error ? err.message : 'Sandbox connect failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
