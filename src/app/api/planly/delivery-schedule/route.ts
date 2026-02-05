import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const siteId = searchParams.get('siteId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 }
      );
    }

    // Get orders in date range for customers who need delivery
    let query = supabase
      .from('planly_orders')
      .select(`
        delivery_date,
        customer:planly_customers!inner(
          id,
          name,
          contact_name,
          address,
          postcode,
          frozen_only,
          needs_delivery,
          site_id
        )
      `)
      .gte('delivery_date', startDate)
      .lte('delivery_date', endDate)
      .eq('status', 'confirmed')
      .eq('customer.needs_delivery', true);

    if (siteId) {
      query = query.eq('customer.site_id', siteId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching delivery schedule:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by customer and build drops report
    const customerMap = new Map<string, any>();

    orders?.forEach((order: any) => {
      const customerId = order.customer.id;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer_id: customerId,
          contact_name: order.customer.contact_name || '',
          customer_name: order.customer.name || '',
          address: order.customer.address || '',
          postcode: order.customer.postcode || '',
          is_frozen_only: order.customer.frozen_only || false,
          deliveries: {} as { [day: string]: boolean },
        });
      }

      const customer = customerMap.get(customerId);
      customer.deliveries[order.delivery_date] = true;
    });

    const dropsReport = Array.from(customerMap.values());

    return NextResponse.json({
      start_date: startDate,
      end_date: endDate,
      entries: dropsReport,
    });
  } catch (error) {
    console.error('Error in GET /api/planly/delivery-schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
