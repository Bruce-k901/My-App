import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/send-email'

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
      interviewDate,
      interviewTime,
      interviewLocation,
      interviewType, // 'in-person', 'video', 'phone'
      additionalInfo,
      applicationId, // NEW: For confirmation link
      confirmationToken, // NEW: Token for confirmation
    } = body

    if (!candidateEmail || !candidateName || !jobTitle || !interviewDate) {
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
    
    // Format date and time
    const dateObj = new Date(interviewDate)
    const formattedDate = dateObj.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
    
    const interviewTypeLabels: Record<string, string> = {
      'in-person': '📍 In-Person Interview',
      'video': '💻 Video Interview',
      'phone': '📞 Phone Interview',
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Invitation - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0b0e; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1d24; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #D37E91 0%, #8B5CF6 100%); padding: 40px 32px; text-align: center; position: relative;">
      <div style="margin: 0 auto 20px; text-align: center;">
        <svg width="60" height="40" viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="24" height="110" rx="12" fill="#1B2624"/>
          <rect x="44" y="30" width="24" height="90" rx="12" fill="#8B2E3E"/>
          <rect x="78" y="15" width="24" height="105" rx="12" fill="#D9868C"/>
          <rect x="112" y="25" width="24" height="95" rx="12" fill="#5D8AA8"/>
          <rect x="146" y="10" width="24" height="110" rx="12" fill="#87B0D6"/>
          <rect x="180" y="20" width="24" height="100" rx="12" fill="#9AC297"/>
        </svg>
      </div>
      <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.8px;">
        Interview Invitation
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
          We'd like to invite you to an interview for <span style="color: #D37E91; font-weight: 600;">${jobTitle}</span>.
        </p>
      </div>
      
      <!-- Details Grid -->
      <div style="background: rgba(211, 126, 145, 0.08); border: 1px solid rgba(211, 126, 145, 0.15); border-radius: 12px; padding: 0; margin: 28px 0; overflow: hidden;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Type</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${interviewTypeLabels[interviewType] || 'Interview'}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Date</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${formattedDate}</div>
            </td>
          </tr>
          ${interviewTime ? `
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Time</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${interviewTime}</div>
            </td>
          </tr>
          ` : ''}
          ${interviewLocation ? `
          <tr>
            <td style="padding: 16px 20px;">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Location</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${interviewLocation}</div>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${additionalInfo ? `
      <div style="background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3B82F6; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <div style="color: #3B82F6; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
          Additional Information
        </div>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.75); font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${additionalInfo}</p>
      </div>
      ` : ''}
      
    <!-- Content -->
    <div style="padding: 36px 32px;">
      <!-- Greeting -->
      <div style="margin-bottom: 28px;">
        <p style="margin: 0 0 8px; color: rgba(255, 255, 255, 0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          Hi ${candidateName.split(' ')[0]},
        </p>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6;">
          We'd like to invite you to an interview for <span style="color: #D37E91; font-weight: 600;">${jobTitle}</span>.
        </p>
      </div>
      
      <!-- Details Grid -->
      <div style="background: rgba(211, 126, 145, 0.08); border: 1px solid rgba(211, 126, 145, 0.15); border-radius: 12px; padding: 0; margin: 28px 0; overflow: hidden;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Type</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${interviewTypeLabels[interviewType] || 'Interview'}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Date</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${formattedDate}</div>
            </td>
          </tr>
          ${interviewTime ? `
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Time</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${interviewTime}</div>
            </td>
          </tr>
          ` : ''}
          ${interviewLocation ? `
          <tr>
            <td style="padding: 16px 20px;">
              <div style="color: rgba(255, 255, 255, 0.4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">Location</div>
              <div style="color: #ffffff; font-size: 15px; font-weight: 600;">${interviewLocation}</div>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${additionalInfo ? `
      <div style="background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3B82F6; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <div style="color: #3B82F6; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
          Additional Information
        </div>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.75); font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${additionalInfo}</p>
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

    // Send email via Resend directly
    const emailResult = await sendEmail({
      to: candidateEmail,
      subject: `Interview Invitation: ${jobTitle} at ${companyName}`,
      html: htmlContent,
    })

    if (emailResult.skipped) {
      return NextResponse.json({
        success: false,
        skipped: true,
        error: emailResult.error,
      }, { status: 200 })
    }

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email')
    }

    return NextResponse.json({
      success: true,
      message: 'Interview invitation sent successfully',
    })
  } catch (error: any) {
    console.error('Send interview invite error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send interview invitation' },
      { status: 500 }
    )
  }
}
