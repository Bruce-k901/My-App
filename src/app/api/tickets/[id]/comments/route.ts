import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendTicketNotificationDM } from '@/lib/messaging/ticket-bridge';

// ============================================================================
// USER TICKET COMMENTS API
// ============================================================================
// POST: Add reply to user's own ticket
// Users cannot create internal notes (that's admin-only)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { content, source } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check ticket access - user must be creator or assigned
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('created_by, assigned_to, title, module, company_id')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.created_by !== user.id && ticket.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create comment - always non-internal for regular users
    // Trigger will handle activity updates and notifications
    const { data: comment, error: commentError } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_id: user.id,
        content: content.trim(),
        is_internal: false, // Regular users cannot create internal notes
      })
      .select(`
        *,
        author:profiles!ticket_comments_author_id_fkey(
          full_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: commentError.message }, { status: 500 });
    }

    // Send Msgly DM to the assigned admin (skip if source is msgly to prevent loops)
    if (source !== 'msgly') {
      const recipientId = ticket.assigned_to || null;
      if (recipientId && recipientId !== user.id) {
        const authorData = (comment as any)?.author;
        // Must await — serverless context dies after response is sent
        await sendTicketNotificationDM({
          ticketId,
          ticketTitle: ticket.title || 'Support Ticket',
          ticketModule: ticket.module,
          companyId: ticket.company_id,
          senderId: user.id,
          recipientId,
          content: content.trim(),
          commentId: comment.id,
          senderName: authorData?.full_name || authorData?.email,
          isAdminReply: false,
          eventType: 'comment',
          supabase,
        });
      }
    }

    return NextResponse.json({ success: true, comment });

  } catch (error: any) {
    console.error('Error in POST /api/tickets/[id]/comments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
