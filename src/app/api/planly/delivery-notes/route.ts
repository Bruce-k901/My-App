import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export interface DeliveryNotesResponse {
  date: string;
  companyName: string;
  companyLogo: string | null;
  bakeGroups: Array<{
    id: string;
    name: string;
    priority: number;
    products: Array<{ id: string; name: string; stocklyProductId: string }>;
  }>;
  notes: Array<{
    orderId: string;
    customerId: string;
    customerName: string;
    address: string;
    postcode: string;
    contact: string;
    quantities: Record<string, number>;
  }>;
}

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

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId query parameter is required' },
        { status: 400 }
      );
    }

    // 1. Get site settings for company info
    const { data: siteSettings } = await supabase
      .from('planly_site_settings')
      .select('company_name, company_logo_url')
      .eq('site_id', siteId)
      .maybeSingle();

    // 2. Get all active bake groups ordered by priority
    const { data: bakeGroups, error: bakeGroupsError } = await supabase
      .from('planly_bake_groups')
      .select('id, name, priority')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (bakeGroupsError) {
      console.error('Error fetching bake groups:', bakeGroupsError);
      return NextResponse.json({ error: bakeGroupsError.message }, { status: 500 });
    }

    // 3. Get all active products
    const { data: products, error: productsError } = await supabase
      .from('planly_products')
      .select('id, stockly_product_id, bake_group_id')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .is('archived_at', null);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    // 4. Get ingredient names for all products
    const stocklyProductIds = (products || [])
      .map(p => p.stockly_product_id)
      .filter(Boolean);

    let ingredientMap = new Map<string, string>();
    if (stocklyProductIds.length > 0) {
      const { data: ingredients } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name')
        .in('id', stocklyProductIds);

      ingredientMap = new Map(
        (ingredients || []).map(i => [i.id, i.ingredient_name])
      );
    }

    // 5. Group products by bake group
    const bakeGroupsWithProducts = (bakeGroups || []).map(bg => ({
      id: bg.id,
      name: bg.name,
      priority: bg.priority,
      products: (products || [])
        .filter(p => p.bake_group_id === bg.id)
        .map(p => ({
          id: p.id,
          name: ingredientMap.get(p.stockly_product_id) || 'Unknown Product',
          stocklyProductId: p.stockly_product_id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter(bg => bg.products.length > 0);

    // 6. Get all customer IDs for this site first
    const { data: siteCustomers, error: customersError } = await supabase
      .from('planly_customers')
      .select('id')
      .eq('site_id', siteId);

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      return NextResponse.json({ error: customersError.message }, { status: 500 });
    }

    const customerIds = (siteCustomers || []).map(c => c.id);

    if (customerIds.length === 0) {
      // No customers for this site, return empty notes
      const response: DeliveryNotesResponse = {
        date: deliveryDate,
        companyName: siteSettings?.company_name || '',
        companyLogo: siteSettings?.company_logo_url || null,
        bakeGroups: bakeGroupsWithProducts,
        notes: [],
      };
      return NextResponse.json(response);
    }

    // 7. Get orders for this delivery date filtered by customer IDs
    const { data: orders, error: ordersError } = await supabase
      .from('planly_orders')
      .select(`
        id,
        customer_id,
        customer:planly_customers(
          id,
          name,
          address,
          postcode,
          contact_name,
          phone
        ),
        lines:planly_order_lines(
          product_id,
          quantity
        )
      `)
      .eq('delivery_date', deliveryDate)
      .in('customer_id', customerIds);

    if (ordersError) {
      console.error('Error fetching orders for delivery notes:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // 8. Format delivery notes with quantities map
    const notes = (orders || []).map((order: any) => {
      const quantities: Record<string, number> = {};
      (order.lines || []).forEach((line: any) => {
        if (line.quantity > 0) {
          quantities[line.product_id] = line.quantity;
        }
      });

      return {
        orderId: order.id,
        customerId: order.customer?.id || '',
        customerName: order.customer?.name || '',
        address: order.customer?.address || '',
        postcode: order.customer?.postcode || '',
        contact: order.customer?.contact_name || order.customer?.phone || '',
        quantities,
      };
    }).sort((a, b) => a.customerName.localeCompare(b.customerName));

    const response: DeliveryNotesResponse = {
      date: deliveryDate,
      companyName: siteSettings?.company_name || '',
      companyLogo: siteSettings?.company_logo_url || null,
      bakeGroups: bakeGroupsWithProducts,
      notes,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/planly/delivery-notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
