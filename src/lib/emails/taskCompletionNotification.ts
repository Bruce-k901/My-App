/**
 * Generate HTML email template for task completion notifications.
 * Sent to configured recipients when a task created from a template is completed.
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

export function generateTaskCompletionEmailHTML({
  message,
  taskName,
  completedBy,
  siteName,
  companyName,
  date,
  time,
}: {
  message: string
  taskName: string
  completedBy: string
  siteName: string
  companyName: string
  date: string
  time: string
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
        <h2 style="color: #1a1a2e; font-size: 22px; font-weight: bold; margin: 0 0 10px;">Task Completed</h2>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">${escapeHtml(message)}</p>

        <!-- Task Summary -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; text-align: left; margin-bottom: 20px;">
          <tr>
            <td style="padding: 16px 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; width: 100px; vertical-align: top;">Task</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(taskName)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; vertical-align: top;">Completed by</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(completedBy)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; vertical-align: top;">Site</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(siteName)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; vertical-align: top;">Date</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(date)}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; vertical-align: top;">Time</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(time)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">Automated notification from Opsly for ${escapeHtml(companyName)}.</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
