import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// MARK TICKET AS READ API
// ============================================================================
// Marks a ticket as read by the current user
// Resets unread_count in ticket_notifications
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

    // Check if ticket exists and user has access (RLS will handle this)
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // UPDATE existing notification row (created by the DB trigger)
    // Using UPDATE instead of UPSERT avoids needing an INSERT policy
    // (the "System can insert ticket notifications" policy was dropped)
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
    console.error('Error in POST /api/admin/tickets/[id]/mark-read:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
