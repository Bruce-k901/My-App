/**
 * Generate HTML email for yes/no action request notifications.
 * Sent to selected managers when a yes/no question triggers requestAction.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const OPSLY_LOGO = `<img src="https://opslytech.com/logos/opsly-logo-email.png" alt="Opsly" width="120" style="display: block; margin: 0 auto 24px;" />`

export function generateYesNoActionEmailHTML({
  question,
  answer,
  actionMessage,
  actionResponse,
  completedBy,
  taskName,
  siteName,
}: {
  question: string
  answer: string
  actionMessage?: string | null
  actionResponse?: string | null
  completedBy: string
  taskName: string
  siteName: string
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #f4f4f5; margin: 0; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7;">
    <tr>
      <td style="padding: 40px 30px; text-align: center;">
        ${OPSLY_LOGO}
        <h2 style="color: #1a1a2e; font-size: 22px; font-weight: bold; margin: 0 0 10px;">Action Required</h2>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">A task response requires your attention.</p>

        <!-- Question & Answer -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; text-align: left; margin-bottom: 16px;">
          <tr>
            <td style="padding: 14px 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">Question</p>
              <p style="margin: 0 0 10px; font-size: 14px; color: #78350F;">${escapeHtml(question)}</p>
              <p style="margin: 0; font-size: 13px; color: #92400E;">Answer: <strong style="color: #DC2626;">${escapeHtml(answer)}</strong></p>
            </td>
          </tr>
        </table>

        ${actionMessage ? `
        <!-- Template Instruction -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; text-align: left; margin-bottom: 16px;">
          <tr>
            <td style="padding: 12px 20px;">
              <p style="margin: 0; font-size: 13px; color: #52525b;"><strong>Template instruction:</strong> ${escapeHtml(actionMessage)}</p>
            </td>
          </tr>
        </table>` : ''}

        ${actionResponse ? `
        <!-- Staff Response -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; text-align: left; margin-bottom: 16px;">
          <tr>
            <td style="padding: 12px 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.5px;">Staff Action Taken</p>
              <p style="margin: 0; font-size: 14px; color: #1E3A5F;">${escapeHtml(actionResponse)}</p>
            </td>
          </tr>
        </table>` : ''}

        <!-- Details -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; text-align: left;">
          <tr>
            <td style="padding: 16px 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #a1a1aa; font-size: 13px; width: 100px;">Task</td>
                  <td style="padding: 4px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(taskName)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #a1a1aa; font-size: 13px;">Site</td>
                  <td style="padding: 4px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(siteName)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #a1a1aa; font-size: 13px;">Completed by</td>
                  <td style="padding: 4px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(completedBy)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #a1a1aa; font-size: 13px;">Date</td>
                  <td style="padding: 4px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">Sent by Opsly</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
