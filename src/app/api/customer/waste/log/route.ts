import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/customer/waste/log
 * Create or update waste log for an order
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id, company_id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { order_id, items, status, notes } = body;

    if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, items' },
        { status: 400 }
      );
    }

    // Verify order belongs to customer
    const { data: order, error: orderError } = await supabase
      .from('order_book_orders')
      .select('id, customer_id, delivery_date, total')
      .eq('id', order_id)
      .eq('customer_id', customer.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Calculate totals
    let totalOrdered = 0;
    let totalSold = 0;
    let totalWasteCost = 0;

    for (const item of items) {
      totalOrdered += item.ordered_qty || 0;
      totalSold += item.sold_qty || 0;
      totalWasteCost += (item.ordered_qty - item.sold_qty) * (item.unit_price || 0);
    }

    // Check if waste log already exists
    const { data: existingLog } = await supabase
      .from('order_book_waste_logs')
      .select('id')
      .eq('order_id', order_id)
      .maybeSingle();

    let wasteLogId;

    if (existingLog) {
      // Check if log is already submitted - cannot edit submitted logs
      const { data: existingLogFull, error: fetchError } = await supabase
        .from('order_book_waste_logs')
        .select('id, status')
        .eq('id', existingLog.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (existingLogFull?.status === 'submitted' || existingLogFull?.status === 'reviewed') {
        return NextResponse.json(
          { error: 'Cannot edit submitted waste log. Submitted logs are locked for historical accuracy.' },
          { status: 400 }
        );
      }

      // Update existing draft log
      const { data: updatedLog, error: updateError } = await supabase
        .from('order_book_waste_logs')
        .update({
          total_ordered: totalOrdered,
          total_sold: totalSold,
          total_waste_cost: totalWasteCost,
          status: status || 'draft',
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLog.id)
        .select('id')
        .single();

      if (updateError) {
        throw updateError;
      }

      wasteLogId = updatedLog.id;

      // Delete existing items
      await supabase
        .from('order_book_waste_log_items')
        .delete()
        .eq('waste_log_id', wasteLogId);
    } else {
      // Create new log
      const { data: newLog, error: createError } = await supabase
        .from('order_book_waste_logs')
        .insert({
          company_id: customer.company_id,
          customer_id: customer.id,
          order_id,
          log_date: order.delivery_date,
          total_ordered: totalOrdered,
          total_sold: totalSold,
          total_waste_cost: totalWasteCost,
          status: status || 'draft',
          notes,
          logged_by: user.id,
        })
        .select('id')
        .single();

      if (createError) {
        throw createError;
      }

      wasteLogId = newLog.id;
    }

    // Insert waste log items
    const wasteLogItems = items.map((item: any) => ({
      waste_log_id: wasteLogId,
      order_item_id: item.order_item_id,
      product_id: item.product_id,
      ordered_qty: item.ordered_qty,
      sold_qty: item.sold_qty,
      unit_price: item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from('order_book_waste_log_items')
      .insert(wasteLogItems);

    if (itemsError) {
      throw itemsError;
    }

    return NextResponse.json({
      success: true,
      data: { id: wasteLogId },
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/waste/log:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/customer/waste/log
 * Get existing waste log for an order
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = request.nextUrl.searchParams.get('order_id');
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get waste log with items
    const { data: wasteLog, error: logError } = await supabase
      .from('order_book_waste_logs')
      .select(`
        *,
        items:order_book_waste_log_items(
          *,
          product:order_book_products(id, name)
        )
      `)
      .eq('order_id', orderId)
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (logError) {
      throw logError;
    }

    return NextResponse.json({
      success: true,
      data: wasteLog,
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/waste/log:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

