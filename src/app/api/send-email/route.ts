import { NextResponse } from 'next/server'

// Email sending (Resend) with safe fallback-to-log if keys aren't configured.
export async function POST(req: Request) {
  try {
    const { to, subject, body, html, bcc } = await req.json()

    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing to or subject' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM || process.env.EMAIL_FROM

    // Normalize recipients (string or array)
    const recipients: string[] = Array.isArray(to) ? to : [to]

    if (!apiKey || !from) {
      // Fallback: keep old behavior so the app doesn't break in environments without email config
      console.log('📧 (email skipped) Missing RESEND_API_KEY or RESEND_FROM/EMAIL_FROM. Email would be:', {
        to: recipients,
        subject,
        body,
        html
      })
      return NextResponse.json({ success: true, message: 'Email skipped (logged)', skipped: recipients.length })
    }

    // Send individual emails (keeps provider responses per recipient simple)
    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from,
            to: [recipient],
            subject,
            text: body || (typeof html === 'string' ? html.replace(/<[^>]*>/g, '') : ''),
            html: html || body,
            ...(bcc ? { bcc: Array.isArray(bcc) ? bcc : [bcc] } : {}),
          })
        })
        if (!resp.ok) {
          const t = await resp.text()
          console.error(`❌ Resend API error for ${recipient}:`, {
            status: resp.status,
            response: t,
            from,
            to: recipient
          })
          throw new Error(`Resend error ${resp.status}: ${t}`)
        }
        console.log(`✅ Email sent successfully to ${recipient}`)
        return true
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed) {
      console.warn('Some emails failed to send via Resend', { sent, failed })
    }

    return NextResponse.json({ success: true, message: 'Email sent', sent, failed })
  } catch (error: any) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
  }
}

