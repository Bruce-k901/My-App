/**
 * Generate HTML email template for portal invitation
 * This is a helper that can be used by the portalInvitationHelpers
 */

export function generatePortalInvitationEmailHTML({
  contactName,
  businessName,
  setupUrl,
}: {
  contactName: string;
  businessName: string;
  setupUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #10B981;">Hi ${contactName},</h2>
      
      <p>Okja Bakery has set up a customer portal for <strong>${businessName}</strong>.</p>
      
      <h3 style="color: #10B981;">What you can do:</h3>
      <ul>
        <li>Place orders 24/7 from your phone or computer</li>
        <li>View your standing orders and delivery schedule</li>
        <li>Track order history and invoices</li>
        <li>Update your delivery preferences</li>
      </ul>
      
      <p style="margin: 30px 0;">
        <a href="${setupUrl}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 600;">
          Set Up Your Account
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px;">This link expires in 14 days.</p>
      
      <p style="margin-top: 30px;">
        Questions? Reply to this email or contact us directly.
      </p>
      
      <p>
        Cheers,<br>
        <strong>Okja Bakery Team</strong>
      </p>
    </body>
    </html>
  `;
}

