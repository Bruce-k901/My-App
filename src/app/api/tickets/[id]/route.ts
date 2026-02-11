import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// USER TICKET DETAIL API
// ============================================================================
// Get full ticket details for tickets the user created
// Users can only see their own tickets unless they're assigned
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

    // Get ticket - RLS will handle access control
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
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

    // Double-check access (belt and suspenders with RLS)
    if (ticket.created_by !== user.id && ticket.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get assigned_to profile separately
    let assigned_to_profile = null;
    if (ticket.assigned_to) {
      const { data: assignedToProfile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('auth_user_id', ticket.assigned_to)
        .single();
      assigned_to_profile = assignedToProfile;
    }

    // Get comments (non-internal only for non-admins) - RLS handles this
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
      assigned_to_profile,
      attachments: ticketAttachments || [],
      comments: comments.map(comment => ({
        ...comment,
        attachments: commentAttachmentsMap.get(comment.id) || [],
      })),
      unread_count: notification?.unread_count || 0,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in GET /api/tickets/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
