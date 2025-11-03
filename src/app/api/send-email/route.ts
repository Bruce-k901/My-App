import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple email sending via Supabase or external service
// For now, logs to console and could be extended with SendGrid/Resend/etc.
export async function POST(req: Request) {
  try {
    const { to, subject, body, html } = await req.json()

    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing to or subject' }, { status: 400 })
    }

    // TODO: Integrate with SendGrid, Resend, or other email service
    // For now, just log it (in production, you'd send via actual email service)
    console.log('📧 Email would be sent:', {
      to,
      subject,
      body,
      html
    })

    // If you have SendGrid set up:
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send({
    //   to,
    //   from: 'no-reply@checkly.app',
    //   subject,
    //   text: body,
    //   html: html || body
    // })

    return NextResponse.json({ success: true, message: 'Email sent (logged)' })
  } catch (error: any) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}

