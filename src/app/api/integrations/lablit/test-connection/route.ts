import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getLablitConfig } from '@/lib/lablit/tokens';
import { LablitClient } from '@/lib/lablit/client';
import { LablitApiError } from '@/lib/lablit/errors';

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
    if (!config) {
      return NextResponse.json({ error: 'Labl.it not configured' }, { status: 404 });
    }

    const client = new LablitClient(config.apiKey, config.deviceId, config.baseUrl);

    try {
      const result = await client.testConnection();
      return NextResponse.json({ success: true, deviceName: result.deviceName });
    } catch (err) {
      // If the API is not yet implemented, return a placeholder success
      if (err instanceof LablitApiError && err.category === 'NOT_IMPLEMENTED') {
        return NextResponse.json({
          success: true,
          placeholder: true,
          message: 'Connection saved. Labl.it API integration pending - will activate once API access is confirmed.',
          deviceId: config.deviceId,
          deviceName: config.deviceName,
        });
      }
      throw err;
    }
  } catch (err: unknown) {
    console.error('[lablit/test-connection] Error:', err);
    const msg = err instanceof Error ? err.message : 'Connection test failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
