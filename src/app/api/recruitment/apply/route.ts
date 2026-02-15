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
      jobId,
      companyId,
      fullName,
      email,
      phone,
      coverLetter,
      source,
    } = body

    // Validation
    if (!jobId || !companyId || !fullName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1. Check if candidate already exists for this company
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', email)
      .single()

    let candidateId: string

    if (existingCandidate) {
      // Update existing candidate
      candidateId = existingCandidate.id

      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          full_name: fullName,
          phone,
          cover_letter: coverLetter,
          source: source || 'Direct Application',
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidateId)

      if (updateError) {
        console.error('Failed to update candidate:', updateError)
        throw new Error('Failed to update candidate')
      }
    } else {
      // Create new candidate
      const { data: newCandidate, error: candidateError } = await supabase
        .from('candidates')
        .insert({
          company_id: companyId,
          full_name: fullName,
          email,
          phone,
          cover_letter: coverLetter,
          source: source || 'Direct Application',
          overall_status: 'active',
        })
        .select('id')
        .single()

      if (candidateError || !newCandidate) {
        console.error('Failed to create candidate:', candidateError)
        throw new Error(`Failed to create candidate: ${candidateError?.message || 'Unknown error'}`)
      }

      candidateId = newCandidate.id
    }

    // 2. Create application (check if already applied to this job)
    const { data: existingApplication } = await supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .single()

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 400 }
      )
    }

    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        company_id: companyId,
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (applicationError || !application) {
      console.error('Failed to create application:', applicationError)
      throw new Error(`Failed to create application: ${applicationError?.message || 'Unknown error'}`)
    }

    // Send confirmation email to candidate
    try {
      // Get job details for email
      const { data: jobData } = await supabase
        .from('jobs')
        .select('title, company_id')
        .eq('id', jobId)
        .single()
      
      // Get company name
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()
      
      const companyName = companyData?.name || 'Our Company'
      const jobTitle = jobData?.title || 'the position'
      
      // Send confirmation email via Resend directly
      await sendEmail({
        to: email,
        subject: `Application Received: ${jobTitle} at ${companyName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Application Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #D37E91 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;">
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
      <h1 style="margin: 0; color: white; font-size: 28px;">Application Received!</h1>
      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9);">Thank you for applying</p>
    </div>
    
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
        Dear ${fullName},
      </p>
      
      <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
        Thank you for your application for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.
      </p>
      
      <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
        We have received your application and our hiring team will review it shortly. If your experience matches what we're looking for, we'll be in touch to arrange the next steps.
      </p>
      
      <div style="background: #f9f9f9; border-left: 4px solid #D37E91; padding: 20px; margin: 30px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 10px; color: #333;">What happens next?</h3>
        <ul style="margin: 0; padding-left: 20px; color: #666;">
          <li>Our team will review your application</li>
          <li>If shortlisted, we'll contact you for an interview</li>
          <li>Check your email regularly for updates</li>
        </ul>
      </div>
      
      <p style="margin: 30px 0 0; color: #333; font-size: 16px;">
        Best of luck!<br>
        <strong>${companyName} Recruitment Team</strong>
      </p>
    </div>
  </div>
</body>
</html>
          `,
      })
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the application if email fails
    }

    return NextResponse.json({
      success: true,
      candidateId,
      applicationId: application.id,
      message: 'Application submitted successfully',
    })
  } catch (error: any) {
    console.error('Application submission error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit application' },
      { status: 500 }
    )
  }
}
