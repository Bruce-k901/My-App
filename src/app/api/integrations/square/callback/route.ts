import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSquareOAuthClient } from '@/lib/square/client';
import { storeSquareTokens } from '@/lib/square/tokens';

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const settingsUrl = `${origin}/dashboard/settings?tab=integrations`;

  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${settingsUrl}&square=error&reason=unauthorized`);
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle Square-side errors (user denied, etc.)
    if (error) {
      return NextResponse.redirect(`${settingsUrl}&square=error&reason=${error}`);
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${settingsUrl}&square=error&reason=missing_params`);
    }

    // Verify CSRF state against the cookie
    const stateCookie = request.cookies.get('square_oauth_state')?.value;
    if (!stateCookie) {
      return NextResponse.redirect(`${settingsUrl}&square=error&reason=state_expired`);
    }

    let storedState: { state: string; companyId: string; siteId: string };
    try {
      storedState = JSON.parse(stateCookie);
    } catch {
      return NextResponse.redirect(`${settingsUrl}&square=error&reason=state_invalid`);
    }

    if (stateParam !== storedState.state) {
      return NextResponse.redirect(`${settingsUrl}&square=error&reason=state_mismatch`);
    }

    const companyId = storedState.companyId;

    // Exchange the authorization code for tokens
    const redirectUri = `${origin}/api/integrations/square/callback`;
    const client = getSquareOAuthClient();

    const tokenResponse = await client.oAuth.obtainToken({
      clientId: process.env.SQUARE_APP_ID!,
      clientSecret: process.env.SQUARE_APP_SECRET!,
      grantType: 'authorization_code',
      code,
      redirectUri,
    });

    if (!tokenResponse.accessToken || !tokenResponse.refreshToken) {
      return NextResponse.redirect(`${settingsUrl}&square=error&reason=token_exchange_failed`);
    }

    // Store encrypted tokens
    await storeSquareTokens(companyId, storedState.siteId, {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresAt: tokenResponse.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      merchantId: tokenResponse.merchantId || '',
    });

    // Clear the state cookie and redirect to settings
    const response = NextResponse.redirect(`${settingsUrl}&square=connected`);
    response.cookies.delete('square_oauth_state');
    return response;
  } catch (err: unknown) {
    console.error('[square/callback] Error:', err);
    return NextResponse.redirect(`${settingsUrl}&square=error&reason=exchange_failed`);
  }
}
