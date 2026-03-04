import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { storeLablitConfig } from '@/lib/lablit/tokens';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, apiKey, deviceId, deviceName } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
    }
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    await storeLablitConfig(companyId, apiKey, deviceId, deviceName);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[lablit/connect] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to connect Labl.it';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
