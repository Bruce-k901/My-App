import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// ATTACHMENT DOWNLOAD API
// ============================================================================
// Serves ticket attachments (screenshots) from Supabase Storage
// Validates user access before serving files
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attachmentId } = await params;
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

    // Get attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('ticket_attachments')
      .select(`
        *,
        ticket:support_tickets(
          company_id,
          created_by,
          assigned_to
        )
      `)
      .eq('id', attachmentId)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Check access to the ticket
    const ticket = attachment.ticket;
    const isAdmin = profile.is_platform_admin ||
                   profile.app_role === 'Admin' ||
                   profile.app_role === 'Owner';
    const hasAccess = ticket.created_by === user.id ||
                     ticket.assigned_to === user.id ||
                     (ticket.company_id === profile.company_id && isAdmin);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('support-tickets')
      .download(attachment.file_path);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.file_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${attachment.file_name}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error: any) {
    console.error('Error in GET /api/attachments/[id]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
