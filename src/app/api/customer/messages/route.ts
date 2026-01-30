import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/messages
 * List all message threads for customer
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id, company_id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if table exists (in case migration hasn't run)
    const { data: threads, error: threadsError } = await supabase
      .from('order_book_message_threads')
      .select('*')
      .eq('customer_id', customer.id)
      .order('last_message_at', { ascending: false });

    if (threadsError) {
      // If table doesn't exist, return empty array instead of error
      if (threadsError.code === '42P01' || threadsError.message?.includes('does not exist')) {
        console.warn('Message threads table does not exist yet');
        return NextResponse.json({
          success: true,
          data: [],
        });
      }
      console.error('Error fetching message threads:', threadsError);
      return NextResponse.json(
        { error: threadsError.message || 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Get last message and unread count for each thread
    const threadsWithDetails = await Promise.all(
      (threads || []).map(async (thread) => {
        // Get last message
        const { data: lastMessage } = await supabase
          .from('order_book_messages')
          .select('content, created_at, sender_type')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        const { count } = await supabase
          .from('order_book_messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id)
          .eq('is_read', false)
          .neq('sender_type', 'customer');

        return {
          ...thread,
          last_message: lastMessage,
          unread_count: count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: threadsWithDetails,
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/messages:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/messages
 * Create new thread and send first message
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id, company_id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { subject, content, related_order_id, related_product_id } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Create thread
    const { data: thread, error: threadError } = await supabase
      .from('order_book_message_threads')
      .insert({
        company_id: customer.company_id,
        customer_id: customer.id,
        subject,
        related_order_id,
        related_product_id,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (threadError) {
      throw threadError;
    }

    // Create first message
    const { data: message, error: messageError } = await supabase
      .from('order_book_messages')
      .insert({
        thread_id: thread.id,
        sender_type: 'customer',
        sender_id: user.id,
        content,
      })
      .select('*')
      .single();

    if (messageError) {
      throw messageError;
    }

    return NextResponse.json({
      success: true,
      data: { thread, message },
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/messages:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

