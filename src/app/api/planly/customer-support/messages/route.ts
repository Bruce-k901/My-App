import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/planly/customer-support/messages
 * List all customer message threads for the admin's company.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

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

    const { data: threads, error: threadsError } = await supabase
      .from('order_book_message_threads')
      .select(`
        *,
        customer:planly_customers(id, name, email)
      `)
      .eq('company_id', profile!.company_id)
      .order('last_message_at', { ascending: false });

    if (threadsError) {
      if (threadsError.code === '42P01') {
        return NextResponse.json({ success: true, data: [] });
      }
      throw threadsError;
    }

    // Get last message and unread count for each thread
    const threadsWithDetails = await Promise.all(
      (threads || []).map(async (thread) => {
        const { data: lastMessage } = await supabase
          .from('order_book_messages')
          .select('content, created_at, sender_type')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Unread = messages from customer that admin hasn't read
        const { count } = await supabase
          .from('order_book_messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id)
          .eq('is_read', false)
          .eq('sender_type', 'customer');

        return {
          ...thread,
          last_message: lastMessage,
          unread_count: count || 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: threadsWithDetails });
  } catch (error: any) {
    console.error('Error in GET /api/planly/customer-support/messages:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
