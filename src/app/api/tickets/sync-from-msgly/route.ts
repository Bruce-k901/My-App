import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// SYNC MSGLY REPLY → TICKET COMMENT
// ============================================================================
// When a user replies to a ticket-sourced Msgly message, this endpoint
// creates a corresponding ticket comment so the admin sees it in the
// ticket thread.  The comment is created with source='msgly' so the
// ticket comment API does NOT re-send a DM (loop prevention).
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, parentMessageId } = body;

    if (!messageId || !parentMessageId) {
      return NextResponse.json({ error: 'messageId and parentMessageId are required' }, { status: 400 });
    }

    // Fetch the parent message to get ticket metadata
    const { data: parentMsg, error: parentErr } = await supabase
      .from('messaging_messages')
      .select('metadata')
      .eq('id', parentMessageId)
      .single();

    if (parentErr || !parentMsg) {
      return NextResponse.json({ error: 'Parent message not found' }, { status: 404 });
    }

    const ticketId = parentMsg.metadata?.ticket_id;
    if (!ticketId || parentMsg.metadata?.source !== 'ticket_comment') {
      // Parent is not a ticket message — nothing to sync
      return NextResponse.json({ synced: false, reason: 'not_ticket_message' });
    }

    // Fetch the reply message content
    const { data: replyMsg, error: replyErr } = await supabase
      .from('messaging_messages')
      .select('content, sender_profile_id')
      .eq('id', messageId)
      .single();

    if (replyErr || !replyMsg) {
      return NextResponse.json({ error: 'Reply message not found' }, { status: 404 });
    }

    // Verify the sender is the authenticated user
    if (replyMsg.sender_profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check ticket access
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('created_by, assigned_to')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.created_by !== user.id && ticket.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create ticket comment with source='msgly' to prevent DM loop
    const { data: comment, error: commentErr } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_id: user.id,
        content: replyMsg.content,
        is_internal: false,
      })
      .select('id')
      .single();

    if (commentErr) {
      console.error('sync-from-msgly: failed to create comment', commentErr);
      return NextResponse.json({ error: commentErr.message }, { status: 500 });
    }

    return NextResponse.json({ synced: true, commentId: comment.id });

  } catch (error: any) {
    console.error('Error in POST /api/tickets/sync-from-msgly:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
