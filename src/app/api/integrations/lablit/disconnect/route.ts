import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getLablitConfig, deleteLablitConfig } from '@/lib/lablit/tokens';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const config = await getLablitConfig(companyId);
    if (config) {
      await deleteLablitConfig(config.connectionId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[lablit/disconnect] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to disconnect Labl.it';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
