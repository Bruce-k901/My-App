// @salsa - SALSA Compliance: Recall customer notification API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/stockly/recalls/[id]/notify
 * Add a customer notification record to a recall
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: recallId } = await params;
    const body = await request.json();

    const {
      company_id, customer_id, customer_name,
      contact_email, contact_phone, notification_method,
      notified_at, notified_by, response_received, response_notes,
      stock_returned, stock_return_quantity,
    } = body;

    if (!company_id || !customer_name) {
      return NextResponse.json({ success: false, error: 'company_id and customer_name are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('recall_notifications')
      .insert({
        company_id,
        recall_id: recallId,
        customer_id: customer_id || null,
        customer_name,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        notification_method: notification_method || null,
        notified_at: notified_at || new Date().toISOString(),
        notified_by: notified_by || null,
        response_received: response_received || false,
        response_notes: response_notes || null,
        stock_returned: stock_returned || false,
        stock_return_quantity: stock_return_quantity || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
