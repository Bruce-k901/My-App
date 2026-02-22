import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ensureValidToken } from '@/lib/square/tokens';
import { getSquareClient } from '@/lib/square/client';
import { handleSquareError } from '@/lib/square/errors';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const accessToken = await ensureValidToken(companyId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Square is not connected or token expired' },
        { status: 401 },
      );
    }

    const client = getSquareClient(accessToken);

    try {
      const response = await client.locations.list();
      const locations = (response.locations ?? []).map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address
          ? [loc.address.addressLine1, loc.address.locality, loc.address.postalCode]
              .filter(Boolean)
              .join(', ')
          : null,
        status: loc.status,
      }));

      return NextResponse.json({ success: true, locations });
    } catch (err) {
      handleSquareError(err);
    }
  } catch (err: unknown) {
    console.error('[square/locations] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to list locations';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
