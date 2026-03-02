import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'Opsly <noreply@opslytech.com>',
      to: email,
      subject: '\u2713 Opsly Email System Test',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opsly Email Test</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">

  <!-- Main Container -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">

        <!-- Email Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #D37E91 0%, #b0607a 100%); padding: 40px 40px 30px 40px; text-align: center;">
              <!-- Opsly Logo (Bar Mark) -->
              <div style="margin-bottom: 20px;">
                <svg width="60" height="40" viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg">
                  <!-- 6 bars representing the 6 modules -->
                  <rect x="10" y="10" width="24" height="110" rx="12" fill="#1B2624"/>
                  <rect x="44" y="30" width="24" height="90" rx="12" fill="#8B2E3E"/>
                  <rect x="78" y="15" width="24" height="105" rx="12" fill="#D9868C"/>
                  <rect x="112" y="25" width="24" height="95" rx="12" fill="#5D8AA8"/>
                  <rect x="146" y="10" width="24" height="110" rx="12" fill="#87B0D6"/>
                  <rect x="180" y="20" width="24" height="100" rx="12" fill="#9AC297"/>
                </svg>
              </div>

              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Email System Test
              </h1>
              <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 400;">
                \u2713 Your Opsly platform is configured correctly
              </p>
            </td>
          </tr>

          <!-- Success Message -->
          <tr>
            <td style="padding: 40px;">

              <!-- Success Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; background-color: #10B981; border-radius: 50%; position: relative;">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 32L28 40L44 24" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>

              <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 22px; font-weight: 600; text-align: center;">
                Congratulations!
              </h2>

              <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                If you're reading this, your Opsly email system is configured correctly and emails are being delivered successfully.
              </p>

              <!-- Configuration Status Box -->
              <div style="background-color: #f7fafc; border-left: 4px solid #D37E91; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
                  Email Configuration Status
                </h3>
                <table width="100%" cellpadding="6" cellspacing="0" border="0">
                  <tr>
                    <td style="color: #4a5568; font-size: 14px; padding: 6px 0;">
                      <strong>Resend API:</strong>
                    </td>
                    <td align="right" style="color: #10B981; font-size: 14px; font-weight: 600;">
                      \u2713 Connected
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #4a5568; font-size: 14px; padding: 6px 0;">
                      <strong>Email Delivery:</strong>
                    </td>
                    <td align="right" style="color: #10B981; font-size: 14px; font-weight: 600;">
                      \u2713 Working
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #4a5568; font-size: 14px; padding: 6px 0;">
                      <strong>Domain:</strong>
                    </td>
                    <td align="right" style="color: #10B981; font-size: 14px; font-weight: 600;">
                      opslytech.com
                    </td>
                  </tr>
                </table>
              </div>

              <!-- What This Enables -->
              <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 12px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
                  Your platform will now be able to send:
                </h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #4a5568; font-size: 14px; line-height: 1.8;">
                  <li>Daily compliance digests</li>
                  <li>Task and incident notifications</li>
                  <li>Team member invitations</li>
                  <li>Password reset emails</li>
                  <li>System alerts and updates</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #718096; font-size: 14px;">
                This is an automated test email from your
              </p>
              <p style="margin: 0 0 16px 0; color: #D37E91; font-size: 16px; font-weight: 600;">
                Opsly Operations Platform
              </p>
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                \u00A9 ${new Date().getFullYear()} Opsly. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
      `,
    });

    if (error) {
      console.error('[Test Email] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Test Email] Sent successfully to ${email} at ${new Date().toISOString()}`);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('[Test Email] Exception:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
