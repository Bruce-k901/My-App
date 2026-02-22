import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ============================================================================
// TICKET ↔ MSGLY BRIDGE
// ============================================================================
// Server-side utility that sends Msgly DMs when ticket events occur.
// Uses the service-role admin client to bypass RLS.
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
}

/**
 * Find an existing DM channel between two users, or create one.
 */
async function findOrCreateDMChannel(
  adminClient: ReturnType<typeof getSupabaseAdmin>,
  userId1: string,
  userId2: string,
  companyId: string,
): Promise<string> {
  // Look for existing direct channel where both users are members
  const { data: channels } = await adminClient
    .from('messaging_channels')
    .select('id, participants:messaging_channel_members(profile_id)')
    .eq('channel_type', 'direct')
    .eq('company_id', companyId);

  if (channels) {
    for (const ch of channels) {
      const memberIds = (ch.participants as any[])?.map((p: any) => p.profile_id) || [];
      if (memberIds.includes(userId1) && memberIds.includes(userId2)) {
        return ch.id;
      }
    }
  }

  // No existing DM — create one
  // Fetch recipient name for the channel name field
  const { data: recipientProfile } = await adminClient
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId2)
    .single();

  const channelName = recipientProfile?.full_name || recipientProfile?.email || 'Direct Message';

  const { data: channel, error: createErr } = await adminClient
    .from('messaging_channels')
    .insert({
      channel_type: 'direct',
      company_id: companyId,
      created_by: userId1,
      name: channelName,
    })
    .select('id')
    .single();

  if (createErr || !channel) {
    throw new Error(`Failed to create DM channel: ${createErr?.message || 'unknown'}`);
  }

  // Add both users as members
  const members = [
    { channel_id: channel.id, profile_id: userId1, member_role: 'admin' as const },
    { channel_id: channel.id, profile_id: userId2, member_role: 'member' as const },
  ];

  const { error: membersErr } = await adminClient
    .from('messaging_channel_members')
    .insert(members);

  if (membersErr) {
    console.error('Error adding DM channel members:', membersErr);
  }

  return channel.id;
}

/**
 * Send a ticket-related DM via the Msgly messaging system.
 * Fire-and-forget — errors are logged but do not propagate.
 */
export async function sendTicketNotificationDM(params: TicketNotificationParams): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    const channelId = await findOrCreateDMChannel(
      admin,
      params.senderId,
      params.recipientId,
      params.companyId,
    );

    // Build message content with ticket context
    const prefix = params.eventType === 'resolution'
      ? `✅ Ticket Resolved: ${params.ticketTitle}`
      : `🎫 ${params.ticketTitle}`;

    const messageContent = `${prefix}\n\n${params.content}`;

    // Fetch sender name if not provided
    let senderName = params.senderName;
    if (!senderName) {
      const { data: senderProfile } = await admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', params.senderId)
        .single();
      senderName = senderProfile?.full_name || senderProfile?.email || 'Unknown';
    }

    const { error: msgErr } = await admin
      .from('messaging_messages')
      .insert({
        channel_id: channelId,
        sender_profile_id: params.senderId,
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
