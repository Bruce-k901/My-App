/**
 * Generate HTML email template for missing order reminders
 * Sent to customers who have standing orders but haven't placed their usual order
 */

export function generateMissingOrderReminderHTML({
  customerName,
  businessName,
  missingDates,
  portalUrl,
}: {
  customerName: string;
  businessName: string;
  missingDates: string[];
  portalUrl?: string;
}): string {
  const dateList = missingDates
    .map((d) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    })
    .map((d) => `<li style="padding: 4px 0;">${d}</li>`)
    .join('');

  const ctaBlock = portalUrl
    ? `<p style="margin: 30px 0;">
        <a href="${portalUrl}" style="background: #D37E91; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
          Place Your Order
        </a>
      </p>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #D37E91;">Order Reminder</h2>

      <p>Hi ${customerName},</p>

      <p>We noticed you haven't placed your usual order with <strong>${businessName}</strong> for the following upcoming delivery date${missingDates.length > 1 ? 's' : ''}:</p>

      <ul style="background: #FFF7ED; border-left: 3px solid #F59E0B; padding: 12px 12px 12px 28px; border-radius: 4px; margin: 20px 0;">
        ${dateList}
      </ul>

      <p>If you'd like to place an order, please get in touch or use the portal link below. If you've already arranged this separately or don't need a delivery, you can ignore this reminder.</p>

      ${ctaBlock}

      <p style="margin-top: 30px;">
        Thanks,<br>
        <strong>${businessName}</strong>
      </p>

      <p style="color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px;">
        This is an automated reminder from Opsly. If you'd prefer not to receive these, please let ${businessName} know.
      </p>
    </body>
    </html>
  `;
}
