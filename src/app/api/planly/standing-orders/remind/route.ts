import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateMissingOrderReminderHTML } from '@/lib/emails/missingOrderReminder';
import { sendEmail } from '@/lib/send-email';

/**
 * POST /api/planly/standing-orders/remind
 * Sends email reminders to customers with missing orders
 *
 * Body:
 * - site_id: string (required)
 * - customers: Array<{ customer_id, customer_name, customer_email, missing_dates }> (required)
 *   If empty array, sends to ALL missing-order customers for that site
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { site_id, customers } = body;

    if (!site_id) {
      return NextResponse.json({ error: 'site_id is required' }, { status: 400 });
    }

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: 'customers array is required' }, { status: 400 });
    }

    // Get the site/company name for the email
    const { data: site } = await supabase
      .from('sites')
      .select('name, company_id')
      .eq('id', site_id)
      .single();

    let businessName = 'Our Team';
    if (site) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', site.company_id)
        .single();
      businessName = company?.name || site.name || 'Our Team';
    }

    const portalUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/portal`
      : undefined;

    // Filter to customers that have email addresses
    const emailableCustomers = customers.filter(
      (c: any) => c.customer_email && c.customer_email.trim()
    );

    if (emailableCustomers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No customers have email addresses',
        sent: 0,
        skipped: customers.length,
      });
    }

    // Send emails via Resend directly
    const results = await Promise.allSettled(
      emailableCustomers.map(async (customer: any) => {
        const html = generateMissingOrderReminderHTML({
          customerName: customer.customer_name,
          businessName,
          missingDates: customer.missing_dates,
          portalUrl,
        });

        const result = await sendEmail({
          to: customer.customer_email,
          subject: `Order Reminder - ${businessName}`,
          html,
        });

        if (!result.success && !result.skipped) {
          throw new Error(`Failed to send to ${customer.customer_email}: ${result.error}`);
        }

        return { customer_id: customer.customer_id, email: customer.customer_email };
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    const skipped = customers.length - emailableCustomers.length;

    return NextResponse.json({
      success: true,
      sent,
      failed,
      skipped,
      message: `Sent ${sent} reminder${sent !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} skipped (no email)` : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
    });
  } catch (error: any) {
    console.error('Error sending reminders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
