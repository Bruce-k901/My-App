import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/production/trays
 * Get tray assignments for a delivery date
 * Query params: date (YYYY-MM-DD), stream ('wholesale' | 'kiosk')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to get company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile or company not found' },
        { status: 404 }
      );
    }

    // Get supplier_id for this company
    const { data: supplier, error: supplierError } = await supabase
      .from('order_book_suppliers')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .maybeSingle();

    if (supplierError) {
      console.error('Error fetching supplier:', supplierError);
      return NextResponse.json(
        { error: 'Failed to fetch supplier' },
        { status: 500 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { error: 'No active supplier found for this company' },
        { status: 404 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const stream = searchParams.get('stream') || 'wholesale';

    if (!date) {
      return NextResponse.json(
        { error: 'date query parameter is required' },
        { status: 400 }
      );
    }

    // Call generate_tray_plan function
    const { data: trayPlan, error: planError } = await supabase.rpc(
      'generate_tray_plan',
      {
        p_supplier_id: supplier.id,
        p_delivery_date: date,
        p_stream: stream
      }
    );

    if (planError) {
      console.error('Error generating tray plan:', planError);
      
      // If function doesn't exist, return empty structure
      if (planError.message?.includes('schema cache') || planError.message?.includes('function') && planError.message?.includes('not found')) {
        console.warn('generate_tray_plan function not found - migration may need to be run');
        return NextResponse.json({
          success: true,
          data: {
            delivery_date: date,
            stream: stream,
            total_trays: 0,
            tray_assignments: []
          }
        });
      }
      
      return NextResponse.json(
        { error: planError.message || 'Failed to generate tray plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trayPlan
    });
  } catch (error) {
    console.error('Error in production trays API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

