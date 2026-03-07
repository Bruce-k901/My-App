import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { resolveCustomer, getCustomerAdmin } from '@/lib/customer-auth';

/**
 * GET /api/customer/reports/monthly
 * Get monthly spend summary from planly_orders.
 * Query params: month (YYYY-MM format), customer_id (admin preview)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getCustomerAdmin();

    // Resolve customer ID (admin preview or email lookup)
    const customerIdParam = request.nextUrl.searchParams.get('customer_id');
    let customerId: string | null = null;

    if (customerIdParam) {
      const { data: profile } = await admin
        .from('profiles')
        .select('is_platform_admin, app_role')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const isAdmin = profile?.is_platform_admin || profile?.app_role === 'Owner';
      if (isAdmin) {
        customerId = customerIdParam;
      }
    }

    if (!customerId) {
      const { data: customer } = await admin
        .from('planly_customers')
        .select('id')
        .eq('email', user.email?.toLowerCase() || '')
        .eq('is_active', true)
        .maybeSingle();

      if (!customer) {
        // No planly customer found — show empty state
        return NextResponse.json({
          success: true,
          data: { current_month: null, previous_month: null, top_products: [] },
        });
      }
      customerId = customer.id;
    }

    const monthParam = request.nextUrl.searchParams.get('month');
    const monthDate = monthParam ? new Date(monthParam + '-01') : new Date();
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth(); // 0-indexed

    // Current month range
    const currentStart = new Date(year, month, 1).toISOString().split('T')[0];
    const currentEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];

    // Previous month range
    const prevStart = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const prevEnd = new Date(year, month, 0).toISOString().split('T')[0];

    // Fetch current and previous month orders in parallel
    const [{ data: currentOrders }, { data: prevOrders }] = await Promise.all([
      admin
        .from('planly_orders')
        .select('id, delivery_date, total_value, status')
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .gte('delivery_date', currentStart)
        .lte('delivery_date', currentEnd),
      admin
        .from('planly_orders')
        .select('id, delivery_date, total_value, status')
        .eq('customer_id', customerId)
        .neq('status', 'cancelled')
        .gte('delivery_date', prevStart)
        .lte('delivery_date', prevEnd),
    ]);

    // Build current month summary
    let currentMonth = null;
    if (currentOrders && currentOrders.length > 0) {
      const orderIds = currentOrders.map(o => o.id);
      const { data: lines } = await admin
        .from('planly_order_lines')
        .select('order_id, product_id, quantity, unit_price_snapshot')
        .in('order_id', orderIds);

      const totalSpend = currentOrders.reduce((sum, o) => sum + (parseFloat(o.total_value) || 0), 0);
      const totalUnits = (lines || []).reduce((sum, l) => sum + l.quantity, 0);
      const uniqueProducts = new Set((lines || []).map(l => l.product_id)).size;

      currentMonth = {
        month_date: currentStart,
        order_count: currentOrders.length,
        total_spend: Math.round(totalSpend * 100) / 100,
        avg_order_value: Math.round((totalSpend / currentOrders.length) * 100) / 100,
        total_units_ordered: totalUnits,
        unique_products: uniqueProducts,
      };

      // Top products breakdown
      const productSpend = new Map<string, { quantity: number; spend: number }>();
      (lines || []).forEach(l => {
        const existing = productSpend.get(l.product_id) || { quantity: 0, spend: 0 };
        existing.quantity += l.quantity;
        existing.spend += l.quantity * parseFloat(l.unit_price_snapshot);
        productSpend.set(l.product_id, existing);
      });

      // Get product names
      const productIds = Array.from(productSpend.keys());
      let productNameMap = new Map<string, string>();

      if (productIds.length > 0) {
        const { data: planlyProducts } = await admin
          .from('planly_products')
          .select('id, stockly_product_id')
          .in('id', productIds);

        const stocklyIds = (planlyProducts || []).map(p => p.stockly_product_id).filter(Boolean);
        if (stocklyIds.length > 0) {
          const { data: ingredients } = await admin
            .from('ingredients_library')
            .select('id, ingredient_name')
            .in('id', stocklyIds);

          const ingMap = new Map((ingredients || []).map(i => [i.id, i.ingredient_name]));
          (planlyProducts || []).forEach(p => {
            const name = ingMap.get(p.stockly_product_id);
            if (name) productNameMap.set(p.id, name);
          });
        }
      }

      const topProducts = Array.from(productSpend.entries())
        .map(([product_id, data]) => ({
          product_id,
          product_name: productNameMap.get(product_id) || 'Unknown',
          total_quantity: data.quantity,
          total_spend: Math.round(data.spend * 100) / 100,
          avg_unit_price: data.quantity > 0
            ? Math.round((data.spend / data.quantity) * 100) / 100
            : 0,
        }))
        .sort((a, b) => b.total_spend - a.total_spend)
        .slice(0, 10);

      return NextResponse.json({
        success: true,
        data: {
          current_month: currentMonth,
          previous_month: buildMonthSummary(prevOrders, prevStart),
          top_products: topProducts,
        },
      });
    }

    // No orders for current month
    return NextResponse.json({
      success: true,
      data: {
        current_month: null,
        previous_month: buildMonthSummary(prevOrders, prevStart),
        top_products: [],
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/reports/monthly:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildMonthSummary(
  orders: any[] | null,
  monthDate: string
): { month_date: string; order_count: number; total_spend: number; avg_order_value: number } | null {
  if (!orders || orders.length === 0) return null;

  const totalSpend = orders.reduce((sum, o) => sum + (parseFloat(o.total_value) || 0), 0);
  return {
    month_date: monthDate,
    order_count: orders.length,
    total_spend: Math.round(totalSpend * 100) / 100,
    avg_order_value: Math.round((totalSpend / orders.length) * 100) / 100,
  };
}
