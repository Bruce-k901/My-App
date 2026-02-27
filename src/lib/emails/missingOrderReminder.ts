/**
 * Generate HTML email template for missing order reminders.
 * Sent to customers who have standing orders but haven't placed their usual order.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const OPSLY_LOGO = `<img src="https://opslytech.com/logos/opsly-logo-email.png" alt="Opsly" width="120" style="display: block; margin: 0 auto 24px;" />`

export function generateMissingOrderReminderHTML({
  customerName,
  businessName,
  missingDates,
  portalUrl,
}: {
  customerName: string
  businessName: string
  missingDates: string[]
  portalUrl?: string
}): string {
  const dateList = missingDates
    .map((d) => {
      const date = new Date(d + 'T00:00:00')
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    })
    .map((d) => `<tr><td style="padding: 6px 12px; color: #92400E; font-size: 14px;">&#x2022;&ensp;${d}</td></tr>`)
    .join('')

  const ctaBlock = portalUrl
    ? `<a href="${escapeHtml(portalUrl)}" style="display: inline-block; background-color: #D37E91; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">Place Your Order</a>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #f4f4f5; margin: 0; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7;">
    <tr>
      <td style="padding: 40px 30px; text-align: center;">
        ${OPSLY_LOGO}
        <h2 style="color: #1a1a2e; font-size: 22px; font-weight: bold; margin: 0 0 10px;">Order Reminder</h2>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Hi ${escapeHtml(customerName)},</p>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">We noticed you haven't placed your usual order with <strong>${escapeHtml(businessName)}</strong> for the following upcoming delivery date${missingDates.length > 1 ? 's' : ''}:</p>

        <!-- Dates -->
        <table cellspacing="0" cellpadding="0" style="margin: 0 auto 20px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; text-align: left;">
          ${dateList}
        </table>

        <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">If you'd like to place an order, use the button below or get in touch. If you've already arranged this separately, you can ignore this reminder.</p>

        ${ctaBlock}

        <p style="color: #a1a1aa; font-size: 12px; margin-top: 30px;">This is an automated reminder from Opsly on behalf of ${escapeHtml(businessName)}. If you'd prefer not to receive these, please let them know.</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
