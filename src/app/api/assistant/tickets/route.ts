import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// ============================================================================
// TICKET CREATION API
// ============================================================================
// Creates support tickets with optional screenshot attachments
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, module, title, description, page_url, screenshot, company_id, site_id, user_id } = body;

    // Validate required fields
    if (!type || !module || !title || !description || !company_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: type, module, title, description, company_id, user_id' },
        { status: 400 }
      );
    }

    // Validate type and module enums
    if (!['issue', 'idea', 'question'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: issue, idea, or question' },
        { status: 400 }
      );
    }

    if (!['checkly', 'stockly', 'teamly', 'planly', 'assetly', 'msgly', 'general'].includes(module)) {
      return NextResponse.json(
        { error: 'Invalid module. Must be one of: checkly, stockly, teamly, planly, assetly, msgly, general' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        company_id,
        site_id: site_id || null,
        created_by: user_id,
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
      console.error('Error creating ticket:', ticketError);
      return NextResponse.json(
        { error: 'Failed to create ticket', details: ticketError.message },
        { status: 500 }
      );
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
        const { error: uploadError } = await supabase.storage
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
          const { error: attachmentError } = await supabase
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
      const { data: assignedUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ticket.assigned_to)
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
