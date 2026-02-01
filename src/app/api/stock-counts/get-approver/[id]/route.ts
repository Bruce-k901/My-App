import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getApproverForStockCount } from '@/lib/stock-counts';

/**
 * Get the approver for a stock count before marking it ready
 * This allows the UI to show who will review the count
 */
export async function GET(
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
    
    // Fallback: extract from URL
    if (!countId) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const idIndex = pathParts.indexOf('get-approver');
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

    // Get the stock count
    const { data: count, error: countError } = await supabase
      .from('stock_counts')
      .select('company_id, site_id')
      .eq('id', countId)
      .single();

    if (countError || !count) {
      return NextResponse.json(
        { error: 'Stock count not found' },
        { status: 404 }
      );
    }

    // Get approver
    const approver = await getApproverForStockCount(
      count.company_id,
      count.site_id,
      user.id
    );

    if (!approver) {
      // Return a graceful response instead of error - UI can handle this
      return NextResponse.json({
        success: false,
        message: 'No approver found in hierarchy',
        approver: null,
      });
    }

    // Get approver profile details
    const { data: approverProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', approver.approverId)
      .single();

    return NextResponse.json({
      success: true,
      approver: {
        id: approver.approverId,
        role: approver.approverRole,
        name: approverProfile?.full_name || approverProfile?.email || 'Unknown',
        email: approverProfile?.email,
      },
    });

  } catch (error: any) {
    console.error('Error in get-approver endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
