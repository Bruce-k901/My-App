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

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId query parameter is required' },
        { status: 400 }
      );
    }

    // Get all orders with product and bake group info for this delivery date
    const { data: orders, error: ordersError } = await supabase
      .from('planly_orders')
      .select(`
        id,
        customer_id,
        customer:planly_customers!inner(
          id,
          name,
          site_id
        ),
        lines:planly_order_lines(
          id,
          product_id,
          quantity,
          product:planly_products(
            id,
            bake_group_id,
            stockly_product_id,
            bake_group:planly_bake_groups(
              id,
              name,
              priority
            )
          )
        )
      `)
      .eq('delivery_date', deliveryDate)
      .eq('customer.site_id', siteId)
      .in('status', ['confirmed', 'locked']);

    if (ordersError) {
      console.error('Error fetching packing plan orders:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Collect all stockly_product_ids to fetch names
    const stocklyProductIds = new Set<string>();
    let linesWithoutStocklyId = 0;
    orders?.forEach((order: any) => {
      order.lines?.forEach((line: any) => {
        if (line.product?.stockly_product_id) {
          stocklyProductIds.add(line.product.stockly_product_id);
        } else if (line.product) {
          linesWithoutStocklyId++;
        }
      });
    });

    console.log('Packing plan debug - stockly_product_ids count:', stocklyProductIds.size);
    console.log('Packing plan debug - lines without stockly_product_id:', linesWithoutStocklyId);

    // Fetch ingredient names from ingredients_library
    const ingredientNamesMap = new Map<string, string>();
    if (stocklyProductIds.size > 0) {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name')
        .in('id', Array.from(stocklyProductIds));

      console.log('Packing plan debug - ingredients fetched:', ingredients?.length ?? 0);
      if (ingredientsError) {
        console.error('Error fetching ingredient names:', ingredientsError);
      }

      if (ingredients) {
        ingredients.forEach((ing: any) => {
          ingredientNamesMap.set(ing.id, ing.ingredient_name || 'Unknown');
        });
        console.log('Packing plan debug - ingredient names map size:', ingredientNamesMap.size);
      }
    }

    // Get all bake groups for this site
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

    // Transform to packing plan format
    const customersMap = new Map<string, { id: string; name: string }>();
    const productsMap = new Map<string, {
      id: string;
      name: string;
      bake_group_id: string | null;
      sort_order: number;
    }>();
    const orderItems: Array<{
      customer_id: string;
      product_id: string;
      quantity: number
    }> = [];

    let productSortOrder = 0;

    orders?.forEach((order: any) => {
      // Add customer
      if (order.customer && !customersMap.has(order.customer.id)) {
        customersMap.set(order.customer.id, {
          id: order.customer.id,
          name: order.customer.name,
        });
      }

      // Process order lines
      order.lines?.forEach((line: any) => {
        if (line.quantity > 0 && line.product) {
          // Get product name from ingredients_library lookup
          const productName = line.product.stockly_product_id
            ? ingredientNamesMap.get(line.product.stockly_product_id) || `Product ${line.product_id}`
            : `Product ${line.product_id}`;

          // Add product if not already added
          if (!productsMap.has(line.product_id)) {
            productsMap.set(line.product_id, {
              id: line.product_id,
              name: productName,
              bake_group_id: line.product.bake_group_id,
              sort_order: line.product.bake_group?.priority ?? 999,
            });
            productSortOrder++;
          }

          // Add order item - aggregate if same customer/product
          const existingItem = orderItems.find(
            item => item.customer_id === order.customer_id && item.product_id === line.product_id
          );
          if (existingItem) {
            existingItem.quantity += line.quantity;
          } else {
            orderItems.push({
              customer_id: order.customer_id,
              product_id: line.product_id,
              quantity: line.quantity,
            });
          }
        }
      });
    });

    // Sort customers alphabetically
    const customers = Array.from(customersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Sort products by bake group priority, then by name
    const products = Array.from(productsMap.values()).sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      date: deliveryDate,
      orderCount: orders?.length || 0,
      customers,
      products,
      bakeGroups: bakeGroups || [],
      orderItems,
    });
  } catch (error) {
    console.error('Error in GET /api/planly/packing-plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
