import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { addDays, format, parseISO } from 'date-fns';

/**
 * GET /api/planly/standing-orders/missing
 * Identifies customers with standing orders who are missing orders for scheduled delivery days
 *
 * Query params:
 * - site_id: string (required)
 * - days_ahead: number (default: 7) - how many days to look ahead
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');
    const daysAhead = parseInt(searchParams.get('days_ahead') || '7', 10);

    if (!siteId) {
      return NextResponse.json(
        { error: 'site_id is required' },
        { status: 400 }
      );
    }

    // Get all active standing orders for this site
    const { data: standingOrders, error: soError } = await supabase
      .from('planly_standing_orders')
      .select('*, customer:planly_customers(id, name, contact_email, site_id)')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .eq('is_paused', false);

    if (soError) {
      // Table may not exist yet — return empty data instead of 500
      const today = new Date();
      return NextResponse.json({
        missing: [],
        checked_date_range: {
          start: format(today, 'yyyy-MM-dd'),
          end: format(addDays(today, daysAhead), 'yyyy-MM-dd'),
        },
      });
    }

    if (!standingOrders || standingOrders.length === 0) {
      return NextResponse.json({ missing: [] });
    }

    const missingOrders: Array<{
      customer_id: string;
      customer_name: string;
      customer_email: string | null;
      missing_dates: string[];
      standing_order_id: string;
    }> = [];

    // Check each standing order for missing orders
    const today = new Date();
    const endDate = addDays(today, daysAhead);

    for (const standingOrder of standingOrders) {
      const customer = standingOrder.customer as any;
      if (!customer) continue;

      const deliveryDays = standingOrder.delivery_days || [];
      const expectedDates: string[] = [];

      // Find all dates this customer should have orders
      let currentDate = today;
      while (currentDate <= endDate) {
        const dayName = format(currentDate, 'EEEE').toLowerCase();

        if (deliveryDays.includes(dayName)) {
          expectedDates.push(format(currentDate, 'yyyy-MM-dd'));
        }

        currentDate = addDays(currentDate, 1);
      }

      if (expectedDates.length === 0) continue;

      // Check which of these dates are missing orders
      const { data: existingOrders } = await supabase
        .from('planly_orders')
        .select('delivery_date')
        .eq('customer_id', standingOrder.customer_id)
        .in('delivery_date', expectedDates);

      const existingDates = new Set(
        (existingOrders || []).map((o) => o.delivery_date)
      );

      const missingDates = expectedDates.filter(
        (date) => !existingDates.has(date)
      );

      if (missingDates.length > 0) {
        missingOrders.push({
          customer_id: standingOrder.customer_id,
          customer_name: customer.name,
          customer_email: customer.contact_email,
          missing_dates: missingDates,
          standing_order_id: standingOrder.id,
        });
      }
    }

    return NextResponse.json({
      missing: missingOrders,
      checked_date_range: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      },
    });
  } catch (error: any) {
    // Degrade gracefully — return empty data instead of 500
    const today = new Date();
    return NextResponse.json({
      missing: [],
      checked_date_range: {
        start: format(today, 'yyyy-MM-dd'),
        end: format(addDays(today, 7), 'yyyy-MM-dd'),
      },
    });
  }
}
