import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendTicketNotificationDM } from '@/lib/messaging/ticket-bridge';

// ============================================================================
// ADMIN TICKET DETAIL API
// ============================================================================
// Get full ticket details with comments and history
// Update ticket status, priority, or assignment
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

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        company:companies(name),
        site:sites(name)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      if (ticketError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      console.error('Error fetching ticket:', ticketError);
      return NextResponse.json({ error: ticketError.message }, { status: 500 });
    }

    // Get created_by profile
    let created_by_profile = null;
    if (ticket.created_by) {
      const { data: createdByProfile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('auth_user_id', ticket.created_by)
        .single();
      created_by_profile = createdByProfile;
    }

    // Get assigned_to profile
    let assigned_to_profile = null;
    if (ticket.assigned_to) {
      const { data: assignedToProfile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('auth_user_id', ticket.assigned_to)
        .single();
      assigned_to_profile = assignedToProfile;
    }

    // Check access permissions
    const hasAccess = profile.is_platform_admin ||
                     ticket.company_id === profile.company_id ||
                     ticket.created_by === user.id ||
                     ticket.assigned_to === user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comments
    const { data: commentsData } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

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

    const comments = (commentsData || []).map(comment => ({
      ...comment,
      author: authorProfilesMap.get(comment.author_id) || null
    }));

    // Get comment attachments
    const commentIds = (comments || []).map(c => c.id);
    let commentAttachmentsMap = new Map<string, any[]>();

    if (commentIds.length > 0) {
      const { data: commentAttachments } = await supabase
        .from('ticket_attachments')
        .select('*')
        .in('comment_id', commentIds);

      (commentAttachments || []).forEach(att => {
        if (!commentAttachmentsMap.has(att.comment_id)) {
          commentAttachmentsMap.set(att.comment_id, []);
        }
        commentAttachmentsMap.get(att.comment_id)!.push(att);
      });
    }

    // Get ticket-level attachments (initial screenshots)
    const { data: ticketAttachments } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .is('comment_id', null);

    // Get history
    const { data: historyData } = await supabase
      .from('ticket_history')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    // Get profiles for history
    const changedByIds = [...new Set((historyData || []).map(h => h.changed_by))];
    const changedByProfilesMap = new Map<string, any>();

    if (changedByIds.length > 0) {
      const { data: changedByProfiles } = await supabase
        .from('profiles')
        .select('auth_user_id, full_name, avatar_url')
        .in('auth_user_id', changedByIds);

      (changedByProfiles || []).forEach(profile => {
        changedByProfilesMap.set(profile.auth_user_id, profile);
      });
    }

    const history = (historyData || []).map(h => ({
      ...h,
      changed_by_profile: changedByProfilesMap.get(h.changed_by) || null
    }));

    // Get unread count for current user
    const { data: notification } = await supabase
      .from('ticket_notifications')
      .select('unread_count')
      .eq('ticket_id', ticketId)
      .eq('user_id', user.id)
      .single();

    // Shape response
    const response = {
      ...ticket,
      created_by_profile,
      assigned_to_profile,
      attachments: ticketAttachments || [],
      comments: comments.map(comment => ({
        ...comment,
        attachments: commentAttachmentsMap.get(comment.id) || [],
      })),
      history,
      unread_count: notification?.unread_count || 0,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in GET /api/admin/tickets/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { status, priority, assigned_to } = body;

    // Get ticket to check permissions
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('company_id, created_by, assigned_to, title, module, status')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = profile.is_platform_admin ||
                   profile.app_role === 'Admin' ||
                   profile.app_role === 'Owner';
    const hasAccess = isAdmin ||
                     ticket.assigned_to === user.id ||
                     (ticket.company_id === profile.company_id && isAdmin);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update object
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update ticket - triggers will handle history and notifications
    const { data: updatedTicket, error: updateError } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send resolution DM when ticket is resolved or closed
    const wasNotResolved = ticket.status !== 'resolved' && ticket.status !== 'closed';
    const isNowResolved = status === 'resolved' || status === 'closed';
    if (wasNotResolved && isNowResolved && ticket.created_by !== user.id) {
      const statusLabel = status === 'resolved' ? 'resolved' : 'closed';
      // Must await — serverless context dies after response is sent
      await sendTicketNotificationDM({
        ticketId,
        ticketTitle: ticket.title || 'Support Ticket',
        ticketModule: ticket.module,
        companyId: ticket.company_id,
        senderId: user.id,
        recipientId: ticket.created_by,
        content: `Your ticket has been ${statusLabel}. If you have any further questions, feel free to reply.`,
        isAdminReply: true,
        eventType: 'resolution',
      });
    }

    return NextResponse.json({ success: true, ticket: updatedTicket });

  } catch (error: any) {
    console.error('Error in PATCH /api/admin/tickets/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
