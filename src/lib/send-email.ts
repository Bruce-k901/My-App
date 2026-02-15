import { Resend } from 'resend'

/**
 * Send an email via Resend SDK (same approach as /api/test-email which works on Vercel).
 * Returns { success, skipped?, error? }
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.log('📧 (email skipped) Missing RESEND_API_KEY:', { to, subject })
    return { success: false, skipped: true, error: 'Email service not configured. Set RESEND_API_KEY.' }
  }

  try {
    const resend = new Resend(apiKey)

    const { data, error } = await resend.emails.send({
      from: 'Opsly <noreply@opslytech.com>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error(`❌ Resend error for ${to}: ${error.message}`)
      return { success: false, error: `Email send failed: ${error.message}` }
    }

    console.log(`✅ Email sent to ${to} (id: ${data?.id})`)
    return { success: true }
  } catch (err: any) {
    console.error(`❌ Resend exception for ${to}: ${err.message}`)
    return { success: false, error: `Email send failed: ${err.message}` }
  }
}
