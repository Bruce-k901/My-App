import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// WhatsApp ↔ Msgly Bridge
// Bridges WhatsApp messages into Msgly channels as system messages.
// Follows the same pattern as ticket-bridge.ts (metadata.source approach).
// ============================================================================

interface BridgeInboundParams {
  waMessageId: string;
  companyId: string;
  phoneNumber: string;
  contactName: string | null;
  content: string | null;
  messageType: string;
  mediaStoragePath: string | null;
}

/**
 * Bridge an inbound WhatsApp message into the contact's Msgly channel.
 * Creates the channel if it doesn't exist.
 * Returns the Msgly message ID and channel ID.
 */
export async function bridgeInboundToMsgly(
  params: BridgeInboundParams,
): Promise<{ channelId: string; messageId: string } | null> {
  try {
    const admin = getSupabaseAdmin();

    // Find the contact's Msgly channel
    const { data: contact } = await admin
      .from('whatsapp_contacts')
      .select('id, msgly_channel_id, contact_type, wa_display_name')
      .eq('phone_number', params.phoneNumber)
      .eq('company_id', params.companyId)
      .maybeSingle();

    if (!contact) {
      console.warn('[whatsapp/bridge] No contact found for', params.phoneNumber);
      return null;
    }

    let channelId = contact.msgly_channel_id;

    // Create channel if needed
    if (!channelId) {
      channelId = await createBridgedChannel(admin, params, contact);
      if (!channelId) return null;

      // Link channel back to contact
      await admin
        .from('whatsapp_contacts')
        .update({ msgly_channel_id: channelId, updated_at: new Date().toISOString() })
        .eq('id', contact.id);
    }

    // Build message content
    const displayName = params.contactName || contact.wa_display_name || params.phoneNumber;
    let messageContent = '';

    if (params.content) {
      messageContent = `[WhatsApp] ${displayName}: ${params.content}`;
    } else if (params.messageType === 'image') {
      messageContent = `[WhatsApp] ${displayName} sent an image`;
    } else if (params.messageType === 'document') {
      messageContent = `[WhatsApp] ${displayName} sent a document`;
    } else if (params.messageType === 'audio') {
      messageContent = `[WhatsApp] ${displayName} sent a voice message`;
    } else {
      messageContent = `[WhatsApp] ${displayName} sent a ${params.messageType} message`;
    }

    // Insert message into Msgly
    const { data: msglyMessage, error } = await admin
      .from('messaging_messages')
      .insert({
        channel_id: channelId,
        sender_profile_id: null, // External contact, no profile
        content: messageContent,
        message_type: 'system',
        metadata: {
          source: 'whatsapp_bridge',
          wa_message_id: params.waMessageId,
          wa_phone_number: params.phoneNumber,
          wa_contact_name: displayName,
          wa_message_type: params.messageType,
          wa_media_path: params.mediaStoragePath,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[whatsapp/bridge] Failed to insert Msgly message:', error.message);
      return null;
    }

    // Update channel's last_message_at
    await admin
      .from('messaging_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    return { channelId, messageId: msglyMessage.id };
  } catch (err) {
    console.error('[whatsapp/bridge] Unexpected error:', err);
    return null;
  }
}

/**
 * Bridge an outbound WhatsApp message into Msgly as a confirmation.
 */
export async function bridgeOutboundToMsgly(params: {
  companyId: string;
  phoneNumber: string;
  content: string;
  templateName?: string;
  triggeredByName?: string;
  channelId?: string;
}): Promise<{ channelId: string; messageId: string } | null> {
  try {
    const admin = getSupabaseAdmin();

    let channelId = params.channelId;

    // Find channel from contact if not provided
    if (!channelId) {
      const { data: contact } = await admin
        .from('whatsapp_contacts')
        .select('msgly_channel_id')
        .eq('phone_number', params.phoneNumber)
        .eq('company_id', params.companyId)
        .maybeSingle();

      channelId = contact?.msgly_channel_id;
    }

    if (!channelId) return null;

    const senderLabel = params.triggeredByName || 'Opsly';
    const templateLabel = params.templateName ? ` (template: ${params.templateName})` : '';
    const messageContent = `[WhatsApp Sent] ${senderLabel}${templateLabel}: ${params.content}`;

    const { data: msglyMessage, error } = await admin
      .from('messaging_messages')
      .insert({
        channel_id: channelId,
        sender_profile_id: null,
        content: messageContent,
        message_type: 'system',
        metadata: {
          source: 'whatsapp_bridge',
          direction: 'outbound',
          wa_phone_number: params.phoneNumber,
          wa_template_name: params.templateName,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[whatsapp/bridge] Failed to insert outbound Msgly message:', error.message);
      return null;
    }

    await admin
      .from('messaging_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    return { channelId, messageId: msglyMessage.id };
  } catch (err) {
    console.error('[whatsapp/bridge] Unexpected error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createBridgedChannel(
  admin: SupabaseClient,
  params: BridgeInboundParams,
  contact: { contact_type: string; wa_display_name: string | null },
): Promise<string | null> {
  const channelName = contact.wa_display_name || params.contactName || params.phoneNumber;

  // Use 'direct' for all WhatsApp bridged channels
  const { data: channel, error } = await admin
    .from('messaging_channels')
    .insert({
      channel_type: 'direct',
      company_id: params.companyId,
      name: `${channelName} (WhatsApp)`,
      is_auto_created: true,
    })
    .select('id')
    .single();

  if (error || !channel) {
    console.error('[whatsapp/bridge] Failed to create channel:', error?.message);
    return null;
  }

  return channel.id;
}
