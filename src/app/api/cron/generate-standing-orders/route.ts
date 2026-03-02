import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { addDays, format } from 'date-fns';

/**
 * GET /api/cron/generate-standing-orders
 * Daily cron job to auto-generate orders from standing orders.
 * Generates orders for the next 7 days from active standing orders.
 * Vercel cron jobs invoke routes via GET.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Generate standing orders: unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Generate standing orders starting...');

    const supabase = await createServerSupabaseClient();

    // Get all sites
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, name')
      .eq('is_active', true);

    if (sitesError) {
      console.error('[Cron] Error fetching sites:', sitesError);
      return NextResponse.json({ error: sitesError.message }, { status: 500 });
    }

    const results: Array<{
      site_id: string;
      site_name: string;
      generated: number;
      skipped: number;
      error?: string;
    }> = [];

    // Generate orders for each site
    for (const site of sites || []) {
      try {
        // Generate orders for the next 7 days
        const today = new Date();
        const endDate = addDays(today, 7);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/planly/standing-orders/generate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Use service role key for server-to-server calls
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              start_date: format(today, 'yyyy-MM-dd'),
              end_date: format(endDate, 'yyyy-MM-dd'),
              site_id: site.id,
              auto_confirm: true,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          results.push({
            site_id: site.id,
            site_name: site.name,
            generated: 0,
            skipped: 0,
            error: error.error || 'Failed to generate',
          });
          continue;
        }

        const result = await response.json();
        results.push({
          site_id: site.id,
          site_name: site.name,
          generated: result.generated || 0,
          skipped: result.skipped || 0,
        });
      } catch (error: any) {
        console.error(`[Cron] Error generating orders for site ${site.id}:`, error);
        results.push({
          site_id: site.id,
          site_name: site.name,
          generated: 0,
          skipped: 0,
          error: error.message,
        });
      }
    }

    // Calculate totals
    const totalGenerated = results.reduce((sum, r) => sum + r.generated, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const errors = results.filter(r => r.error);

    console.log('[Cron] Standing orders generation complete:', {
      totalGenerated,
      totalSkipped,
      errorCount: errors.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      totalGenerated,
      totalSkipped,
      sites: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Error in generate-standing-orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
