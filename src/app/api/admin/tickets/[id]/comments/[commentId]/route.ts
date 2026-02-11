import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ============================================================================
// INDIVIDUAL COMMENT API
// ============================================================================
// PATCH: Edit comment (within 30 minute window)
// DELETE: Soft delete comment
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Get comment to check ownership and timing
    const { data: comment } = await supabase
      .from('ticket_comments')
      .select('author_id, created_at, deleted_at')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.deleted_at) {
      return NextResponse.json({ error: 'Cannot edit deleted comment' }, { status: 400 });
    }

    if (comment.author_id !== user.id) {
      return NextResponse.json({ error: 'Can only edit own comments' }, { status: 403 });
    }

    // Check 30 minute edit window
    const createdAt = new Date(comment.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffMinutes > 30) {
      return NextResponse.json({ error: 'Edit window expired (30 minutes)' }, { status: 400 });
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('ticket_comments')
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating comment:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: updatedComment });

  } catch (error: any) {
    console.error('Error in PATCH /api/admin/tickets/[id]/comments/[commentId]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
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

    const { commentId } = params;

    // Get comment and ticket
    const { data: comment } = await supabase
      .from('ticket_comments')
      .select(`
        author_id,
        deleted_at,
        ticket_id,
        ticket:support_tickets(company_id)
      `)
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.deleted_at) {
      return NextResponse.json({ error: 'Comment already deleted' }, { status: 400 });
    }

    // Check permissions - author OR company admin OR platform admin
    const isAdmin = profile.is_platform_admin ||
                   profile.app_role === 'Admin' ||
                   profile.app_role === 'Owner';
    const isAuthor = comment.author_id === user.id;
    const ticketCompanyId = (comment.ticket as any)?.company_id;
    const isCompanyAdmin = isAdmin && ticketCompanyId === profile.company_id;

    const canDelete = isAuthor || isCompanyAdmin || profile.is_platform_admin;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete - trigger will handle comment count update
    const { error: deleteError } = await supabase
      .from('ticket_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in DELETE /api/admin/tickets/[id]/comments/[commentId]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
