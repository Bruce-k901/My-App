import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      candidateEmail,
      candidateName,
      jobTitle,
      companyId,
      offerUrl,
      startDate,
      payRate,
      payFrequency,
      contractType,
      contractHours,
      applicationId,
      confirmationToken,
    } = body

    if (!candidateEmail || !candidateName || !jobTitle || !offerUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    const companyName = company?.name || 'Our Company'

    // Build email HTML
    const payText = payRate 
      ? `£${payRate}${payFrequency === 'hourly' ? '/hr' : '/year'}`
      : 'Competitive salary'

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Offer - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0b0e; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1d24; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #D37E91 0%, #8B5CF6 100%); padding: 40px 32px; text-align: center; position: relative;">
      <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px;">
        🌟
      </div>
      <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.8px;">
        Job Offer
      </h1>
      <p style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 15px; font-weight: 500;">
        ${companyName}
      </p>
    </div>
    
    <!-- Content -->
    <div style="padding: 36px 32px;">
      <!-- Greeting -->
      <div style="margin-bottom: 28px;">
        <p style="margin: 0 0 8px; color: rgba(255, 255, 255, 0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          Congratulations ${candidateName.split(' ')[0]},
        </p>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6;">
          We're delighted to offer you the position of <span style="color: #D37E91; font-weight: 600;">${jobTitle}</span>.
        </p>
      </div>
      
      <!-- Offer Details -->
      <div style="background: rgba(211, 126, 145, 0.08); border: 1px solid rgba(211, 126, 145, 0.15); border-radius: 12px; padding: 0; margin: 28px 0; overflow: hidden;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Position</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${jobTitle}</div>
            </td>
          </tr>
          ${startDate ? `
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Start Date</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Salary</div>
              <div style="color: #10B981; font-size: 18px; font-weight: 700;">${payText}</div>
            </td>
          </tr>
          ${contractType ? `
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Contract</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600; text-transform: capitalize;">${contractType.replace('_', ' ')}</div>
            </td>
          </tr>
          ` : ''}
          ${contractHours ? `
          <tr>
            <td style="padding: 16px 20px;">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Hours</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${contractHours} hours/week</div>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${offerUrl ? `
      <!-- CTA Section -->
      <div style="margin: 40px 0 32px;">
        <!-- Primary Accept Button -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 20px 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <a href="${offerUrl}" 
                 style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 22px 40px; border-radius: 12px; font-weight: 700; font-size: 20px; display: inline-block; min-width: 280px; text-align: center; box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);">
                <span style="font-size: 28px; display: block; margin-bottom: 6px;">✓</span>
                <span style="display: block;">Accept Job Offer</span>
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Info Text -->
        <p style="margin: 0; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 12px; line-height: 1.6;">
          Click the button above to review your full offer details and accept
        </p>
      </div>
      ` : `
      <div style="background: rgba(211, 126, 145, 0.1); border: 1px solid rgba(211, 126, 145, 0.2); border-radius: 12px; padding: 24px; margin: 32px 0; text-align: center;">
        <p style="margin: 0 0 12px; color: rgba(255, 255, 255, 0.9); font-size: 15px; font-weight: 600;">
          📧 Please Respond
        </p>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 13px; line-height: 1.6;">
          Reply to this email to accept or discuss terms
        </p>
      </div>
      `}
      
      <!-- Time Sensitive -->
      <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #F59E0B; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <div style="color: #F59E0B; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
          Time Sensitive
        </div>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.75); font-size: 13px; line-height: 1.6;">
          This offer is valid for <strong style="color: #ffffff;">7 days</strong> from the date of this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
        <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 13px;">
          ${companyName} · Recruitment
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()

    // Send email via existing Resend integration
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: candidateEmail,
        subject: `🌟 Job Offer: ${jobTitle} at ${companyName}`,
        html: htmlContent,
      }),
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      throw new Error(emailResult.error || 'Failed to send email')
    }

    // Check if email was actually sent or just logged
    if (emailResult.skipped) {
      console.warn('Email was logged but not sent (Resend not configured)')
      return NextResponse.json({
        success: false,
        error: 'Email service not configured. Set RESEND_API_KEY and RESEND_FROM in environment variables.',
        offerUrl,
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      message: 'Offer email sent successfully',
    })
  } catch (error: any) {
    console.error('Send offer email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send offer email' },
      { status: 500 }
    )
  }
}
