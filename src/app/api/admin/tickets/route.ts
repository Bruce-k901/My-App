import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { TicketStatus, TicketPriority, TicketType, TicketModule } from '@/types/tickets';

// ============================================================================
// ADMIN TICKET LIST API
// ============================================================================
// Lists all tickets with filtering, search, and pagination
// Accessible by platform admins and company admins/owners
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, app_role, is_platform_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is admin
    const isAdmin = profile.is_platform_admin ||
                   profile.app_role === 'Admin' ||
                   profile.app_role === 'Owner';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');
    const status = searchParams.get('status')?.split(',') as TicketStatus[] | undefined;
    const priority = searchParams.get('priority')?.split(',') as TicketPriority[] | undefined;
    const type = searchParams.get('type')?.split(',') as TicketType[] | undefined;
    const module = searchParams.get('module')?.split(',') as TicketModule[] | undefined;
    const assignedTo = searchParams.get('assignedTo')?.split(',');
    const createdBy = searchParams.get('createdBy')?.split(',');
    const companyId = searchParams.get('companyId')?.split(',');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Build base query - platform admins see all, company admins see their company
    let query = supabase
      .from('support_tickets')
      .select('*', { count: 'exact' });

    // Company filter for non-platform admins
    if (!profile.is_platform_admin) {
      query = query.eq('company_id', profile.company_id);
    }

    // Apply filters
    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (priority && priority.length > 0) {
      query = query.in('priority', priority);
    }

    if (type && type.length > 0) {
      query = query.in('type', type);
    }

    if (module && module.length > 0) {
      query = query.in('module', module);
    }

    if (assignedTo && assignedTo.length > 0) {
      query = query.in('assigned_to', assignedTo);
    }

    if (createdBy && createdBy.length > 0) {
      query = query.in('created_by', createdBy);
    }

    if (companyId && companyId.length > 0 && profile.is_platform_admin) {
      query = query.in('company_id', companyId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    const ascending = sortDirection === 'asc';
    query = query.order(sortField, { ascending });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: tickets, error: ticketsError, count } = await query;

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    // Get all related data
    const ticketIds = (tickets || []).map(t => t.id);
    const userIds = [...new Set([
      ...(tickets || []).map(t => t.created_by),
      ...(tickets || []).filter(t => t.assigned_to).map(t => t.assigned_to!),
    ])];
    const companyIds = [...new Set((tickets || []).map(t => t.company_id))];

    // Fetch user profiles
    let profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('auth_user_id, full_name')
        .in('auth_user_id', userIds);

      (profiles || []).forEach(p => {
        profileMap.set(p.auth_user_id, p.full_name);
      });
    }

    // Fetch companies
    let companyMap = new Map<string, string>();
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      (companies || []).forEach(c => {
        companyMap.set(c.id, c.name);
      });
    }

    // Get notification counts for tickets
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
      created_by_name: profileMap.get(ticket.created_by) || 'Unknown',
      assigned_to_name: ticket.assigned_to ? profileMap.get(ticket.assigned_to) : null,
      company_name: companyMap.get(ticket.company_id) || 'Unknown',
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
    console.error('Error in GET /api/admin/tickets:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
