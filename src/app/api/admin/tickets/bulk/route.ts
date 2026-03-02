import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// BULK TICKET OPERATIONS API
// ============================================================================
// Perform bulk operations on multiple tickets
// Supports: update_status, update_priority, assign, close
// ============================================================================

export async function POST(request: NextRequest) {
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

    // Check admin permissions
    const isAdmin = profile.is_platform_admin ||
                   profile.app_role === 'Admin' ||
                   profile.app_role === 'Owner';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ticketIds, operation, value } = body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json({ error: 'ticketIds array is required' }, { status: 400 });
    }

    if (!operation) {
      return NextResponse.json({ error: 'operation is required' }, { status: 400 });
    }

    // Verify tickets exist and user has access
    let ticketQuery = supabase
      .from('support_tickets')
      .select('id, company_id')
      .in('id', ticketIds);

    // Non-platform admins can only bulk-update their company's tickets
    if (!profile.is_platform_admin) {
      ticketQuery = ticketQuery.eq('company_id', profile.company_id);
    }

    const { data: tickets, error: ticketsError } = await ticketQuery;

    if (ticketsError) {
      console.error('Error fetching tickets for bulk operation:', ticketsError);
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: 'No accessible tickets found' }, { status: 404 });
    }

    const accessibleTicketIds = tickets.map(t => t.id);

    // Build update object based on operation
    let updates: any = {};

    switch (operation) {
      case 'update_status':
        if (!value) {
          return NextResponse.json({ error: 'value is required for update_status' }, { status: 400 });
        }
        if (!['open', 'in_progress', 'resolved', 'closed'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
        }
        updates.status = value;
        break;

      case 'update_priority':
        if (!value) {
          return NextResponse.json({ error: 'value is required for update_priority' }, { status: 400 });
        }
        if (!['low', 'medium', 'high', 'urgent'].includes(value)) {
          return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 });
        }
        updates.priority = value;
        break;

      case 'assign':
        if (!value) {
          return NextResponse.json({ error: 'value (user_id) is required for assign' }, { status: 400 });
        }
        // Verify assignee exists and has access
        const { data: assignee } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', value)
          .single();

        if (!assignee) {
          return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
        }
        updates.assigned_to = value;
        break;

      case 'close':
        updates.status = 'closed';
        break;

      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    // Perform bulk update - triggers will handle history for each ticket
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update(updates)
      .in('id', accessibleTicketIds);

    if (updateError) {
      console.error('Error performing bulk update:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated_count: accessibleTicketIds.length,
      operation,
    });

  } catch (error: any) {
    console.error('Error in POST /api/admin/tickets/bulk:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
