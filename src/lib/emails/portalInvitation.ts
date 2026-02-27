/**
 * Generate HTML email template for portal invitation.
 * Sent to customers when they're invited to the ordering portal.
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

export function generatePortalInvitationEmailHTML({
  contactName,
  businessName,
  companyName,
  setupUrl,
}: {
  contactName: string
  businessName: string
  companyName?: string
  setupUrl: string
}): string {
  const sender = companyName ? escapeHtml(companyName) : 'Your supplier'

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
        <h2 style="color: #1a1a2e; font-size: 22px; font-weight: bold; margin: 0 0 10px;">Your Ordering Portal</h2>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Hi ${escapeHtml(contactName)},</p>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 16px;"><strong>${sender}</strong> has set up an ordering portal for <strong>${escapeHtml(businessName)}</strong>.</p>

        <!-- Features list -->
        <table cellspacing="0" cellpadding="0" style="margin: 0 auto 24px; text-align: left;">
          <tr><td style="padding: 4px 0; color: #52525b; font-size: 14px;">&#x2713;&ensp;Place orders 24/7 from your phone or computer</td></tr>
          <tr><td style="padding: 4px 0; color: #52525b; font-size: 14px;">&#x2713;&ensp;View your standing orders and delivery schedule</td></tr>
          <tr><td style="padding: 4px 0; color: #52525b; font-size: 14px;">&#x2713;&ensp;Track order history and invoices</td></tr>
          <tr><td style="padding: 4px 0; color: #52525b; font-size: 14px;">&#x2713;&ensp;Update your delivery preferences</td></tr>
        </table>

        <a href="${escapeHtml(setupUrl)}" style="display: inline-block; background-color: #D37E91; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">Set Up Your Account</a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 30px;">This link expires in 14 days. Questions? Reply to this email or contact ${sender} directly.</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
