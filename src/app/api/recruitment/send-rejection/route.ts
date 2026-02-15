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
      personalMessage,
    } = body

    if (!candidateEmail || !candidateName || !jobTitle) {
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

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Application Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); padding: 40px 30px; text-align: center;">
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
      <h1 style="margin: 0; color: white; font-size: 28px;">Application Update</h1>
      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9);">${companyName}</p>
    </div>
    
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
        Dear ${candidateName},
      </p>
      
      <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
        Thank you for your interest in the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong> and for taking the time to apply.
      </p>
      
      <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
        After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current requirements.
      </p>
      
      ${personalMessage ? `
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0; color: #374151; font-size: 14px;">${personalMessage}</p>
      </div>
      ` : ''}
      
      <p style="margin: 20px 0; color: #333; font-size: 16px;">
        We appreciate your interest in joining our team and wish you the very best in your job search.
      </p>
      
      <p style="margin: 20px 0; color: #666; font-size: 14px;">
        We keep all applications on file and may reach out in the future if a suitable position becomes available.
      </p>
      
      <p style="margin: 30px 0 0; color: #333; font-size: 16px;">
        Best wishes,<br>
        <strong>${companyName} Team</strong>
      </p>
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
        subject: `Application Update: ${jobTitle} at ${companyName}`,
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
      message: 'Rejection email sent successfully',
    })
  } catch (error: any) {
    console.error('Send rejection error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send rejection email' },
      { status: 500 }
    )
  }
}
