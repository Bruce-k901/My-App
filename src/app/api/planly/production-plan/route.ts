import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const stepLog: string[] = [];

  try {
    stepLog.push('Creating supabase client');
    const supabase = await createServerSupabaseClient();

    stepLog.push('Parsing URL');
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const siteId = searchParams.get('siteId');

    console.log('[production-plan] Starting request:', { date, siteId });

    if (!date || !siteId) {
      return NextResponse.json(
        { error: 'date and siteId are required' },
        { status: 400 }
      );
    }

    // First get customer IDs for this site (more reliable than nested filter)
    stepLog.push('Fetching customers');
    console.log('[production-plan] Fetching customers for site:', siteId);
    const { data: siteCustomers, error: customersError } = await supabase
      .from('planly_customers')
      .select('id')
      .eq('site_id', siteId)
      .eq('is_active', true);

    if (customersError) {
      console.error('[production-plan] Error fetching site customers:', customersError);
      return NextResponse.json({ error: customersError.message, step: 'fetch_customers' }, { status: 500 });
    }
    console.log('[production-plan] Found customers:', siteCustomers?.length || 0);

    const customerIds = (siteCustomers || []).map(c => c.id);

    // If no customers for this site, return empty response
    if (customerIds.length === 0) {
      return NextResponse.json({
        date,
        is_past_cutoff: false,
        delivery_orders: [],
        production_tasks: [],
        dough_ingredients: [],
        tray_setup: [],
        cookie_layout: [],
      });
    }

    // 1. Get delivery orders for this date
    stepLog.push('Fetching orders');
    console.log('[production-plan] Fetching orders for date:', date, 'customerIds:', customerIds.length);
    const { data: orders, error: ordersError } = await supabase
      .from('planly_orders')
      .select(`
        id,
        delivery_date,
        status,
        customer_id,
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
          ship_state,
          product:planly_products(
            id,
            stockly_product_id,
            bake_group_id,
            process_template_id,
            items_per_tray,
            prep_method,
            bake_group:planly_bake_groups(id, name)
          )
        )
      `)
      .eq('delivery_date', date)
      .in('customer_id', customerIds);

    if (ordersError) {
      console.error('[production-plan] Error fetching orders:', ordersError);
      return NextResponse.json({ error: ordersError.message, step: 'fetch_orders' }, { status: 500 });
    }
    console.log('[production-plan] Found orders:', orders?.length || 0);

    // Get product names from ingredients library
    stepLog.push('Getting product IDs');
    const productIds = new Set<string>();
    orders?.forEach((order: any) => {
      order.lines?.forEach((line: any) => {
        if (line.product?.stockly_product_id) {
          productIds.add(line.product.stockly_product_id);
        }
      });
    });

    stepLog.push('Fetching product names from ingredients library');
    let productNamesMap = new Map<string, string>();
    if (productIds.size > 0) {
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name')
        .in('id', Array.from(productIds));

      if (ingredientsError) {
        console.error('[production-plan] Error fetching ingredients:', ingredientsError);
      }
      if (ingredients) {
        productNamesMap = new Map(ingredients.map((i: any) => [i.id, i.ingredient_name]));
      }
    }

    // Transform orders to delivery summaries
    stepLog.push('Transforming orders to delivery summaries');
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
        prep_method: line.product?.prep_method || 'fresh',
        ship_state: line.ship_state || 'baked',
      })),
    }));

    // 2. Get production tasks due today based on process templates
    // Use simpler queries to avoid deeply nested join issues
    stepLog.push('Fetching future orders');
    console.log('[production-plan] Fetching future orders for production tasks');
    const { data: futureOrders, error: futureError } = await supabase
      .from('planly_orders')
      .select(`
        id,
        delivery_date,
        customer_id,
        lines:planly_order_lines(
          product_id,
          quantity,
          ship_state,
          product:planly_products(
            id,
            stockly_product_id,
            process_template_id,
            items_per_tray,
            bake_group_id
          )
        )
      `)
      .in('customer_id', customerIds)
      .gte('delivery_date', date);

    if (futureError) {
      console.error('[production-plan] Error fetching future orders:', futureError);
    }
    console.log('[production-plan] Found future orders:', futureOrders?.length || 0);

    // Get process templates and stages separately (more reliable)
    const templateIds = new Set<string>();
    const bakeGroupIds = new Set<string>();
    (futureOrders || []).forEach((order: any) => {
      order.lines?.forEach((line: any) => {
        if (line.product?.process_template_id) {
          templateIds.add(line.product.process_template_id);
        }
        if (line.product?.bake_group_id) {
          bakeGroupIds.add(line.product.bake_group_id);
        }
      });
    });

    // Fetch process templates with stages
    stepLog.push('Fetching process templates');
    let templatesMap = new Map<string, any>();
    if (templateIds.size > 0) {
      const { data: templates } = await supabase
        .from('planly_process_templates')
        .select(`
          id,
          name,
          stages:planly_process_stages(
            id,
            name,
            day_offset,
            bake_group_id,
            destination_group_id
          )
        `)
        .in('id', Array.from(templateIds));

      if (templates) {
        templatesMap = new Map(templates.map((t: any) => [t.id, t]));
      }
    }

    // Fetch bake groups
    let bakeGroupsMap = new Map<string, any>();
    if (bakeGroupIds.size > 0) {
      const { data: bakeGroups } = await supabase
        .from('planly_bake_groups')
        .select('id, name')
        .in('id', Array.from(bakeGroupIds));

      if (bakeGroups) {
        bakeGroupsMap = new Map(bakeGroups.map((bg: any) => [bg.id, bg]));
      }
    }

    // Fetch destination groups for stages
    const destGroupIds = new Set<string>();
    templatesMap.forEach((template: any) => {
      template.stages?.forEach((stage: any) => {
        if (stage.destination_group_id) destGroupIds.add(stage.destination_group_id);
        if (stage.bake_group_id) bakeGroupIds.add(stage.bake_group_id);
      });
    });

    let destGroupsMap = new Map<string, any>();
    if (destGroupIds.size > 0) {
      const { data: destGroups } = await supabase
        .from('planly_destination_groups')
        .select('id, name')
        .in('id', Array.from(destGroupIds));

      if (destGroups) {
        destGroupsMap = new Map(destGroups.map((dg: any) => [dg.id, dg]));
      }
    }

    // Re-fetch bake groups if we found more IDs from stages
    if (bakeGroupIds.size > bakeGroupsMap.size) {
      const { data: bakeGroups } = await supabase
        .from('planly_bake_groups')
        .select('id, name')
        .in('id', Array.from(bakeGroupIds));

      if (bakeGroups) {
        bakeGroupsMap = new Map(bakeGroups.map((bg: any) => [bg.id, bg]));
      }
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
    stepLog.push('Calculating production tasks');
    const productionTasks: any[] = [];
    const selectedDate = new Date(date);

    (futureOrders || []).forEach((order: any) => {
      const deliveryDate = new Date(order.delivery_date);
      const daysUntilDelivery = Math.floor(
        (deliveryDate.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      order.lines?.forEach((line: any) => {
        const templateId = line.product?.process_template_id;
        const template = templateId ? templatesMap.get(templateId) : null;
        if (!template?.stages) return;

        // Debug: Log template stages for frozen orders
        if (line.ship_state === 'frozen') {
          console.log('[production-plan] Frozen order processing:', {
            order_delivery: order.delivery_date,
            selectedDate: date,
            daysUntilDelivery,
            template_name: template.name,
            stages: template.stages.map((s: any) => ({
              name: s.name,
              day_offset: s.day_offset,
              would_match: daysUntilDelivery === Math.abs(s.day_offset)
            }))
          });
        }

        const productBakeGroup = line.product?.bake_group_id
          ? bakeGroupsMap.get(line.product.bake_group_id)
          : null;

        template.stages.forEach((stage: any) => {
          // day_offset is negative (e.g., -2 means 2 days before delivery)
          // If daysUntilDelivery equals -day_offset, this stage is due today
          if (daysUntilDelivery === Math.abs(stage.day_offset)) {
            const stageBakeGroup = stage.bake_group_id
              ? bakeGroupsMap.get(stage.bake_group_id)
              : null;
            const stageDestGroup = stage.destination_group_id
              ? destGroupsMap.get(stage.destination_group_id)
              : null;

            productionTasks.push({
              delivery_date: order.delivery_date,
              product_id: line.product_id,
              product_name: productNamesMap.get(line.product?.stockly_product_id) || 'Unknown Product',
              template_name: template.name,
              stage_name: stage.name,
              day_offset: stage.day_offset,
              quantity: line.quantity,
              ship_state: line.ship_state || 'baked',
              // Use stage-level bake group if set, otherwise fall back to product-level
              bake_group_id: stage.bake_group_id || line.product?.bake_group_id,
              bake_group_name: stageBakeGroup?.name || productBakeGroup?.name,
              destination_group_id: stage.destination_group_id,
              destination_group_name: stageDestGroup?.name,
            });
          }
        });
      });
    });

    // 3. Aggregate tray setup requirements
    stepLog.push('Aggregating tray setup requirements');
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

    stepLog.push('Building response');
    console.log('[production-plan] Success - returning data:', {
      delivery_orders: deliveryOrders.length,
      production_tasks: productionTasks.length,
      tray_setup: traySetup.length,
      cookie_layout: cookieLayout.length,
    });

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
    console.error('[production-plan] UNHANDLED ERROR:', error);
    console.error('[production-plan] Last step:', stepLog[stepLog.length - 1]);
    console.error('[production-plan] Steps completed:', stepLog);
    console.error('[production-plan] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        lastStep: stepLog[stepLog.length - 1],
        steps: stepLog,
      },
      { status: 500 }
    );
  }
}
