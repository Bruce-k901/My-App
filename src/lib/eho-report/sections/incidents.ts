import type { EHOReportData } from '../types'
import { escapeHtml, truncateText } from '../utils/formatters'
import { buildSection, buildSubSection, buildStatCards, buildDataTable, buildCallout } from '../utils/helpers'

export function buildIncidentsSection(data: EHOReportData): string {
  const { incidentReports, staffProfiles } = data

  // Build a profile name lookup (reported_by is a profile UUID)
  const profileNameMap = new Map<string, string>()
  for (const p of staffProfiles) {
    if (p.id && p.full_name) profileNameMap.set(p.id, p.full_name)
  }

  const total = incidentReports.length
  const bySeverity: Record<string, number> = {}
  incidentReports.forEach(r => {
    const sev = r.severity || 'unknown'
    bySeverity[sev] = (bySeverity[sev] || 0) + 1
  })

  const riddorCount = incidentReports.filter(r => r.riddor_reportable === true).length
  const openCount = incidentReports.filter(r => r.status === 'open' || r.status === 'investigating').length

  const stats = buildStatCards([
    { value: total, label: 'Total Incidents' },
    { value: riddorCount, label: 'RIDDOR Reportable', colorClass: riddorCount > 0 ? 'text-red' : 'text-green' },
    { value: openCount, label: 'Open/Investigating', colorClass: openCount > 0 ? 'text-amber' : 'text-green' },
    { value: (bySeverity['critical'] || 0) + (bySeverity['major'] || 0), label: 'Major/Critical', colorClass: ((bySeverity['critical'] || 0) + (bySeverity['major'] || 0)) > 0 ? 'text-red' : 'text-green' },
  ])

  // RIDDOR callout
  let riddorCallout = ''
  if (riddorCount > 0) {
    const riddorIncidents = incidentReports.filter(r => r.riddor_reportable === true)
    const details = riddorIncidents.map(r => {
      const reported = r.riddor_reported ? `Reported (${escapeHtml(r.riddor_reference || 'no ref')})` : '<strong>Not yet reported</strong>'
      return `<strong>${escapeHtml(r.incident_type)}</strong> — ${escapeHtml(r.title || '')} — ${reported} (${escapeHtml(r.status)})`
    }).join('<br/>')
    riddorCallout = buildCallout('danger', 'RIDDOR Reportable Incidents', details)
  }

  // Build display rows with resolved names
  const displayRows = incidentReports.map(r => ({
    ...r,
    reported_by_name: r.reported_by ? (profileNameMap.get(r.reported_by) || 'Unknown') : 'Unknown',
    description_short: truncateText(r.description, 120),
    incident_type_display: formatIncidentType(r.incident_type),
    date_display: r.incident_date || r.reported_date,
    location_display: r.location || 'Not specified',
  }))

  const table = buildDataTable({
    headers: [
      { key: 'incident_type_display', label: 'Type' },
      { key: 'severity', label: 'Severity', format: 'badge', badgeMap: { near_miss: 'blue', minor: 'blue', moderate: 'amber', major: 'red', critical: 'red', fatality: 'red' } },
      { key: 'date_display', label: 'Date', format: 'datetime' },
      { key: 'location_display', label: 'Location' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { open: 'amber', investigating: 'amber', resolved: 'green', closed: 'green' } },
      { key: 'reported_by_name', label: 'Reported By' },
      { key: 'description_short', label: 'Description' },
    ],
    rows: displayRows,
    emptyMessage: 'No incidents reported during this period.',
  })

  // Follow-up / corrective actions
  const withActions = incidentReports.filter(r => r.corrective_actions || r.immediate_actions_taken || r.investigation_notes || r.root_cause)
  let followUpHtml = ''
  if (withActions.length > 0) {
    const items = withActions.map(r => {
      const immediate = r.immediate_actions_taken ? `<strong>Immediate:</strong> ${escapeHtml(r.immediate_actions_taken)}` : ''
      const corrective = r.corrective_actions ? `<strong>Corrective:</strong> ${escapeHtml(r.corrective_actions)}` : ''
      const rootCause = r.root_cause ? `<strong>Root Cause:</strong> ${escapeHtml(r.root_cause)}` : ''
      const investigation = r.investigation_notes ? `<strong>Investigation:</strong> ${escapeHtml(r.investigation_notes)}` : ''
      const details = [immediate, corrective, rootCause, investigation].filter(Boolean).join('<br/>')
      return `<tr><td>${escapeHtml(r.title || r.incident_type)}</td><td>${details}</td></tr>`
    }).join('')
    followUpHtml = buildSubSection('Follow-Up & Corrective Actions', `
      <table>
        <thead><tr><th>Incident</th><th>Details</th></tr></thead>
        <tbody>${items}</tbody>
      </table>`)
  }

  return buildSection(7, 'Incidents & Accidents', `
    ${stats}
    ${riddorCallout}
    ${table}
    ${followUpHtml}
  `)
}

function formatIncidentType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
