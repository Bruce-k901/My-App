import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// TICKET CREATION API
// ============================================================================
// Creates support tickets with optional screenshot attachments
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Ticket API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, module, title, description, page_url, screenshot, company_id, site_id } = body;

    console.log('[Ticket API] Received request:', {
      type,
      module,
      title,
      company_id,
      site_id,
      auth_user_id: user.id,
      hasScreenshot: !!screenshot
    });

    // Validate required fields
    if (!type || !module || !title || !description || !company_id) {
      console.error('[Ticket API] Missing required fields:', {
        type: !!type,
        module: !!module,
        title: !!title,
        description: !!description,
        company_id: !!company_id
      });
      return NextResponse.json(
        { error: 'Missing required fields: type, module, title, description, company_id' },
        { status: 400 }
      );
    }

    // Validate type enum
    if (!['issue', 'idea', 'question'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: issue, idea, or question' },
        { status: 400 }
      );
    }

    // Module validation removed - accept any module value to allow questions from any context

    const supabaseAdmin = getSupabaseAdmin();

    // Create ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        company_id,
        site_id: site_id || null,
        created_by: user.id,
        type,
        module,
        title,
        description,
        page_url: page_url || null,
        status: 'open',
        priority: 'medium'
      })
      .select()
      .single();

    if (ticketError) {
      console.error('[Ticket API] Error creating ticket:', {
        code: ticketError.code,
        message: ticketError.message,
        details: ticketError.details,
        hint: ticketError.hint,
        auth_user_id: user.id
      });
      return NextResponse.json(
        {
          error: 'Failed to create ticket',
          details: ticketError.message,
          code: ticketError.code,
          hint: ticketError.hint
        },
        { status: 500 }
      );
    }

    // Create initial history entry for ticket creation
    await supabaseAdmin
      .from('ticket_history')
      .insert({
        ticket_id: ticket.id,
        changed_by: user.id,
        change_type: 'created',
        new_value: 'open',
      });

    // Create initial notification for assigned user (if auto-assigned)
    if (ticket.assigned_to) {
      await supabaseAdmin
        .from('ticket_notifications')
        .insert({
          ticket_id: ticket.id,
          user_id: ticket.assigned_to,
          unread_count: 1,
        });
    }

    // Handle screenshot upload if provided
    if (screenshot && ticket) {
      try {
        // Screenshot should be base64 data URL
        // Format: data:image/png;base64,iVBORw0KGgo...
        const base64Data = screenshot.split(',')[1]; // Remove data:image/png;base64, prefix
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate file path: support-tickets/{company_id}/{ticket_id}/screenshot_{timestamp}.png
        const timestamp = Date.now();
        const filePath = `${company_id}/${ticket.id}/screenshot_${timestamp}.png`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from('support-tickets')
          .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading screenshot:', uploadError);
          // Don't fail the whole request if screenshot upload fails
          // Ticket is already created
        } else {
          // Create attachment record
          const { error: attachmentError } = await supabaseAdmin
            .from('ticket_attachments')
            .insert({
              ticket_id: ticket.id,
              file_name: `screenshot_${timestamp}.png`,
              file_path: filePath,
              file_type: 'image/png',
              file_size: buffer.length
            });

          if (attachmentError) {
            console.error('Error creating attachment record:', attachmentError);
            // Ticket and file are created, just attachment record failed
          }
        }
      } catch (screenshotError: any) {
        console.error('Error processing screenshot:', screenshotError);
        // Don't fail the whole request
      }
    }

    // Get assigned user name for response
    let assignedToName = 'Support Team';
    if (ticket.assigned_to) {
      const { data: assignedUser } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('auth_user_id', ticket.assigned_to)
        .single();

      if (assignedUser?.full_name) {
        assignedToName = assignedUser.full_name;
      }
    }

    return NextResponse.json({
      ticketId: ticket.id,
      ticketNumber: `TICKET-${ticket.id.substring(0, 8).toUpperCase()}`,
      assignedTo: assignedToName,
      message: `Ticket created and assigned to ${assignedToName}`
    });

  } catch (error: any) {
    console.error('Ticket API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process ticket creation' },
      { status: 500 }
    );
  }
}
