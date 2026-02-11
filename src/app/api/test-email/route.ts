import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json()
    
    if (!to) {
      return NextResponse.json(
        { error: 'Please provide a "to" email address' },
        { status: 400 }
      )
    }

    console.log(`🧪 Testing email to: ${to}`)

    // Send test email
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: '🧪 Test Email from Teamly',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; border: 2px solid #D37E91;">
    <div style="background: linear-gradient(135deg, #D37E91 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 32px;">🧪 Test Email</h1>
      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9);">Your email system is working!</p>
    </div>
    
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
        <strong>Congratulations!</strong>
      </p>
      
      <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
        If you're reading this, your Teamly email system is configured correctly and emails are being delivered successfully! 🎉
      </p>
      
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 10px; color: #065f46;">✅ Email Configuration Status</h3>
        <ul style="margin: 0; padding-left: 20px; color: #047857;">
          <li>Resend API: Connected</li>
          <li>Email Delivery: Working</li>
          <li>SMTP: Configured</li>
        </ul>
      </div>
      
      <p style="margin: 20px 0; color: #333; font-size: 16px;">
        Your recruitment system will now send:
      </p>
      
      <ul style="color: #666; font-size: 14px;">
        <li>📧 Application confirmations</li>
        <li>📅 Interview invitations</li>
        <li>👔 Trial shift invitations</li>
        <li>💼 Offer letters</li>
        <li>❌ Rejection notifications</li>
      </ul>
      
      <p style="margin: 30px 0 0; color: #333; font-size: 16px;">
        Happy recruiting!<br>
        <strong>Teamly Team</strong>
      </p>
    </div>
  </div>
</body>
</html>
        `,
      }),
    })

    const result = await response.json()
    
    if (result.skipped) {
      return NextResponse.json({
        success: false,
        message: 'Email configuration missing',
        details: 'Please configure RESEND_API_KEY and RESEND_FROM in .env.local',
        result,
      })
    }

    if (result.failed > 0) {
      return NextResponse.json({
        success: false,
        message: 'Email failed to send',
        details: 'Check console logs for Resend API error details',
        result,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${to}!`,
      details: 'Check your inbox (and spam folder)',
      result,
    })
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to send test email',
        details: 'Check server console for full error'
      },
      { status: 500 }
    )
  }
}
