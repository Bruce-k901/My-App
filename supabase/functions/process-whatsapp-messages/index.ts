// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

// ============================================================================
// Phase 2 background processor for WhatsApp messages.
// Runs on a 1-minute cron. Handles:
//   - Media download from Meta + upload to Supabase Storage
//   - Msgly channel bridging
//   - Service window updates
//   - Retry queue for failed outbound messages
//
// Schedule via Supabase cron: every 1 minute
// ============================================================================

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const STORAGE_BUCKET = "whatsapp-media";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let processed = 0;
  let errors = 0;

  // -----------------------------------------------------------------
  // 1. Process pending inbound messages (media download + bridge)
  // -----------------------------------------------------------------
  const { data: pending, error: pendingErr } = await supabase
    .from("whatsapp_messages")
    .select("id, company_id, wa_message_id, phone_number, contact_name, message_type, content, media_url, direction")
    .eq("processing_status", "pending")
    .order("created_at", { ascending: true })
    .limit(20);

  if (pendingErr) {
    return jsonResponse({ error: pendingErr.message }, 500);
  }

  for (const msg of pending || []) {
    try {
      // Get credentials for this company
      const accessToken = await getAccessToken(supabase, msg.company_id);

      // Download media if pending
      if (msg.media_url?.startsWith("pending:")) {
        const mediaId = msg.media_url.replace("pending:", "");
        if (accessToken) {
          const storagePath = await downloadAndStoreMedia(
            supabase,
            mediaId,
            msg.id,
            msg.company_id,
            accessToken,
          );
          if (storagePath) {
            await supabase
              .from("whatsapp_messages")
              .update({ media_url: storagePath })
              .eq("id", msg.id);
          }
        }
      }

      // Bridge to Msgly
      if (msg.direction === "inbound") {
        const bridgeResult = await bridgeToMsgly(supabase, msg);
        if (bridgeResult) {
          await supabase
            .from("whatsapp_messages")
            .update({
              msgly_channel_id: bridgeResult.channelId,
              msgly_message_id: bridgeResult.messageId,
            })
            .eq("id", msg.id);
        }
      }

      // Mark as processed
      await supabase
        .from("whatsapp_messages")
        .update({ processing_status: "processed" })
        .eq("id", msg.id);

      processed++;
    } catch (err) {
      console.error(`[process-whatsapp] Error processing ${msg.id}:`, err);
      await supabase
        .from("whatsapp_messages")
        .update({ processing_status: "failed" })
        .eq("id", msg.id);
      errors++;
    }
  }

  // -----------------------------------------------------------------
  // 2. Retry failed outbound messages
  // -----------------------------------------------------------------
  const { data: retries } = await supabase
    .from("whatsapp_messages")
    .select("id, company_id, phone_number, template_name, template_params, content, message_type, retry_count, max_retries")
    .eq("direction", "outbound")
    .eq("status", "failed")
    .lt("retry_count", 3)  // max_retries default
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(10);

  for (const msg of retries || []) {
    try {
      const accessToken = await getAccessToken(supabase, msg.company_id);
      const phoneNumberId = await getPhoneNumberId(supabase, msg.company_id);
      if (!accessToken || !phoneNumberId) continue;

      let success = false;
      let waMessageId: string | null = null;

      if (msg.template_name && msg.template_params) {
        // Retry template message
        const result = await sendTemplateViaApi(
          phoneNumberId,
          accessToken,
          msg.phone_number,
          msg.template_name,
          msg.template_params,
        );
        success = result.success;
        waMessageId = result.waMessageId;
      } else if (msg.content) {
        // Retry free-form text
        const result = await sendTextViaApi(
          phoneNumberId,
          accessToken,
          msg.phone_number,
          msg.content,
        );
        success = result.success;
        waMessageId = result.waMessageId;
      }

      if (success) {
        await supabase
          .from("whatsapp_messages")
          .update({
            status: "sent",
            wa_message_id: waMessageId,
            error_code: null,
            error_message: null,
            status_updated_at: new Date().toISOString(),
          })
          .eq("id", msg.id);
        processed++;
      } else {
        // Exponential backoff: 2min, 10min, 60min
        const delays = [2, 10, 60];
        const nextRetry = delays[msg.retry_count] || 60;
        await supabase
          .from("whatsapp_messages")
          .update({
            retry_count: msg.retry_count + 1,
            next_retry_at: new Date(
              Date.now() + nextRetry * 60 * 1000,
            ).toISOString(),
          })
          .eq("id", msg.id);
        errors++;
      }
    } catch (err) {
      console.error(`[process-whatsapp] Retry error for ${msg.id}:`, err);
      errors++;
    }
  }

  return jsonResponse({ processed, errors, pending: pending?.length || 0, retries: retries?.length || 0 });
});

