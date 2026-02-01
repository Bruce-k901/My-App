import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const siteId = searchParams.get('siteId');

    if (!date || !siteId) {
      return NextResponse.json(
        { error: 'date and siteId are required' },
        { status: 400 }
      );
    }

    // 1. Get delivery orders for this date
    const { data: orders, error: ordersError } = await supabase
      .from('planly_orders')
      .select(`
        id,
        delivery_date,
        status,
        customer:planly_customers(
          id,
          name,
          destination_group_id,
          destination_group:planly_destination_groups(id, name)
        ),
        lines:planly_order_lines(
          id,
          product_id,
          quantity,
          product:planly_products(
            id,
            stockly_product_id,
            bake_group_id,
            process_template_id,
            items_per_tray,
            bake_group:planly_bake_groups(id, name)
          )
        )
      `)
      .eq('delivery_date', date)
      .eq('site_id', siteId)
      .neq('status', 'cancelled');

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Get product names from ingredients library
    const productIds = new Set<string>();
    orders?.forEach((order: any) => {
      order.lines?.forEach((line: any) => {
        if (line.product?.stockly_product_id) {
          productIds.add(line.product.stockly_product_id);
        }
      });
    });

    let productNamesMap = new Map<string, string>();
    if (productIds.size > 0) {
      const { data: ingredients } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name')
        .in('id', Array.from(productIds));

      if (ingredients) {
        productNamesMap = new Map(ingredients.map((i: any) => [i.id, i.ingredient_name]));
      }
    }

    // Transform orders to delivery summaries
    const deliveryOrders = (orders || []).map((order: any) => ({
      order_id: order.id,
      customer_name: order.customer?.name || 'Unknown',
      destination_group_id: order.customer?.destination_group_id,
      destination_group_name: order.customer?.destination_group?.name,
      lines: (order.lines || []).map((line: any) => ({
        product_id: line.product_id,
        product_name: productNamesMap.get(line.product?.stockly_product_id) || 'Unknown Product',
        quantity: line.quantity,
        bake_group_id: line.product?.bake_group_id,
        bake_group_name: line.product?.bake_group?.name,
      })),
    }));

    // 2. Get production tasks due today based on process templates
    const { data: futureOrders, error: futureError } = await supabase
      .from('planly_orders')
      .select(`
        id,
        delivery_date,
        lines:planly_order_lines(
          product_id,
          quantity,
          product:planly_products(
            id,
            stockly_product_id,
            process_template_id,
            items_per_tray,
            bake_group_id,
            bake_group:planly_bake_groups(id, name),
            process_template:planly_process_templates(
              id,
              name,
              stages:planly_process_stages(
                id,
                name,
                day_offset,
                bake_group_id,
                destination_group_id,
                bake_group:planly_bake_groups(id, name),
                destination_group:planly_destination_groups(id, name)
              )
            )
          )
        )
      `)
      .eq('site_id', siteId)
      .gte('delivery_date', date)
      .neq('status', 'cancelled');

    if (futureError) {
      console.error('Error fetching future orders:', futureError);
    }

    // Collect all product IDs from future orders too
    (futureOrders || []).forEach((order: any) => {
      order.lines?.forEach((line: any) => {
        if (line.product?.stockly_product_id) {
          productIds.add(line.product.stockly_product_id);
        }
      });
    });

    // Re-fetch product names if we have new IDs
    if (productIds.size > productNamesMap.size) {
      const { data: ingredients } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name')
        .in('id', Array.from(productIds));

      if (ingredients) {
        productNamesMap = new Map(ingredients.map((i: any) => [i.id, i.ingredient_name]));
      }
    }

    // Calculate which production tasks are due today
    const productionTasks: any[] = [];
    const selectedDate = new Date(date);

    (futureOrders || []).forEach((order: any) => {
      const deliveryDate = new Date(order.delivery_date);
      const daysUntilDelivery = Math.floor(
        (deliveryDate.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      order.lines?.forEach((line: any) => {
        const template = line.product?.process_template;
        if (!template?.stages) return;

        template.stages.forEach((stage: any) => {
          // day_offset is negative (e.g., -2 means 2 days before delivery)
          // If daysUntilDelivery equals -day_offset, this stage is due today
          if (daysUntilDelivery === Math.abs(stage.day_offset)) {
            productionTasks.push({
              delivery_date: order.delivery_date,
              product_id: line.product_id,
              product_name: productNamesMap.get(line.product?.stockly_product_id) || 'Unknown Product',
              template_name: template.name,
              stage_name: stage.name,
              day_offset: stage.day_offset,
              quantity: line.quantity,
              // Use stage-level bake group if set, otherwise fall back to product-level
              bake_group_id: stage.bake_group_id || line.product?.bake_group_id,
              bake_group_name: stage.bake_group?.name || line.product?.bake_group?.name,
              destination_group_id: stage.destination_group_id,
              destination_group_name: stage.destination_group?.name,
            });
          }
        });
      });
    });

    // 3. Aggregate tray setup requirements
    const traySetupMap = new Map<string, any>();
    productionTasks
      .filter((task) =>
        task.stage_name.toLowerCase().includes('tray') ||
        task.stage_name.toLowerCase().includes('ring')
      )
      .forEach((task) => {
        const key = task.product_id;
        if (!traySetupMap.has(key)) {
          traySetupMap.set(key, {
            product_id: task.product_id,
            product_name: task.product_name,
            total_quantity: 0,
            items_per_tray: 18,
            bake_group_name: task.bake_group_name,
            destination_group_name: task.destination_group_name,
          });
        }
        traySetupMap.get(key)!.total_quantity += task.quantity;
      });

    // Calculate tray numbers
    let currentTray = 1;
    const traySetup = Array.from(traySetupMap.values()).map((item) => {
      const traysNeeded = Math.ceil(item.total_quantity / item.items_per_tray);
      const result = {
        ...item,
        trays_needed: traysNeeded,
        tray_start: currentTray,
        tray_end: currentTray + traysNeeded - 1,
      };
      currentTray += traysNeeded;
      return result;
    });

    // 4. Cookie layout requirements
    const cookieLayout = productionTasks
      .filter((task) =>
        task.stage_name.toLowerCase().includes('cookie') ||
        task.stage_name.toLowerCase().includes('layout')
      )
      .reduce((acc: any[], task) => {
        const existing = acc.find((c) => c.product_id === task.product_id);
        if (existing) {
          existing.quantity += task.quantity;
        } else {
          acc.push({
            product_id: task.product_id,
            product_name: task.product_name,
            quantity: task.quantity,
            destination_group_name: task.destination_group_name,
          });
        }
        return acc;
      }, []);

    // 5. Dough ingredients - placeholder for future Stockly integration
    const doughIngredients: any[] = [];

    // 6. Check if past cutoff
    const now = new Date();
    const isPastCutoff = selectedDate < now && selectedDate.toDateString() !== now.toDateString();

    return NextResponse.json({
      date,
      is_past_cutoff: isPastCutoff,
      delivery_orders: deliveryOrders,
      production_tasks: productionTasks,
      dough_ingredients: doughIngredients,
      tray_setup: traySetup,
      cookie_layout: cookieLayout,
    });
  } catch (error) {
    console.error('Error in GET /api/planly/production-plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
