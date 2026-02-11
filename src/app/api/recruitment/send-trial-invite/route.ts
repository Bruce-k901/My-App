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
      trialDate,
      trialTime,
      trialLocation,
      trialDuration,
      whatToBring,
      additionalInfo,
      applicationId,
      confirmationToken,
    } = body

    if (!candidateEmail || !candidateName || !jobTitle || !trialDate) {
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
    
    // Format date
    const dateObj = new Date(trialDate)
    const formattedDate = dateObj.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trial Shift Invitation - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0b0e; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1d24; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #D37E91 0%, #8B5CF6 100%); padding: 40px 32px; text-align: center; position: relative;">
      <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px;">
        👨‍🍳
      </div>
      <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.8px;">
        Trial Shift Invitation
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
          Hi ${candidateName.split(' ')[0]},
        </p>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6;">
          Following your interview, we'd like to invite you for a trial shift as <span style="color: #D37E91; font-weight: 600;">${jobTitle}</span>.
        </p>
      </div>
      
      <!-- Details Grid -->
      <div style="background: rgba(211, 126, 145, 0.08); border: 1px solid rgba(211, 126, 145, 0.15); border-radius: 12px; padding: 0; margin: 28px 0; overflow: hidden;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Date</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${formattedDate}</div>
            </td>
          </tr>
          ${trialTime ? `
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Time</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${trialTime} · ${trialDuration || '4 hours'}</div>
            </td>
          </tr>
          ` : ''}
          ${trialLocation ? `
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Location</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${trialLocation}</div>
            </td>
          </tr>
          ` : ''}
          ${additionalInfo && additionalInfo.includes('You will meet') ? `
          <tr>
            <td style="padding: 16px 20px;">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Contact</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${additionalInfo.match(/You will meet ([^\n]+)/)?.[1] || 'Manager'}</div>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${whatToBring ? `
      <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #F59E0B; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <div style="color: #F59E0B; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
          What to Bring
        </div>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.75); font-size: 14px; line-height: 1.6;">${whatToBring}</p>
      </div>
      ` : ''}
      
      ${additionalInfo && additionalInfo.includes('Payment') ? `
      <div style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10B981; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <div style="color: #10B981; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
          Payment Terms
        </div>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.75); font-size: 14px; line-height: 1.6;">${additionalInfo.split('💰 Payment Terms:')[1]?.split('\n')[1]?.trim() || 'Details provided separately'}</p>
      </div>
      ` : ''}
      
      ${confirmationToken ? `
      <!-- CTA Section -->
      <div style="margin: 40px 0 32px;">
        <!-- Primary Confirm Button -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 20px 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${confirmationToken}" 
                 style="background: #10B981; color: #ffffff; text-decoration: none; padding: 20px 40px; border-radius: 12px; font-weight: 700; font-size: 18px; display: inline-block; min-width: 280px; text-align: center;">
                <span style="font-size: 24px; display: block; margin-bottom: 4px;">✓</span>
                <span style="display: block;">Confirm Attendance</span>
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Divider -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 12px 0;">
          <tr>
            <td style="padding: 8px 0; text-align: center; color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
              Or
            </td>
          </tr>
        </table>
        
        <!-- Secondary Button -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${confirmationToken}" 
                 style="background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.9); text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; min-width: 280px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.15);">
                <span style="font-size: 16px; display: block; margin-bottom: 2px;">🔄</span>
                <span style="display: block;">Request Changes</span>
              </a>
            </td>
          </tr>
        </table>
      </div>
      ` : `
      <div style="background: rgba(211, 126, 145, 0.1); border: 1px solid rgba(211, 126, 145, 0.2); border-radius: 12px; padding: 24px; margin: 32px 0; text-align: center;">
        <p style="margin: 0 0 12px; color: rgba(255, 255, 255, 0.9); font-size: 15px; font-weight: 600;">
          📧 Please Confirm
        </p>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.6); font-size: 13px; line-height: 1.6;">
          Reply to this email to confirm or reschedule
        </p>
      </div>
      `}
      
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

    // Send email
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: candidateEmail,
        subject: `Trial Shift Invitation: ${jobTitle} at ${companyName}`,
        html: htmlContent,
      }),
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      throw new Error(emailResult.error || 'Failed to send email')
    }

    if (emailResult.skipped) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured',
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      message: 'Trial invitation sent successfully',
    })
  } catch (error: any) {
    console.error('Send trial invite error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send trial invitation' },
      { status: 500 }
    )
  }
}
