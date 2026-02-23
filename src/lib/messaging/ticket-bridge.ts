import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { OPSLY_ADMIN_PROFILE_ID, OPSLY_ADMIN_NAME } from '@/lib/opsly-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TICKET ↔ MSGLY BRIDGE
// ============================================================================
// Server-side utility that sends Msgly DMs when ticket events occur.
// Admin replies are sent as "Opsly Admin" (a system identity).
// User replies keep the user's own identity.
// ============================================================================

interface TicketNotificationParams {
  ticketId: string;
  ticketTitle: string;
  ticketModule?: string;
  companyId: string;
  senderId: string;      // auth.users.id of the person who triggered the event
  recipientId: string;   // auth.users.id of the DM recipient
  content: string;       // comment body or resolution message
  commentId?: string;
  senderName?: string;
  isAdminReply: boolean;
  eventType: 'comment' | 'resolution';
  supabase?: SupabaseClient; // authenticated client from the calling API route
}

/**
 * Find an existing DM channel between two profiles, or create one.
 * Uses admin (service-role) client for creation so it works for
 * both real users and the Opsly Admin system identity.
 */
async function findOrCreateDMChannel(
  admin: SupabaseClient,
  senderId: string,
  recipientId: string,
  companyId: string,
): Promise<string> {
  // Look for existing direct channel where both profiles are members
  const { data: channels } = await admin
    .from('messaging_channels')
    .select('id, participants:messaging_channel_members(profile_id)')
    .eq('channel_type', 'direct')
    .eq('company_id', companyId);

  if (channels) {
    for (const ch of channels) {
      const memberIds = (ch.participants as any[])?.map((p: any) => p.profile_id) || [];
      if (memberIds.includes(senderId) && memberIds.includes(recipientId)) {
        return ch.id;
      }
    }
  }

  // No existing DM — create one
  // Fetch recipient name for the channel name field
  const { data: recipientProfile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', recipientId)
    .single();

  const channelName = recipientProfile?.full_name || recipientProfile?.email || 'Direct Message';

  // Create channel using admin client (Opsly Admin has no auth session)
  const { data: channel, error: createErr } = await admin
    .from('messaging_channels')
    .insert({
      channel_type: 'direct',
      company_id: companyId,
      created_by: senderId,
      name: channelName,
    })
    .select('id')
    .single();

  if (createErr || !channel) {
    console.error('ticket-bridge: channel creation failed', createErr);
    throw new Error(`Failed to create DM channel: ${createErr?.message || 'unknown'}`);
  }

  // Add both profiles as members
  const members = [
    { channel_id: channel.id, profile_id: senderId, member_role: 'admin' as const },
    { channel_id: channel.id, profile_id: recipientId, member_role: 'member' as const },
  ];

  const { error: membersErr } = await admin
    .from('messaging_channel_members')
    .insert(members);

  if (membersErr) {
    console.error('ticket-bridge: error adding DM channel members', membersErr);
  }

  return channel.id;
}

/**
 * Send a ticket-related DM via the Msgly messaging system.
 * Errors are logged but do not propagate.
 *
 * Admin replies are sent as "Opsly Admin" (system identity).
 * User replies keep the user's own identity.
 */
export async function sendTicketNotificationDM(params: TicketNotificationParams): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    // For admin replies, use Opsly Admin system identity.
    // For user replies, keep the user's own identity.
    const effectiveSenderId = params.isAdminReply
      ? OPSLY_ADMIN_PROFILE_ID
      : params.senderId;

    const effectiveSenderName = params.isAdminReply
      ? OPSLY_ADMIN_NAME
      : params.senderName;

    const channelId = await findOrCreateDMChannel(
      admin,
      effectiveSenderId,
      params.recipientId,
      params.companyId,
    );

    // Build message content with ticket context
    const prefix = params.eventType === 'resolution'
      ? `Ticket Resolved: ${params.ticketTitle}`
      : `${params.ticketTitle}`;

    const messageContent = `${prefix}\n\n${params.content}`;

    // Resolve sender name if not already known (user replies only)
    let senderName = effectiveSenderName;
    if (!senderName) {
      const { data: senderProfile } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', params.senderId)
        .single();
      senderName = senderProfile?.full_name || senderProfile?.email || 'Unknown';
    }

    // Insert message using admin client (bypasses RLS)
    const { error: msgErr } = await admin
      .from('messaging_messages')
      .insert({
        channel_id: channelId,
        sender_profile_id: effectiveSenderId,
        content: messageContent,
        message_type: 'text',
        metadata: {
          source: 'ticket_comment',
          ticket_id: params.ticketId,
          ticket_title: params.ticketTitle,
          ticket_module: params.ticketModule || null,
          comment_id: params.commentId || null,
          sender_name: senderName,
          ticket_link: `/dashboard/support/my-tickets/${params.ticketId}`,
          is_admin_reply: params.isAdminReply,
          event_type: params.eventType,
        },
      });

    if (msgErr) {
      console.error('ticket-bridge: failed to send DM', msgErr);
    }
  } catch (err) {
    console.error('ticket-bridge: unexpected error', err);
  }
}
