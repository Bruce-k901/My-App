import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCustomerAdmin } from '@/lib/customer-auth';

/**
 * GET /api/customer/orders/[id]/items
 * Returns planly_order_lines for a specific order with product names.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: orderId } = await params;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getCustomerAdmin();

    // Verify the order exists
    const { data: order, error: orderError } = await admin
      .from('planly_orders')
      .select('id, customer_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch order lines
    const { data: lines, error: linesError } = await admin
      .from('planly_order_lines')
      .select('id, product_id, quantity, unit_price_snapshot, ship_state')
      .eq('order_id', orderId);

    if (linesError) {
      console.error('Error fetching order lines:', linesError);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    // Get product names
    const productIds = (lines || []).map(l => l.product_id);
    let productNameMap = new Map<string, { name: string; unit: string; category: string | null }>();

    if (productIds.length > 0) {
      const { data: planlyProducts } = await admin
        .from('planly_products')
        .select('id, stockly_product_id, category:planly_categories(name)')
        .in('id', productIds);

      const stocklyIds = (planlyProducts || []).map(p => p.stockly_product_id).filter(Boolean);
      if (stocklyIds.length > 0) {
        const { data: ingredients } = await admin
          .from('ingredients_library')
          .select('id, ingredient_name, unit')
          .in('id', stocklyIds);

        const ingredientMap = new Map(
          (ingredients || []).map(i => [i.id, i])
        );

        (planlyProducts || []).forEach(p => {
          const ing = ingredientMap.get(p.stockly_product_id);
          const cat = p.category as any;
          if (ing) {
            productNameMap.set(p.id, {
              name: ing.ingredient_name,
              unit: ing.unit || 'unit',
              category: cat?.name || null,
            });
          }
        });
      }
    }

    // Shape response
    const shaped = (lines || []).map(line => {
      const productInfo = productNameMap.get(line.product_id);
      return {
        id: line.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: parseFloat(line.unit_price_snapshot),
        line_total: line.quantity * parseFloat(line.unit_price_snapshot),
        product: productInfo ? {
          name: productInfo.name,
          unit: productInfo.unit,
          category: productInfo.category,
        } : undefined,
      };
    });

    return NextResponse.json({ success: true, data: shaped });
  } catch (error: any) {
    console.error('Error in GET /api/customer/orders/[id]/items:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
