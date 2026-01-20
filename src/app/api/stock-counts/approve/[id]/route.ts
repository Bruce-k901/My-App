import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const countId = params.id;
    
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

    if (count.status !== 'pending_review') {
      return NextResponse.json(
        { error: `Stock count must be in 'pending_review' status. Current status: ${count.status}` },
        { status: 400 }
      );
    }

    // Update count status to approved
    const { error: updateError } = await supabaseAdmin
      .from('stock_counts')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', countId);

    if (updateError) {
      console.error('Error updating count status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update count status' },
        { status: 500 }
      );
    }

    // Call the database function to process the approved count
    const { error: processError } = await supabaseAdmin.rpc(
      'process_approved_stock_count',
      { p_count_id: countId }
    );

    if (processError) {
      console.error('Error processing approved count:', processError);
      // Rollback the status update
      await supabaseAdmin
        .from('stock_counts')
        .update({ status: 'pending_review' })
        .eq('id', countId);
      
      return NextResponse.json(
        { error: `Failed to process approved count: ${processError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stock count approved and processed successfully'
    });

  } catch (error: any) {
    console.error('Error in approve endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
