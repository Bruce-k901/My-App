/**
 * OA Messaging Service — Msgly primitives for the Opsly Assistant.
 *
 * All functions use getSupabaseAdmin() (service-role) to bypass RLS.
 * Fire-and-forget: errors are logged but never propagated.
 * Pattern follows ticket-bridge.ts and training/notifications.ts.
 */

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { OA_PROFILE_ID, OA_DISPLAY_NAME } from './identity';
import { resolveAuthUUID } from './auth-resolver';
import type { OASendDMParams, OASendChannelMessageParams, OAMessageMetadata } from './types';

const TAG = '[OA Msg]';

/** Base metadata merged into every OA message */
function baseMetadata(): Pick<OAMessageMetadata, 'source' | 'is_bot' | 'sender_name'> {
  return {
    source: 'opsly_assistant',
    is_bot: true,
    sender_name: 'Opsly Assistant',
  };
}

// ---------------------------------------------------------------------------
// Channel management
// ---------------------------------------------------------------------------

/**
 * Find an existing DM channel between OA and a user, or create one.
 * Channels are scoped by company_id so the same user can have separate
 * OA channels per company (multi-tenancy).
 */
export async function findOrCreateOAChannel(
  recipientProfileId: string,
  companyId: string,
): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();

    // Look for existing OA DM channel for this user in this company
    const { data: channels } = await admin
      .from('messaging_channels')
      .select('id, participants:messaging_channel_members(profile_id)')
      .eq('channel_type', 'direct')
      .eq('company_id', companyId)
      .eq('name', OA_DISPLAY_NAME);

    // Resolve recipient's auth UUID — needed for created_by FK and RLS-compatible membership
    const recipientAuthId = await resolveAuthUUID(admin, recipientProfileId);

    if (channels) {
      for (const ch of channels) {
        const memberIds = (ch.participants as any[])?.map((p: any) => p.profile_id) || [];
        // Check both profile ID and auth UUID in case they differ
        if (memberIds.includes(OA_PROFILE_ID) &&
            (memberIds.includes(recipientProfileId) || (recipientAuthId && memberIds.includes(recipientAuthId)))) {
          return ch.id;
        }
      }
    }

    if (!recipientAuthId) {
      console.error(`${TAG} Cannot resolve auth UUID for recipient ${recipientProfileId}`);
      return null;
    }

    // Create new DM channel
    // created_by has FK to auth.users — must use auth UUID, not profile ID
    const { data: channel, error: createErr } = await admin
      .from('messaging_channels')
      .insert({
        channel_type: 'direct',
        company_id: companyId,
        name: OA_DISPLAY_NAME,
        description: 'Your personal Opsly Assistant channel',
        created_by: recipientAuthId,
        is_auto_created: true,
      } as any)
      .select('id')
      .single();

    if (createErr || !channel) {
      console.error(`${TAG} Channel creation failed:`, JSON.stringify(createErr));
      return null;
    }

    // Add both OA and recipient as members
    // RLS checks mcm.profile_id = auth.uid(), so recipient must use auth UUID
    const members = [
      { channel_id: channel.id, profile_id: OA_PROFILE_ID, member_role: 'admin' as const },
      { channel_id: channel.id, profile_id: recipientAuthId, member_role: 'member' as const },
    ];

    const { error: membersErr } = await admin
      .from('messaging_channel_members')
      .insert(members as any);

    if (membersErr) {
      console.error(`${TAG} Error adding channel members:`, JSON.stringify(membersErr));
    }

    console.log(`${TAG} Created channel ${channel.id} for recipient ${recipientProfileId}`);
    return channel.id;
  } catch (err: any) {
    console.error(`${TAG} findOrCreateOAChannel error:`, err?.message);
    return null;
  }
}

/**
 * Ensure OA is a member of a given channel. Used when posting to
 * existing channels (e.g. site channels, group channels).
 */
export async function ensureOAMember(channelId: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    const { data: existing } = await admin
      .from('messaging_channel_members')
      .select('profile_id, left_at')
      .eq('channel_id', channelId)
      .eq('profile_id', OA_PROFILE_ID)
      .maybeSingle();

    if (existing && !existing.left_at) return; // already active member

    if (existing && existing.left_at) {
      // Re-activate
      await admin
        .from('messaging_channel_members')
        .update({ left_at: null } as any)
        .eq('channel_id', channelId)
        .eq('profile_id', OA_PROFILE_ID);
      return;
    }

    // Insert new membership
    await admin
      .from('messaging_channel_members')
      .insert({
        channel_id: channelId,
        profile_id: OA_PROFILE_ID,
        member_role: 'admin',
      } as any);
  } catch (err: any) {
    console.error(`${TAG} ensureOAMember error:`, err?.message);
  }
}

// ---------------------------------------------------------------------------
// Message sending
// ---------------------------------------------------------------------------

/**
 * Send a DM from OA to a user. Creates the channel if it doesn't exist.
 * Returns the channel ID on success, null on failure.
 */
export async function sendDM(params: OASendDMParams): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();

    const channelId = await findOrCreateOAChannel(params.recipientProfileId, params.companyId);
    if (!channelId) return null;

    const metadata = {
      ...baseMetadata(),
      ...(params.metadata || {}),
    };

    const { error: msgErr } = await admin
      .from('messaging_messages')
      .insert({
        channel_id: channelId,
        sender_profile_id: OA_PROFILE_ID,
        sender_name: OA_DISPLAY_NAME,
        content: params.content,
        message_type: params.messageType || 'text',
        metadata,
      } as any);

    if (msgErr) {
      console.error(`${TAG} sendDM message insert failed:`, JSON.stringify(msgErr));
      return null;
    }

    // Update channel's last_message_at
    await admin
      .from('messaging_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    console.log(`${TAG} DM sent — channel=${channelId}, recipient=${params.recipientProfileId}`);
    return channelId;
  } catch (err: any) {
    console.error(`${TAG} sendDM error:`, err?.message);
    return null;
  }
}

/**
 * Post a message from OA into an existing channel.
 * Ensures OA is a member before posting.
 */
export async function sendChannelMessage(params: OASendChannelMessageParams): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();

    await ensureOAMember(params.channelId);

    const metadata = {
      ...baseMetadata(),
      ...(params.metadata || {}),
    };

    const { error: msgErr } = await admin
      .from('messaging_messages')
      .insert({
        channel_id: params.channelId,
        sender_profile_id: OA_PROFILE_ID,
        sender_name: OA_DISPLAY_NAME,
        content: params.content,
        message_type: params.messageType || 'text',
        metadata,
      } as any);

    if (msgErr) {
      console.error(`${TAG} sendChannelMessage insert failed:`, JSON.stringify(msgErr));
      return false;
    }

    await admin
      .from('messaging_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', params.channelId);

    console.log(`${TAG} Channel message sent — channel=${params.channelId}`);
    return true;
  } catch (err: any) {
    console.error(`${TAG} sendChannelMessage error:`, err?.message);
    return false;
  }
}
