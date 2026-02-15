import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/messages/[threadId]
 * Get messages in a thread
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record from planly
    const { data: customer } = await supabase
      .from('planly_customers')
      .select('id')
      .eq('email', user.email?.toLowerCase() || '')
      .eq('is_active', true)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { threadId } = params;

    // Verify thread belongs to customer
    const { data: thread, error: threadError } = await supabase
      .from('order_book_message_threads')
      .select('*')
      .eq('id', threadId)
      .eq('customer_id', customer.id)
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

    // Mark messages as read
    await supabase
      .from('order_book_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('is_read', false)
      .neq('sender_type', 'customer');

    return NextResponse.json({
      success: true,
      data: { thread, messages: messages || [] },
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/messages/[threadId]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/messages/[threadId]
 * Send message in existing thread
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record from planly
    const { data: customer } = await supabase
      .from('planly_customers')
      .select('id')
      .eq('email', user.email?.toLowerCase() || '')
      .eq('is_active', true)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { threadId } = params;
    const body = await request.json();
    const { content, attachments } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify thread belongs to customer
    const { data: thread, error: threadError } = await supabase
      .from('order_book_message_threads')
      .select('id')
      .eq('id', threadId)
      .eq('customer_id', customer.id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('order_book_messages')
      .insert({
        thread_id: threadId,
        sender_type: 'customer',
        sender_id: user.id,
        content,
        attachments: attachments || [],
      })
      .select('*')
      .single();

    if (messageError) {
      throw messageError;
    }

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/messages/[threadId]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

