import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Backfill a specific stock count to work with the approval workflow
 * This endpoint can be called to update an existing count to the new workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    let countId: string | undefined;
    
    // Handle both sync and async params
    if (params) {
      const resolvedParams = params instanceof Promise ? await params : params;
      countId = resolvedParams?.id;
    }
    
    // Fallback: extract from URL if params didn't work
    if (!countId) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const idIndex = pathParts.indexOf('backfill');
      if (idIndex >= 0 && pathParts[idIndex + 1]) {
        countId = pathParts[idIndex + 1];
      }
    }
    
    if (!countId) {
      return NextResponse.json(
        { error: 'Stock count ID is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client for operations that need to bypass RLS
    const supabaseAdmin = getSupabaseAdmin();

    // Get the stock count
    const { data: count, error: countError } = await supabaseAdmin
      .from('stock_counts')
      .select('*')
      .eq('id', countId)
      .single();

    if (countError || !count) {
      return NextResponse.json(
        { error: 'Stock count not found' },
        { status: 404 }
      );
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    // Determine what updates are needed based on current status
    if (count.status === 'in_progress' || count.status === 'active') {
      // If all items are counted, mark as completed
      if (count.items_counted > 0 && count.total_items > 0 && count.items_counted >= count.total_items) {
        updates.status = 'completed';
        if (!count.completed_at) {
          updates.completed_at = new Date().toISOString();
        }
        if (!count.completed_by) {
          updates.completed_by = count.started_by || user.id;
        }
      }
    } else if (count.status === 'pending_review') {
      // Convert to ready_for_approval
      if (count.items_counted > 0) {
        updates.status = 'ready_for_approval';
        if (!count.ready_for_approval_at) {
          updates.ready_for_approval_at = count.reviewed_at || new Date().toISOString();
        }
        if (!count.ready_for_approval_by) {
          updates.ready_for_approval_by = count.reviewed_by || count.completed_by || count.started_by || user.id;
        }
      }
    } else if (count.status === 'approved') {
      // Ensure approved_by is set
      if (!count.approved_by) {
        updates.approved_by = count.reviewed_by || user.id;
      }
      if (!count.approved_at) {
        updates.approved_at = count.reviewed_at || new Date().toISOString();
      }
    } else if (count.status === 'finalized' || count.status === 'locked') {
      // For finalized/locked counts, ensure they have completed_at set
      // Note: These are already done, so they don't need to go through approval
      // But we ensure the fields are set for historical records
      // Note: stockly.stock_counts doesn't have finalized_at/locked_at columns
      if (!count.completed_at) {
        updates.completed_at = count.updated_at || count.created_at;
      }
      if (!count.completed_by) {
        updates.completed_by = count.reviewed_by || count.started_by;
      }
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 1) { // More than just updated_at
      const { error: updateError } = await supabaseAdmin
        .from('stock_counts')
        .update(updates)
        .eq('id', countId);

      if (updateError) {
        console.error('Error backfilling count:', updateError);
        return NextResponse.json(
          { error: 'Failed to backfill count' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Stock count backfilled successfully',
        updates: Object.keys(updates).filter(k => k !== 'updated_at'),
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Stock count already compatible with approval workflow',
        updates: [],
      });
    }

  } catch (error: any) {
    console.error('Error in backfill endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
