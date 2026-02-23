import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// USER MARK TICKET AS READ API
// ============================================================================
// Resets unread_count in ticket_notifications for the current user
// Uses UPDATE (not UPSERT) to avoid missing INSERT policy on
// ticket_notifications — the trigger creates the row, we just clear it.
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

    // Check ticket exists and user has access (creator or assigned)
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id, created_by, assigned_to')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.created_by !== user.id && ticket.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // UPDATE existing notification row (created by the DB trigger)
    // Using UPDATE instead of UPSERT avoids needing an INSERT policy
    const { error: notificationError } = await supabase
      .from('ticket_notifications')
      .update({
        last_read_at: new Date().toISOString(),
        unread_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('ticket_id', ticketId)
      .eq('user_id', user.id);

    if (notificationError) {
      console.error('Error marking ticket as read:', notificationError);
      return NextResponse.json({ error: notificationError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in POST /api/tickets/[id]/mark-read:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
