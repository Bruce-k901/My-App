import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/planly/customer-support/issues/[issueId]/comments
 * Get all comments for an issue (admin view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { issueId } = await params;

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

    // Verify issue belongs to admin's company
    const { data: issue } = await supabase
      .from('order_book_issues')
      .select('id')
      .eq('id', issueId)
      .eq('company_id', profile!.company_id)
      .single();

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const { data: comments, error: commentsError } = await supabase
      .from('order_book_issue_comments')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw commentsError;
    }

    return NextResponse.json({ success: true, data: comments || [] });
  } catch (error: any) {
    console.error('Error fetching issue comments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/planly/customer-support/issues/[issueId]/comments
 * Add admin comment to issue
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { issueId } = await params;

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

    // Verify issue belongs to admin's company
    const { data: issue } = await supabase
      .from('order_book_issues')
      .select('id')
      .eq('id', issueId)
      .eq('company_id', profile!.company_id)
      .single();

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const body = await request.json();
    const { comment, attachments } = body;

    if (!comment) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    const { data: commentData, error: commentError } = await supabase
      .from('order_book_issue_comments')
      .insert({
        issue_id: issueId,
        commenter_type: 'admin',
        commenter_id: user.id,
        commenter_name: profile?.full_name || 'Admin',
        comment,
        attachments: attachments || [],
      })
      .select('*')
      .single();

    if (commentError) {
      throw commentError;
    }

    // Update issue status to in_progress if it was open
    await supabase
      .from('order_book_issues')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', issueId)
      .eq('status', 'open');

    return NextResponse.json({ success: true, data: commentData });
  } catch (error: any) {
    console.error('Error adding admin comment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
