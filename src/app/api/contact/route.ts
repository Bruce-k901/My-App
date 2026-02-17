import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/send-email'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    // Store in Supabase
    try {
      const supabase = getSupabaseAdmin()
      const { error: dbError } = await supabase
        .from('contact_submissions')
        .insert({ name, email, message })

      if (dbError) {
        console.error('Failed to store contact submission:', dbError.message, dbError.code)
      }
    } catch (dbErr) {
      console.error('Failed to store contact submission (exception):', dbErr)
    }

    const result = await sendEmail({
      to: 'hello@opslytech.com',
      subject: `Contact form: ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D37E91;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #888; vertical-align: top;">Name</td>
              <td style="padding: 8px 12px;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #888; vertical-align: top;">Email</td>
              <td style="padding: 8px 12px;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #888; vertical-align: top;">Message</td>
              <td style="padding: 8px 12px; white-space: pre-line;">${message}</td>
            </tr>
          </table>
        </div>
      `,
    })

    if (!result.success && !result.skipped) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
