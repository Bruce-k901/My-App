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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">

  <!-- Header -->
  <div style="background: #D37E91; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">Opsly Task Notification</h1>
  </div>

  <!-- Custom Message -->
  <div style="background: white; padding: 24px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
    <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6;">
      ${escapeHtml(message)}
    </p>
  </div>

  <!-- Task Summary Card -->
  <div style="background: #FFF7ED; padding: 20px 24px; border: 1px solid #FED7AA; border-radius: 0 0 8px 8px; margin-bottom: 20px;">
    <h3 style="color: #92400E; margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Task Summary</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; width: 110px; vertical-align: top;">Task</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${escapeHtml(taskName)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; vertical-align: top;">Completed by</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${escapeHtml(completedBy)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; vertical-align: top;">Site</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${escapeHtml(siteName)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; vertical-align: top;">Date</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${escapeHtml(date)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; vertical-align: top;">Time</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${escapeHtml(time)}</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <p style="color: #999; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
    This is an automated notification from <strong>Opsly</strong> for ${escapeHtml(companyName)}.
  </p>
</body>
</html>`
}
