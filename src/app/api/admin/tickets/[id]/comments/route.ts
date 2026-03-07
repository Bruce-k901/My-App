import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendTicketNotificationDM } from '@/lib/messaging/ticket-bridge';

// ============================================================================
// TICKET COMMENTS API
// ============================================================================
// GET: List comments for a ticket
// POST: Add new comment to ticket
// ============================================================================

export async function GET(
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, app_role, is_platform_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check ticket access
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('company_id, created_by, assigned_to')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isAdmin = profile.is_platform_admin ||
                   profile.app_role === 'Admin' ||
                   profile.app_role === 'Owner';
    const hasAccess = ticket.created_by === user.id ||
                     ticket.assigned_to === user.id ||
                     (ticket.company_id === profile.company_id && isAdmin);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comments - RLS handles internal note filtering
    const { data: commentsData, error: commentsError } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return NextResponse.json({ error: commentsError.message }, { status: 500 });
    }

    // Get author profiles for comments
    const authorIds = [...new Set((commentsData || []).map(c => c.author_id))];
    const authorProfilesMap = new Map<string, any>();

    if (authorIds.length > 0) {
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('auth_user_id, full_name, email, avatar_url')
        .in('auth_user_id', authorIds);

      (authorProfiles || []).forEach(profile => {
        authorProfilesMap.set(profile.auth_user_id, profile);
      });
    }

    // Get attachments for comments
    const commentIds = (commentsData || []).map(c => c.id);
    let attachmentMap = new Map<string, any[]>();

    if (commentIds.length > 0) {
      const { data: attachments } = await supabase
        .from('ticket_attachments')
        .select('*')
        .in('comment_id', commentIds);

      (attachments || []).forEach(att => {
        if (!attachmentMap.has(att.comment_id)) {
          attachmentMap.set(att.comment_id, []);
        }
        attachmentMap.get(att.comment_id)!.push(att);
      });
    }

    const shaped = (commentsData || []).map(comment => ({
      ...comment,
      author: authorProfilesMap.get(comment.author_id) || null,
      attachments: attachmentMap.get(comment.id) || [],
    }));

    return NextResponse.json({ comments: shaped });

  } catch (error: any) {
    console.error('Error in GET /api/admin/tickets/[id]/comments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, app_role, is_platform_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    const body = await request.json();
    const { content, is_internal = false, source } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check ticket access
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('company_id, created_by, assigned_to, title, module')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isAdmin = profile.is_platform_admin ||
                   profile.app_role === 'Admin' ||
                   profile.app_role === 'Owner';
    const hasAccess = ticket.created_by === user.id ||
                     ticket.assigned_to === user.id ||
                     (ticket.company_id === profile.company_id && isAdmin);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only admins can create internal notes
    if (is_internal && !isAdmin) {
      return NextResponse.json({ error: 'Only admins can create internal notes' }, { status: 403 });
    }

    // Create comment - trigger will handle activity updates
    const { data: comment, error: commentError } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_id: user.id,
        content: content.trim(),
        is_internal,
      })
      .select('*')
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json({ error: commentError.message }, { status: 500 });
    }

    // Get author profile separately
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('auth_user_id, full_name, email, avatar_url')
      .eq('auth_user_id', user.id)
      .single();

    const commentWithAuthor = {
      ...comment,
      author: authorProfile || null,
    };

    // Send Msgly DM for non-internal replies (skip if source is msgly to prevent loops)
    // Must await — serverless context dies after response is sent
    if (!is_internal && source !== 'msgly' && ticket.created_by !== user.id) {
      await sendTicketNotificationDM({
        ticketId,
        ticketTitle: ticket.title || 'Support Ticket',
        ticketModule: ticket.module,
        companyId: ticket.company_id,
        senderId: user.id,
        recipientId: ticket.created_by,
        content: content.trim(),
        commentId: comment.id,
        senderName: authorProfile?.full_name || authorProfile?.email,
        isAdminReply: true,
        eventType: 'comment',
        supabase,
      });
    }

    return NextResponse.json({ success: true, comment: commentWithAuthor });

  } catch (error: any) {
    console.error('Error in POST /api/admin/tickets/[id]/comments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
