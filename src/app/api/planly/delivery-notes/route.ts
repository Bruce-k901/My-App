import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const deliveryDate = searchParams.get('deliveryDate');
    const siteId = searchParams.get('siteId');

    if (!deliveryDate) {
      return NextResponse.json(
        { error: 'deliveryDate query parameter is required' },
        { status: 400 }
      );
    }

    // Get orders for this delivery date
    let query = supabase
      .from('planly_orders')
      .select(`
        *,
        customer:planly_customers!inner(
          *,
          site_id
        ),
        lines:planly_order_lines(
          *,
          product:planly_products(*)
        )
      `)
      .eq('delivery_date', deliveryDate)
      .eq('status', 'locked');

    if (siteId) {
      query = query.eq('customer.site_id', siteId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders for delivery notes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get site settings for company info
    const siteSettings = siteId
      ? await supabase
          .from('planly_site_settings')
          .select('company_name, company_address')
          .eq('site_id', siteId)
          .maybeSingle()
      : { data: null };

    // Format delivery notes
    const deliveryNotes = orders?.map((order: any) => ({
      order_id: order.id,
      company_name: siteSettings.data?.company_name || '',
      date: deliveryDate,
      customer_name: order.customer?.name || '',
      address: order.customer?.address || '',
      postcode: order.customer?.postcode || '',
      contact: order.customer?.contact_name || order.customer?.phone || '',
      products: order.lines?.map((line: any) => ({
        name: line.product?.name || 'Unknown Product',
        quantity: line.quantity,
      })) || [],
    })) || [];

    return NextResponse.json({
      date: deliveryDate,
      notes: deliveryNotes,
    });
  } catch (error) {
    console.error('Error in GET /api/planly/delivery-notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
