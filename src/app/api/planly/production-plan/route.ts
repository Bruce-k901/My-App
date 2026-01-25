import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { addDays, format, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const workingDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId query parameter is required' },
        { status: 400 }
      );
    }

    // Get all process templates for this site
    const { data: templates, error: templatesError } = await supabase
      .from('planly_process_templates')
      .select('*, stages:planly_process_stages(*)')
      .or(`site_id.eq.${siteId},is_master.eq.true`)
      .eq('is_active', true);

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json(
        { error: 'Failed to fetch process templates' },
        { status: 500 }
      );
    }

    // Get locked orders for delivery dates that affect this working date
    // This is a simplified version - in production, calculate based on stage offsets
    const { data: orders, error: ordersError } = await supabase
      .from('planly_orders')
      .select(`
        *,
        customer:planly_customers(*),
        lines:planly_order_lines(
          *,
          product:planly_products(
            *,
            bake_group:planly_bake_groups(*),
            category:planly_categories(*),
            process_template:planly_process_templates(
              *,
              stages:planly_process_stages(*)
            )
          )
        )
      `)
      .eq('status', 'locked')
      .gte('delivery_date', workingDate)
      .lte('delivery_date', format(addDays(parseISO(workingDate), 7), 'yyyy-MM-dd'));

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Get destination groups for timing
    const { data: destinationGroups } = await supabase
      .from('planly_destination_groups')
      .select('*')
      .eq('site_id', siteId)
      .order('priority');

    // Calculate production plan (simplified - full implementation would calculate based on stages)
    const productionPlan = {
      working_date: workingDate,
      tasks: [],
      bake_quantities: [],
      dough_requirements: [],
      tray_layouts: [],
      orders_by_delivery: orders?.reduce((acc: any, order: any) => {
        const date = order.delivery_date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(order);
        return acc;
      }, {}) || {},
    };

    return NextResponse.json(productionPlan);
  } catch (error) {
    console.error('Error in GET /api/planly/production-plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
