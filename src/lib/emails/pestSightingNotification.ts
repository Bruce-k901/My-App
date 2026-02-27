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

const OPSLY_LOGO = `<img src="https://opslytech.com/logos/opsly-logo-email.png" alt="Opsly" width="120" style="display: block; margin: 0 auto 24px;" />`

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
<body style="background-color: #f4f4f5; margin: 0; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7;">
    <tr>
      <td style="padding: 40px 30px; text-align: center;">
        ${OPSLY_LOGO}
        <h2 style="color: ${isUrgent ? '#DC2626' : '#1a1a2e'}; font-size: 22px; font-weight: bold; margin: 0 0 4px;">${isUrgent ? 'URGENT: ' : ''}Pest Sighting Reported</h2>
        <p style="color: #52525b; font-size: 14px; margin: 0 0 20px;">${escapeHtml(siteName)} &mdash; ${escapeHtml(companyName)}</p>

        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 20px; text-align: left;">A pest sighting has been logged at <strong>${escapeHtml(siteName)}</strong> and your attention is requested. Please review the details below and arrange a visit if required.</p>

        <!-- Severity Banner -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: ${sev.bg}; border: 1px solid ${sev.border}; border-radius: 8px; text-align: left; margin-bottom: 16px;">
          <tr>
            <td style="padding: 10px 20px;">
              <p style="margin: 0; font-size: 13px; color: ${sev.text}; font-weight: 600;">Severity: ${formatLabel(severity)}${quantityEstimate ? ` &mdash; Quantity: ${formatLabel(quantityEstimate)}` : ''}</p>
            </td>
          </tr>
        </table>

        <!-- Sighting Details -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; text-align: left; margin-bottom: 16px;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="margin: 0 0 10px; font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Sighting Details</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; width: 110px; vertical-align: top;">Date</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(sightingDate)}${sightingTime ? ` at ${escapeHtml(sightingTime)}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; vertical-align: top;">Pest Type</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${formatLabel(pestType)}</td>
                </tr>
                ${evidenceType ? `<tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; vertical-align: top;">Evidence</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${formatLabel(evidenceType)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; vertical-align: top;">Location</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(locationArea)}${locationDetails ? `<br><span style="font-weight: 400; color: #a1a1aa;">${escapeHtml(locationDetails)}</span>` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #a1a1aa; font-size: 13px; vertical-align: top;">Reported By</td>
                  <td style="padding: 5px 0; color: #1a1a2e; font-size: 13px; font-weight: 500;">${escapeHtml(reportedBy)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${immediateActionTaken ? `
        <!-- Immediate Action -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; text-align: left; margin-bottom: 16px;">
          <tr>
            <td style="padding: 12px 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #065F46; text-transform: uppercase; letter-spacing: 0.5px;">Immediate Action Taken</p>
              <p style="margin: 0; font-size: 13px; color: #15803D; line-height: 1.5;">${escapeHtml(immediateActionTaken)}</p>
            </td>
          </tr>
        </table>` : ''}

        ${notes ? `
        <!-- Notes -->
        <table cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f4f4f5; border-radius: 8px; text-align: left; margin-bottom: 16px;">
          <tr>
            <td style="padding: 12px 20px;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Additional Notes</p>
              <p style="margin: 0; font-size: 13px; color: #52525b; line-height: 1.5;">${escapeHtml(notes)}</p>
            </td>
          </tr>
        </table>` : ''}

        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">Automated notification from Opsly on behalf of ${escapeHtml(companyName)}.</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
