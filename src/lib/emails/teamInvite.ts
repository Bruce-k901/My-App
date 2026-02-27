/**
 * Generate HTML email template for team member invitations.
 * Sent when an admin invites a new team member to Opsly.
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

export function generateTeamInviteEmailHTML({
  companyName,
  inviteUrl,
  inviterName,
  roleName,
}: {
  companyName: string
  inviteUrl: string
  inviterName?: string
  roleName?: string
}): string {
  let bodyText = `<strong>${escapeHtml(companyName)}</strong> has invited you to join their operations platform, Opsly.`
  if (inviterName) bodyText += ` ${escapeHtml(inviterName)} sent this invitation.`
  if (roleName) bodyText += ` You've been assigned the role of ${escapeHtml(roleName)}.`
  bodyText += ' Click below to accept and set up your account.'

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
        <h2 style="color: #1a1a2e; font-size: 22px; font-weight: bold; margin: 0 0 10px;">You've Been Invited to Opsly</h2>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${bodyText}</p>
        <a href="${escapeHtml(inviteUrl)}" style="display: inline-block; background-color: #D37E91; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">Set Up My Account</a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 30px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
