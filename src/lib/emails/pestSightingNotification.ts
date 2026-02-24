/**
 * Generate HTML email template for pest sighting contractor notifications.
 * Sent to the pest control contractor when a sighting is logged.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatLabel(str: string): string {
  return escapeHtml(str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  medium: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  high: { bg: '#FFF7ED', text: '#9A3412', border: '#FDBA74' },
  critical: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
}

export function generatePestSightingEmailHTML({
  siteName,
  companyName,
  reportedBy,
  sightingDate,
  sightingTime,
  pestType,
  evidenceType,
  locationArea,
  locationDetails,
  severity,
  quantityEstimate,
  immediateActionTaken,
  notes,
}: {
  siteName: string
  companyName: string
  reportedBy: string
  sightingDate: string
  sightingTime?: string | null
  pestType: string
  evidenceType?: string | null
  locationArea: string
  locationDetails?: string | null
  severity: string
  quantityEstimate?: string | null
  immediateActionTaken?: string | null
  notes?: string | null
}): string {
  const sev = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low
  const isUrgent = severity === 'high' || severity === 'critical'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">

  <!-- Header -->
  <div style="background: ${isUrgent ? '#DC2626' : '#D37E91'}; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">
      ${isUrgent ? 'URGENT: ' : ''}Pest Sighting Reported
    </h1>
    <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">
      ${escapeHtml(siteName)} &mdash; ${escapeHtml(companyName)}
    </p>
  </div>

  <!-- Intro -->
  <div style="background: white; padding: 20px 24px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
    <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.6;">
      A pest sighting has been logged at <strong>${escapeHtml(siteName)}</strong> and your attention is requested.
      Please review the details below and arrange a visit if required.
    </p>
  </div>

  <!-- Severity Banner -->
  <div style="background: ${sev.bg}; padding: 12px 24px; border-left: 4px solid ${sev.border}; border-right: 1px solid #eee;">
    <p style="margin: 0; font-size: 13px; color: ${sev.text}; font-weight: 600;">
      Severity: ${formatLabel(severity)}${quantityEstimate ? ` &mdash; Quantity: ${formatLabel(quantityEstimate)}` : ''}
    </p>
  </div>

  <!-- Sighting Details Card -->
  <div style="background: white; padding: 20px 24px; border: 1px solid #eee; border-top: none;">
    <h3 style="color: #78716C; margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Sighting Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; width: 130px; vertical-align: top;">Date</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${escapeHtml(sightingDate)}${sightingTime ? ` at ${escapeHtml(sightingTime)}` : ''}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; vertical-align: top;">Pest Type</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${formatLabel(pestType)}</td>
      </tr>
      ${evidenceType ? `<tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; vertical-align: top;">Evidence</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${formatLabel(evidenceType)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; vertical-align: top;">Location</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${escapeHtml(locationArea)}${locationDetails ? `<br><span style="font-weight: 400; color: #78716C;">${escapeHtml(locationDetails)}</span>` : ''}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716C; font-size: 13px; vertical-align: top;">Reported By</td>
        <td style="padding: 6px 0; color: #1C1917; font-size: 13px; font-weight: 500;">${escapeHtml(reportedBy)}</td>
      </tr>
    </table>
  </div>

  ${immediateActionTaken ? `
  <!-- Immediate Action -->
  <div style="background: #F0FDF4; padding: 16px 24px; border: 1px solid #BBF7D0; border-top: none;">
    <h3 style="color: #166534; margin: 0 0 6px 0; font-size: 13px; font-weight: 600;">Immediate Action Taken</h3>
    <p style="margin: 0; font-size: 13px; color: #15803D; line-height: 1.5;">${escapeHtml(immediateActionTaken)}</p>
  </div>` : ''}

  ${notes ? `
  <!-- Notes -->
  <div style="background: white; padding: 16px 24px; border: 1px solid #eee; border-top: none;">
    <h3 style="color: #78716C; margin: 0 0 6px 0; font-size: 13px; font-weight: 600;">Additional Notes</h3>
    <p style="margin: 0; font-size: 13px; color: #333; line-height: 1.5;">${escapeHtml(notes)}</p>
  </div>` : ''}

  <!-- Footer -->
  <div style="background: #FAFAF9; padding: 16px 24px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
      This is an automated notification from <strong>Opsly</strong> on behalf of ${escapeHtml(companyName)}.
    </p>
  </div>

</body>
</html>`
}
