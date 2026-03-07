import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// USER MY TICKETS API
// ============================================================================
// Lists tickets created by the current user
// Accessible by any authenticated user for their own tickets
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status')?.split(',');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Build query - only tickets created by this user
    let query = supabase
      .from('support_tickets')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        type,
        module,
        created_at,
        updated_at,
        last_comment_at,
        comment_count,
        assigned_to
      `, { count: 'exact' })
      .eq('created_by', user.id);

    // Apply filters
    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    // Sort by most recent activity
    query = query.order('last_comment_at', { ascending: false, nullsFirst: false });
    query = query.order('created_at', { ascending: false });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: tickets, error: ticketsError, count } = await query;

    if (ticketsError) {
      console.error('Error fetching user tickets:', ticketsError);
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    // Get assigned_to profiles separately
    const assignedToIds = [...new Set((tickets || []).map(t => t.assigned_to).filter(Boolean))];
    const assignedToProfilesMap = new Map<string, string>();

    if (assignedToIds.length > 0) {
      const { data: assignedToProfiles } = await supabase
        .from('profiles')
        .select('auth_user_id, full_name')
        .in('auth_user_id', assignedToIds);

      (assignedToProfiles || []).forEach(profile => {
        assignedToProfilesMap.set(profile.auth_user_id, profile.full_name);
      });
    }

    // Get unread counts
    const ticketIds = (tickets || []).map(t => t.id);
    let unreadMap = new Map<string, number>();

    if (ticketIds.length > 0) {
      const { data: notifications } = await supabase
        .from('ticket_notifications')
        .select('ticket_id, unread_count')
        .in('ticket_id', ticketIds)
        .eq('user_id', user.id);

      (notifications || []).forEach(n => {
        unreadMap.set(n.ticket_id, n.unread_count);
      });
    }

    // Check for attachments
    let attachmentMap = new Map<string, boolean>();
    if (ticketIds.length > 0) {
      const { data: attachments } = await supabase
        .from('ticket_attachments')
        .select('ticket_id')
        .in('ticket_id', ticketIds);

      (attachments || []).forEach(a => {
        attachmentMap.set(a.ticket_id, true);
      });
    }

    // Shape response
    const ticketList = (tickets || []).map(ticket => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      type: ticket.type,
      module: ticket.module,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      last_comment_at: ticket.last_comment_at,
      comment_count: ticket.comment_count,
      assigned_to_name: ticket.assigned_to ? assignedToProfilesMap.get(ticket.assigned_to) || 'Support Team' : 'Support Team',
      unread_count: unreadMap.get(ticket.id) || 0,
      has_attachments: attachmentMap.get(ticket.id) || false,
    }));

    return NextResponse.json({
      tickets: ticketList,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > to + 1,
    });

  } catch (error: any) {
    console.error('Error in GET /api/tickets/my-tickets:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
