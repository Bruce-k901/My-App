/**
 * Send an email via Resend API directly (no self-calling HTTP).
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
  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM

  if (!apiKey || !from) {
    console.log('📧 (email skipped) Missing RESEND_API_KEY or RESEND_FROM/EMAIL_FROM. Email would be:', {
      to,
      subject,
    })
    return { success: false, skipped: true, error: 'Email service not configured. Set RESEND_API_KEY and RESEND_FROM in environment variables.' }
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: html.replace(/<[^>]*>/g, ''),
      html,
    }),
  })

  if (!resp.ok) {
    const errorText = await resp.text()
    console.error(`❌ Resend API error for ${to}:`, { status: resp.status, response: errorText, from })
    return { success: false, error: `Email send failed (${resp.status}): ${errorText}` }
  }

  console.log(`✅ Email sent successfully to ${to}`)
  return { success: true }
}
