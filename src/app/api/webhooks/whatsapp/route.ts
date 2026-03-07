import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyWebhookSignature } from '@/lib/whatsapp/signature';
import { resolveCompanyFromWebhook } from '@/lib/whatsapp/routing';
import { getWhatsAppCredentials } from '@/lib/whatsapp/client';
import { normaliseMetaPhone } from '@/lib/whatsapp/phone';

// ============================================================================
// POST /api/webhooks/whatsapp
// GET  /api/webhooks/whatsapp  (verification challenge)
//
// Two-phase processing:
//   Phase 1 (this handler): validate signature, insert pending row, return 200
//   Phase 2 (Edge Function): media download, Msgly bridge, service window
// ============================================================================

// ---------------------------------------------------------------------------
// GET — Webhook verification (Meta sends this once during setup)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — Inbound messages + status updates
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  // CRITICAL: Read raw body BEFORE any JSON parsing (for signature validation)
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256') || '';

  // Resolve app secret for signature validation
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[webhook/whatsapp] Missing WHATSAPP_APP_SECRET');
    return new Response('OK', { status: 200 }); // Still 200 to prevent retries
  }

  // Validate signature — non-negotiable
  if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
    console.warn('[webhook/whatsapp] Invalid signature');
    return new Response('OK', { status: 200 }); // 200 to prevent retry storms
  }

  // Parse the event
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('OK', { status: 200 });
  }

  // Process each entry (Meta can batch multiple entries)
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Process inbound messages
      if (value.messages?.length) {
        await processInboundMessages(value, phoneNumberId);
      }

      // Process status updates (delivery receipts)
      if (value.statuses?.length) {
        await processStatusUpdates(value.statuses);
      }
    }
  }

  return new Response('OK', { status: 200 });
}

// ---------------------------------------------------------------------------
// Inbound message processing (Phase 1 — insert pending row)
// ---------------------------------------------------------------------------
async function processInboundMessages(
  value: WebhookValue,
  phoneNumberId: string,
) {
  const supabase = getSupabaseAdmin();

  for (const message of value.messages || []) {
    const senderPhone = normaliseMetaPhone(message.from);

    // Route to company
    const routing = await resolveCompanyFromWebhook(phoneNumberId, senderPhone);
    if (!routing) {
      console.warn('[webhook/whatsapp] Unroutable message from', senderPhone);
      continue;
    }

    // Extract contact name from webhook
    const contactName = value.contacts?.[0]?.profile?.name || null;

    // Extract content based on message type
    const content = extractContent(message);
    const mediaId = extractMediaId(message);

    // Idempotent insert — ON CONFLICT DO NOTHING
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .upsert(
        {
          company_id: routing.companyId,
          direction: 'inbound',
          wa_message_id: message.id,
          phone_number: senderPhone,
          contact_name: contactName,
          message_type: mapMessageType(message.type),
          content,
          status: 'received',
          status_updated_at: new Date().toISOString(),
          // Mark as pending for Phase 2 processing (media, bridge, window)
          processing_status: 'pending',
        },
        { onConflict: 'wa_message_id', ignoreDuplicates: true },
      )
      .select('id');

    // If no rows returned, this was a duplicate — skip
    if (!data?.length) continue;

    const messageId = data[0].id;

    // Store media_id in metadata for Phase 2 processing
    if (mediaId) {
      await supabase
        .from('whatsapp_messages')
        .update({
          content: content || `[${message.type}]`,
          // Store media_id temporarily so the Edge Function can download it
          media_url: `pending:${mediaId}`,
        })
        .eq('id', messageId);
    }

    // Auto-create contact if new
    await supabase
      .from('whatsapp_contacts')
      .upsert(
        {
          company_id: routing.companyId,
          phone_number: senderPhone,
          wa_display_name: contactName,
          last_message_at: new Date().toISOString(),
          service_window_expires: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,phone_number' },
      );
  }
}

// ---------------------------------------------------------------------------
// Status update processing (delivery receipts)
// ---------------------------------------------------------------------------
async function processStatusUpdates(
  statuses: WebhookStatus[],
) {
  const supabase = getSupabaseAdmin();

  for (const status of statuses) {
    // Use idempotent status progression function
    await supabase.rpc('update_wa_status_if_newer', {
      p_wa_message_id: status.id,
      p_new_status: status.status,
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractContent(message: WebhookMessage): string | null {
  switch (message.type) {
    case 'text':
      return message.text?.body || null;
    case 'reaction':
      return message.reaction?.emoji || null;
    default:
      return message[message.type]?.caption || null;
  }
}

function extractMediaId(message: WebhookMessage): string | null {
  const media = message[message.type] as { id?: string } | undefined;
  if (message.type === 'text' || message.type === 'reaction') return null;
  return media?.id || null;
}

function mapMessageType(type: string): string {
  const allowed = ['template', 'text', 'image', 'document', 'reaction', 'audio', 'video'];
  return allowed.includes(type) ? type : 'text';
}

// ---------------------------------------------------------------------------
// Meta webhook type definitions
// ---------------------------------------------------------------------------

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: WebhookValue;
    }>;
  }>;
}

interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
}

interface WebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string; mime_type?: string };
  document?: { id: string; caption?: string; filename?: string; mime_type?: string };
  audio?: { id: string; mime_type?: string };
  video?: { id: string; caption?: string; mime_type?: string };
  reaction?: { emoji: string; message_id: string };
  [key: string]: unknown;
}

interface WebhookStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}
