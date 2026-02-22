import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// TICKET STATS API
// ============================================================================
// Provides aggregate statistics for tickets
// Used for dashboard widgets and overview pages
// ============================================================================

export async function GET(request: NextRequest) {
  try {
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

    const isAdmin = profile.is_platform_admin ||
                   profile.app_role === 'Admin' ||
                   profile.app_role === 'Owner';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Base query - platform admins see all, company admins see their company
    let baseQuery = supabase.from('support_tickets').select('*');

    if (!profile.is_platform_admin) {
      baseQuery = baseQuery.eq('company_id', profile.company_id);
    }

    const { data: tickets, error: ticketsError } = await baseQuery;

    if (ticketsError) {
      console.error('Error fetching tickets for stats:', ticketsError);
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    const ticketList = tickets || [];

    // Calculate stats
    const total = ticketList.length;
    const open = ticketList.filter(t => t.status === 'open').length;
    const in_progress = ticketList.filter(t => t.status === 'in_progress').length;
    const resolved = ticketList.filter(t => t.status === 'resolved').length;
    const closed = ticketList.filter(t => t.status === 'closed').length;
    const high_priority = ticketList.filter(t => t.priority === 'high').length;
    const urgent_priority = ticketList.filter(t => t.priority === 'urgent').length;

    // By module
    const by_module: Record<string, number> = {
      checkly: ticketList.filter(t => t.module === 'checkly').length,
      stockly: ticketList.filter(t => t.module === 'stockly').length,
      teamly: ticketList.filter(t => t.module === 'teamly').length,
      planly: ticketList.filter(t => t.module === 'planly').length,
      assetly: ticketList.filter(t => t.module === 'assetly').length,
      msgly: ticketList.filter(t => t.module === 'msgly').length,
      general: ticketList.filter(t => t.module === 'general').length,
    };

    // By type
    const by_type: Record<string, number> = {
      issue: ticketList.filter(t => t.type === 'issue').length,
      idea: ticketList.filter(t => t.type === 'idea').length,
      question: ticketList.filter(t => t.type === 'question').length,
    };

    // Calculate average response time (time from creation to first comment)
    let responseTimeHours: number | null = null;
    const ticketsWithComments = ticketList.filter(t => t.last_comment_at);
    if (ticketsWithComments.length > 0) {
      const totalResponseTime = ticketsWithComments.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at).getTime();
        const firstComment = new Date(ticket.last_comment_at!).getTime();
        const diffHours = (firstComment - created) / (1000 * 60 * 60);
        return sum + diffHours;
      }, 0);
      responseTimeHours = totalResponseTime / ticketsWithComments.length;
    }

    // Calculate average resolution time (time from creation to resolved/closed)
    let resolutionTimeHours: number | null = null;
    const resolvedTickets = ticketList.filter(t => t.status === 'resolved' || t.status === 'closed');
    if (resolvedTickets.length > 0) {
      const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at).getTime();
        const resolved = new Date(ticket.last_status_change_at || ticket.updated_at).getTime();
        const diffHours = (resolved - created) / (1000 * 60 * 60);
        return sum + diffHours;
      }, 0);
      resolutionTimeHours = totalResolutionTime / resolvedTickets.length;
    }

    return NextResponse.json({
      total,
      open,
      in_progress,
      resolved,
      closed,
      high_priority,
      urgent_priority,
      by_module,
      by_type,
      avg_response_time_hours: responseTimeHours,
      avg_resolution_time_hours: resolutionTimeHours,
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/tickets/stats:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