// ---------------------------------------------------------------------------
// Helper: Get access token for a company
// ---------------------------------------------------------------------------
async function getAccessToken(supabase: any, companyId: string): Promise<string | null> {
  // Try company-specific integration first
  const { data } = await supabase
    .from("integration_connections")
    .select("config")
    .eq("integration_type", "whatsapp")
    .eq("status", "connected")
    .eq("company_id", companyId)
    .maybeSingle();

  if (data?.config?.access_token_encrypted) {
    // Edge Functions don't have the Node crypto module for AES decryption.
    // The access token for the Edge Function should be stored as a Deno env var
    // since this function runs with service-role privileges anyway.
    // Fall through to env var.
  }

  return Deno.env.get("WHATSAPP_ACCESS_TOKEN") || null;
}

async function getPhoneNumberId(supabase: any, companyId: string): Promise<string | null> {
  const { data } = await supabase
    .from("integration_connections")
    .select("config")
    .eq("integration_type", "whatsapp")
    .eq("status", "connected")
    .eq("company_id", companyId)
    .maybeSingle();

  if (data?.config?.phone_number_id) {
    return data.config.phone_number_id as string;
  }

  return Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || null;
}

// ---------------------------------------------------------------------------
// Helper: Download media from Meta and upload to Supabase Storage
// ---------------------------------------------------------------------------
async function downloadAndStoreMedia(
  supabase: any,
  mediaId: string,
  messageId: string,
  companyId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    // Get download URL
    const metaRes = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return null;
    const { url, mime_type } = await metaRes.json();

    // Download binary
    const mediaRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) return null;
    const buffer = new Uint8Array(await mediaRes.arrayBuffer());

    // Upload to storage
    const ext = (mime_type as string).split("/")[1] || "bin";
    const storagePath = `${companyId}/${messageId}.${ext}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mime_type,
        upsert: false,
      });

    if (error) {
      console.error("[process-whatsapp] Media upload failed:", error.message);
      return null;
    }

    return storagePath;
  } catch (err) {
    console.error("[process-whatsapp] Media download error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper: Bridge inbound message to Msgly
// ---------------------------------------------------------------------------
async function bridgeToMsgly(
  supabase: any,
  msg: any,
): Promise<{ channelId: string; messageId: string } | null> {
  try {
    // Find or auto-create contact's Msgly channel
    const { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("id, msgly_channel_id, wa_display_name")
      .eq("phone_number", msg.phone_number)
      .eq("company_id", msg.company_id)
      .maybeSingle();

    if (!contact) return null;

    let channelId = contact.msgly_channel_id;

    // Create channel if needed
    if (!channelId) {
      const channelName = contact.wa_display_name || msg.contact_name || msg.phone_number;
      const { data: channel, error } = await supabase
        .from("messaging_channels")
        .insert({
          channel_type: "direct",
          company_id: msg.company_id,
          name: `${channelName} (WhatsApp)`,
          is_auto_created: true,
        })
        .select("id")
        .single();

      if (error || !channel) return null;
      channelId = channel.id;

      // Link channel to contact
      await supabase
        .from("whatsapp_contacts")
        .update({ msgly_channel_id: channelId, updated_at: new Date().toISOString() })
        .eq("id", contact.id);
    }

    // Insert bridged message
    const displayName = msg.contact_name || contact.wa_display_name || msg.phone_number;
    let messageContent = "";
    if (msg.content) {
      messageContent = `[WhatsApp] ${displayName}: ${msg.content}`;
    } else {
      messageContent = `[WhatsApp] ${displayName} sent a ${msg.message_type} message`;
    }

    const { data: msglyMsg, error: msgErr } = await supabase
      .from("messaging_messages")
      .insert({
        channel_id: channelId,
        sender_profile_id: null,
        content: messageContent,
        message_type: "system",
        metadata: {
          source: "whatsapp_bridge",
          wa_message_id: msg.wa_message_id,
          wa_phone_number: msg.phone_number,
          wa_contact_name: displayName,
          wa_message_type: msg.message_type,
          wa_media_path: msg.media_url?.startsWith("pending:") ? null : msg.media_url,
        },
      })
      .select("id")
      .single();

    if (msgErr || !msglyMsg) return null;

    // Update channel last_message_at
    await supabase
      .from("messaging_channels")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", channelId);

    return { channelId, messageId: msglyMsg.id };
  } catch (err) {
    console.error("[process-whatsapp] Bridge error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper: Send template message via Meta API
// ---------------------------------------------------------------------------
async function sendTemplateViaApi(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  templateParams: any,
): Promise<{ success: boolean; waMessageId?: string }> {
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en_GB" },
      components: templateParams,
    },
  };

  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return {
    success: res.ok,
    waMessageId: data.messages?.[0]?.id,
  };
}

// ---------------------------------------------------------------------------
// Helper: Send free-form text via Meta API
// ---------------------------------------------------------------------------
async function sendTextViaApi(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
): Promise<{ success: boolean; waMessageId?: string }> {
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return {
    success: res.ok,
    waMessageId: data.messages?.[0]?.id,
  };
}

// ---------------------------------------------------------------------------
// JSON response helper
// ---------------------------------------------------------------------------
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
