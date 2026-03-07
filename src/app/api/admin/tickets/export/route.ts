import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// TICKET EXPORT API
// ============================================================================
// Exports tickets to CSV format
// Supports same filters as ticket list
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

    // Parse filters (same as list route)
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status')?.split(',');
    const priority = searchParams.get('priority')?.split(',');
    const type = searchParams.get('type')?.split(',');
    const module = searchParams.get('module')?.split(',');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
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
        created_by_profile:profiles!support_tickets_created_by_fkey(full_name, email),
        assigned_to_profile:profiles!support_tickets_assigned_to_fkey(full_name, email),
        company:companies(name),
        site:sites(name),
        page_url
      `)
      .order('created_at', { ascending: false });

    // Company filter
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
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: tickets, error: ticketsError } = await query;

    if (ticketsError) {
      console.error('Error fetching tickets for export:', ticketsError);
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    // Generate CSV
    const headers = [
      'Ticket ID',
      'Title',
      'Status',
      'Priority',
      'Type',
      'Module',
      'Company',
      'Site',
      'Created By',
      'Created By Email',
      'Assigned To',
      'Assigned To Email',
      'Comment Count',
      'Created At',
      'Last Updated',
      'Last Comment',
      'Page URL',
      'Description'
    ];

    const csvRows = [headers.join(',')];

    (tickets || []).forEach(ticket => {
      const row = [
        ticket.id,
        `"${(ticket.title || '').replace(/"/g, '""')}"`,
        ticket.status,
        ticket.priority,
        ticket.type,
        ticket.module,
        `"${((ticket.company as any)?.name || '').replace(/"/g, '""')}"`,
        `"${((ticket.site as any)?.name || 'N/A').replace(/"/g, '""')}"`,
        `"${((ticket.created_by_profile as any)?.full_name || 'Unknown').replace(/"/g, '""')}"`,
        `"${((ticket.created_by_profile as any)?.email || '').replace(/"/g, '""')}"`,
        `"${((ticket.assigned_to_profile as any)?.full_name || 'Unassigned').replace(/"/g, '""')}"`,
        `"${((ticket.assigned_to_profile as any)?.email || '').replace(/"/g, '""')}"`,
        ticket.comment_count || 0,
        ticket.created_at,
        ticket.updated_at,
        ticket.last_comment_at || 'N/A',
        `"${(ticket.page_url || '').replace(/"/g, '""')}"`,
        `"${(ticket.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');
    const filename = `tickets-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error in GET /api/admin/tickets/export:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
