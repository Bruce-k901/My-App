import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/customer/issues/[issueId]/comments
 * Add comment to issue
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { issueId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { issueId } = params;
    const body = await request.json();
    const { comment, attachments } = body;

    if (!comment) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    // Verify issue belongs to customer
    const { data: issue, error: issueError } = await supabase
      .from('order_book_issues')
      .select('id')
      .eq('id', issueId)
      .eq('customer_id', customer.id)
      .single();

    if (issueError || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // Create comment
    const { data: commentData, error: commentError } = await supabase
      .from('order_book_issue_comments')
      .insert({
        issue_id: issueId,
        commenter_type: 'customer',
        commenter_id: user.id,
        comment,
        attachments: attachments || [],
      })
      .select('*')
      .single();

    if (commentError) {
      throw commentError;
    }

    return NextResponse.json({
      success: true,
      data: commentData,
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/issues/[issueId]/comments:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

