import { NextRequest, NextResponse } from 'next/server';
import { verifySquareWebhook } from '@/lib/square/webhook';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { syncSingleOrder } from '@/lib/square/sync';
import { processStockDrawdowns } from '@/lib/square/drawdown';

/**
 * POST /api/webhooks/square
 * Receives Square webhook events for real-time sales sync.
 */
export async function POST(request: NextRequest) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // CRITICAL: Read raw body as text BEFORE any JSON parsing
  const rawBody = await request.text();
  const signature = request.headers.get('x-square-hmacsha256-signature') || '';

  // Build the webhook URL (must match what's registered in Square Dashboard)
  const webhookUrl = `${new URL(request.url).origin}/api/webhooks/square`;

  const isValid = await verifySquareWebhook(signatureKey, webhookUrl, rawBody, signature);
  if (!isValid) {
    console.warn('[webhook/square] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse the event
  let event: {
    type?: string;
    event_id?: string;
    merchant_id?: string;
    data?: {
      type?: string;
      id?: string;
      object?: Record<string, unknown>;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.type;
  const merchantId = event.merchant_id;

  // Return 200 immediately for unrecognised event types
  if (!eventType || !merchantId) {
    return NextResponse.json({ received: true });
  }

  // Find the company/site for this merchant
  const supabase = getSupabaseAdmin();
  const { data: connection } = await supabase
    .from('integration_connections')
    .select('id, company_id, config')
    .eq('integration_type', 'pos_system')
    .eq('integration_name', 'Square')
    .eq('status', 'connected')
    .filter('config->>merchant_id', 'eq', merchantId)
    .maybeSingle();

  if (!connection) {
    // No matching connection — acknowledge but skip
    return NextResponse.json({ received: true, skipped: 'no_connection' });
  }

  // Extract location_id from the event payload for multi-site routing
  const eventLocationId =
    (event.data?.object as Record<string, unknown>)?.location_id as string | undefined;

  // Look up the site by matching the event's location_id to sites.pos_location_id
  let siteId: string | undefined;
  if (eventLocationId) {
    const { data: site } = await supabase
      .from('sites')
      .select('id')
      .eq('company_id', connection.company_id)
      .eq('pos_location_id', eventLocationId)
      .eq('pos_provider', 'square')
      .maybeSingle();
    siteId = site?.id;
  }

  // Fallback: if no location in event, try config.location_id (single-site compat)
  if (!siteId) {
    const config = connection.config as Record<string, unknown>;
    const configLocationId = config?.location_id as string | undefined;
    if (configLocationId) {
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('pos_location_id', configLocationId)
        .eq('pos_provider', 'square')
        .maybeSingle();
      siteId = site?.id;
    }
  }

  try {
    switch (eventType) {
      case 'payment.completed':
      case 'order.updated': {
        if (!siteId) break;

        // Extract the order ID from the event
        const orderId =
          event.data?.object?.order_id as string ??
          event.data?.id ??
          null;

        if (!orderId) break;

        // Sync this single order
        const result = await syncSingleOrder(
          connection.company_id,
          siteId,
          orderId,
        );

        // Run inline drawdown for single-order webhook syncs
        if (result.success && result.importId) {
          await processStockDrawdowns(
            connection.company_id,
            siteId,
            result.importId,
          );
        }

        break;
      }

      case 'catalog.version.updated': {
        // Flag that catalog has changed — product mappings may need refresh
        await supabase
          .from('integration_connections')
          .update({
            last_error: 'Square catalog updated — product mappings may need review',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
        break;
      }

      default:
        // Unknown event type — acknowledge
        break;
    }
  } catch (err) {
    console.error(`[webhook/square] Error processing ${eventType}:`, err);
    // Still return 200 to prevent Square from retrying
  }

  return NextResponse.json({ received: true });
}
