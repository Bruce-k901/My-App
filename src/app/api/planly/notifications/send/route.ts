import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { format, parseISO } from 'date-fns';

interface NotificationRequest {
  customer_id: string;
  order_ids: string[];
  standing_order_id?: string;
  notification_type: 'order_generated' | 'order_confirmed' | 'order_reminder';
}

/**
 * POST /api/planly/notifications/send
 * Send notifications to customers about their orders
 *
 * Body:
 * - customer_id: string
 * - order_ids: string[]
 * - standing_order_id?: string
 * - notification_type: string
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body: NotificationRequest = await request.json();

    const { customer_id, order_ids, standing_order_id, notification_type } = body;

    if (!customer_id || !order_ids || order_ids.length === 0) {
      return NextResponse.json(
        { error: 'customer_id and order_ids are required' },
        { status: 400 }
      );
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('planly_customers')
      .select('id, name, contact_email')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check notification preferences
    const { data: preferences } = await supabase
      .from('planly_customer_notification_preferences')
      .select('*')
      .eq('customer_id', customer_id)
      .maybeSingle();

    // Default to enabled if no preferences set
    const shouldSend =
      !preferences ||
      (preferences.email_enabled &&
        ((notification_type === 'order_generated' && preferences.notify_on_auto_generation) ||
          (notification_type === 'order_confirmed' && preferences.notify_on_confirmation) ||
          (notification_type === 'order_reminder' && preferences.notify_on_delivery_day)));

    if (!shouldSend) {
      return NextResponse.json({
        success: true,
        message: 'Notifications disabled for this customer',
        sent: 0,
      });
    }

    if (!customer.contact_email) {
      return NextResponse.json(
        { error: 'Customer has no email address' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: orders, error: ordersError } = await supabase
      .from('planly_orders')
      .select('id, delivery_date, status, total_value')
      .in('id', order_ids)
      .eq('customer_id', customer_id);

    if (ordersError || !orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'Orders not found' },
        { status: 404 }
      );
    }

    // Create notification records for each order
    const notifications = orders.map((order) => ({
      customer_id,
      order_id: order.id,
      standing_order_id,
      notification_type,
      sent_via: 'email',
      sent_to: customer.contact_email,
      status: 'pending',
      metadata: {
        delivery_date: order.delivery_date,
        order_status: order.status,
        total_value: order.total_value,
      },
    }));

    const { data: createdNotifications, error: notifError } = await supabase
      .from('planly_order_notifications')
      .insert(notifications)
      .select();

    if (notifError) {
      console.error('Error creating notifications:', notifError);
      return NextResponse.json({ error: notifError.message }, { status: 500 });
    }

    // Build email content
    const emailSubject =
      notification_type === 'order_generated'
        ? `Your standing order has been processed`
        : notification_type === 'order_confirmed'
        ? `Order confirmation`
        : `Delivery reminder`;

    const ordersList = orders
      .map((order) => `- ${format(parseISO(order.delivery_date), 'EEEE, MMMM d, yyyy')}`)
      .join('\n');

    const emailBody = `
Hello ${customer.name},

${
  notification_type === 'order_generated'
    ? `Your standing order has been automatically processed and orders have been created for the following delivery dates:`
    : notification_type === 'order_confirmed'
    ? `Your orders have been confirmed for the following delivery dates:`
    : `This is a reminder about your upcoming deliveries:`
}

${ordersList}

${
  notification_type === 'order_generated'
    ? `These orders were generated automatically from your standing order. If you need to make changes, please contact us or log in to your account.`
    : ``
}

Thank you for your business!

Best regards,
Your Opsly Team
    `.trim();

    console.log('[Order Notifications]', {
      customer: customer.name,
      email: customer.contact_email,
      type: notification_type,
      orderCount: orders.length,
    });

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, just mark as sent
    const notificationIds = (createdNotifications || []).map((n) => n.id);

    // In production, you would send the email here and update status based on result
    // For now, we'll simulate success
    await supabase
      .from('planly_order_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .in('id', notificationIds);

    // Log email content for development
    console.log('─────────────────────────────────────');
    console.log('EMAIL PREVIEW:');
    console.log(`To: ${customer.contact_email}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`\n${emailBody}`);
    console.log('─────────────────────────────────────');

    return NextResponse.json({
      success: true,
      sent: notificationIds.length,
      notifications: createdNotifications,
      preview: {
        to: customer.contact_email,
        subject: emailSubject,
        body: emailBody,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/planly/notifications/send:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
