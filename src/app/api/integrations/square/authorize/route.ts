import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSquareAuthorizeBaseUrl } from '@/lib/square/client';

const SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
  'ORDERS_READ',
  'ITEMS_READ',
];

export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const siteId = searchParams.get('siteId');
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const appId = process.env.SQUARE_APP_ID;
    if (!appId) {
      return NextResponse.json({ error: 'Square is not configured' }, { status: 500 });
    }

    // Generate cryptographic state param for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Build callback URL
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/integrations/square/callback`;

    // Build the Square authorize URL
    // Use encodeURIComponent (produces %20) instead of URLSearchParams (produces +)
    // because Square's OAuth requires %20-encoded spaces in scope values
    const baseUrl = getSquareAuthorizeBaseUrl();
    const authorizeUrl = `${baseUrl}?client_id=${encodeURIComponent(appId)}&scope=${encodeURIComponent(SCOPES.join(' '))}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Store state + context in an httpOnly cookie (5 min TTL)
    const statePayload = JSON.stringify({ state, companyId, siteId: siteId || '' });
    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set('square_oauth_state', statePayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 300, // 5 minutes
    });

    return response;
  } catch (err: unknown) {
    console.error('[square/authorize] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to initiate Square OAuth';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
