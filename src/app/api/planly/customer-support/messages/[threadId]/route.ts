import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/planly/customer-support/messages/[threadId]
 * Get messages in a thread (admin view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { threadId } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, is_platform_admin, app_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isAdmin = profile?.is_platform_admin || ['Owner', 'Admin', 'Manager'].includes(profile?.app_role || '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Verify thread belongs to admin's company
    const { data: thread, error: threadError } = await supabase
      .from('order_book_message_threads')
      .select(`
        *,
        customer:planly_customers(id, name, email)
      `)
      .eq('id', threadId)
      .eq('company_id', profile!.company_id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('order_book_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    // Mark customer messages as read by admin
    await supabase
      .from('order_book_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('is_read', false)
      .eq('sender_type', 'customer');

    return NextResponse.json({
      success: true,
      data: { thread, messages: messages || [] },
    });
  } catch (error: any) {
    console.error('Error in GET /api/planly/customer-support/messages/[threadId]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/planly/customer-support/messages/[threadId]
 * Admin sends reply in thread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { threadId } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, full_name, is_platform_admin, app_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isAdmin = profile?.is_platform_admin || ['Owner', 'Admin', 'Manager'].includes(profile?.app_role || '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Verify thread belongs to admin's company
    const { data: thread } = await supabase
      .from('order_book_message_threads')
      .select('id')
      .eq('id', threadId)
      .eq('company_id', profile!.company_id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content, attachments } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Create admin message
    const { data: message, error: messageError } = await supabase
      .from('order_book_messages')
      .insert({
        thread_id: threadId,
        sender_type: 'admin',
        sender_id: user.id,
        sender_name: profile?.full_name || 'Admin',
        content,
        attachments: attachments || [],
      })
      .select('*')
      .single();

    if (messageError) {
      throw messageError;
    }

    // Update thread last_message_at
    await supabase
      .from('order_book_message_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', threadId);

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error in POST /api/planly/customer-support/messages/[threadId]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
