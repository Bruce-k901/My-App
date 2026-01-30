import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const siteId = searchParams.get('siteId');

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year and month query parameters are required' },
        { status: 400 }
      );
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    // Get all orders for this month
    let query = supabase
      .from('planly_orders')
      .select(`
        id,
        customer_id,
        delivery_date,
        total_value,
        customer:planly_customers!inner(
          id,
          name,
          site_id
        ),
        lines:planly_order_lines(
          product_id,
          quantity,
          unit_price_snapshot,
          product:planly_products(
            id,
            name
          )
        )
      `)
      .gte('delivery_date', startDate)
      .lte('delivery_date', endDate)
      .eq('status', 'locked');

    if (siteId) {
      query = query.eq('customer.site_id', siteId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching monthly sales:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get credit notes for this month
    const { data: creditNotes } = await supabase
      .from('planly_credit_notes')
      .select(`
        customer_id,
        total_amount,
        customer:planly_customers!inner(
          site_id
        )
      `)
      .gte('issue_date', startDate)
      .lte('issue_date', endDate);

    // Aggregate by customer
    const customerMap = new Map<string, any>();

    // Process orders
    orders?.forEach((order: any) => {
      const customerId = order.customer_id;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer_id: customerId,
          customer_name: order.customer?.name || '',
          products: new Map<string, any>(),
          gross_total: 0,
          credits_total: 0,
        });
      }

      const customer = customerMap.get(customerId);
      customer.gross_total += order.total_value || 0;

      // Aggregate products
      order.lines?.forEach((line: any) => {
        const productId = line.product_id;
        if (!customer.products.has(productId)) {
          customer.products.set(productId, {
            product_id: productId,
            product_name: line.product?.name || 'Unknown',
            total_quantity: 0,
            unit_price: line.unit_price_snapshot,
            total_value: 0,
          });
        }

        const product = customer.products.get(productId);
        product.total_quantity += line.quantity;
        product.total_value += line.quantity * line.unit_price_snapshot;
      });
    });

    // Process credit notes
    creditNotes?.forEach((credit: any) => {
      if (siteId && credit.customer?.site_id !== siteId) return;

      const customerId = credit.customer_id;
      if (customerMap.has(customerId)) {
        customerMap.get(customerId).credits_total += credit.total_amount || 0;
      }
    });

    // Convert to array format
    const monthlySales = Array.from(customerMap.values()).map((customer) => ({
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      products: Array.from(customer.products.values()),
      gross_total: customer.gross_total,
      credits_total: customer.credits_total,
      net_total: customer.gross_total - customer.credits_total,
    }));

    return NextResponse.json({
      year: parseInt(year),
      month: parseInt(month),
      entries: monthlySales,
    });
  } catch (error) {
    console.error('Error in GET /api/planly/monthly-sales:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
