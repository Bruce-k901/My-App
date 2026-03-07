import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCustomerAdmin } from '@/lib/customer-auth';

/**
 * POST /api/customer/orders/generate-from-week
 * Generate orders for future weeks based on a specific week's orders
 * Body: { week_start_date: 'YYYY-MM-DD', weeks_ahead: number (optional, default 4) }
 * Called automatically when saving a standing order
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getCustomerAdmin();

    // Get customer record from planly
    const { data: customer } = await admin
      .from('planly_customers')
      .select('id')
      .eq('email', user.email?.toLowerCase() || '')
      .eq('is_active', true)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { week_start_date, weeks_ahead = 4 } = body;

    if (!week_start_date) {
      return NextResponse.json(
        { error: 'Missing required field: week_start_date' },
        { status: 400 }
      );
    }

    // Validate date format
    const weekStart = new Date(week_start_date);
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Call the function (check if it exists first)
    const { data: count, error: generateError } = await admin.rpc('generate_orders_from_week', {
      p_customer_id: customer.id,
      p_week_start_date: weekStart.toISOString().split('T')[0],
      p_weeks_ahead: weeks_ahead,
    });

    if (generateError) {
      // If function doesn't exist yet (migration not run), return success with 0 count
      if (generateError.code === '42883' || generateError.message?.includes('does not exist')) {
        console.warn('generate_orders_from_week function does not exist yet');
        return NextResponse.json({
          success: true,
          data: {
            orders_generated: 0,
            week_start: weekStart.toISOString().split('T')[0],
            weeks_ahead,
            message: 'Function not available yet. Please run migrations.',
          },
        });
      }
      console.error('Error generating orders from week:', generateError);
      return NextResponse.json(
        { error: generateError.message || 'Failed to generate orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orders_generated: count || 0,
        week_start: weekStart.toISOString().split('T')[0],
        weeks_ahead,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/orders/generate-from-week:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

