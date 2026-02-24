import type { EHOReportData } from '../types'
import { buildSection, buildSubSection, buildDataTable, buildCallout, buildEmptyState } from '../utils/helpers'

export function buildPestControlSection(data: EHOReportData): string {
  const { pestControlRecords, contractorCallouts, pestControlVisits, pestSightings, pestControlDevices, pestControlContract } = data

  // --- 1. Contract Summary ---
  let contractSummary: string
  if (pestControlContract) {
    const c = pestControlContract
    const certBadges: string[] = []
    if (c.bpca_certified) certBadges.push('<span class="badge badge-green">BPCA Certified</span>')
    if (c.basis_registered) certBadges.push('<span class="badge badge-green">BASIS Registered</span>')
    if (!c.bpca_certified && !c.basis_registered) certBadges.push('<span class="badge badge-amber">No certifications recorded</span>')

    const insuranceStatus = c.insurance_expiry_date
      ? new Date(c.insurance_expiry_date) < new Date()
        ? '<span class="badge badge-red">Expired</span>'
        : new Date(c.insurance_expiry_date) < new Date(Date.now() + 30 * 86400000)
          ? '<span class="badge badge-amber">Expiring Soon</span>'
          : '<span class="badge badge-green">Valid</span>'
      : '<span class="badge badge-gray">Not recorded</span>'

    contractSummary = `
      <div class="info-grid">
        <div class="info-item"><strong>Contractor:</strong> ${c.contractor_name || 'Not specified'}</div>
        <div class="info-item"><strong>Contract Period:</strong> ${c.contract_start_date || '—'} to ${c.contract_end_date || 'Ongoing'}</div>
        <div class="info-item"><strong>Routine Visits/Year:</strong> ${c.routine_visits_per_year ?? '—'}</div>
        <div class="info-item"><strong>Insurance:</strong> ${insuranceStatus}${c.insurance_expiry_date ? ` (expires ${c.insurance_expiry_date})` : ''}</div>
        <div class="info-item"><strong>Certifications:</strong> ${certBadges.join(' ')}</div>
        ${c.coverage_includes?.length ? `<div class="info-item"><strong>Coverage:</strong> ${c.coverage_includes.join(', ')}</div>` : ''}
      </div>
    `
  } else {
    contractSummary = buildCallout('warning', 'No Active Pest Control Contract', 'No active pest control contract was found for this site. A documented pest control contract with a BPCA/BASIS-certified provider is recommended for EHO compliance.')
  }

  // --- 2. Internal Pest Inspections (existing task-based records) ---
  const inspections = buildDataTable({
    headers: [
      { key: 'completed_at', label: 'Date', format: 'datetime' },
      { key: 'completed_by_name', label: 'Inspector' },
      { key: 'assessment_result', label: 'Result', format: 'badge', badgeMap: { pass: 'green', fail: 'red', 'n/a': 'gray' } },
      { key: 'findings', label: 'Findings' },
      { key: 'actions_taken', label: 'Actions Taken' },
    ],
    rows: pestControlRecords,
    emptyMessage: 'No internal pest control inspection records found for this period.',
  })

  const failures = pestControlRecords.filter(r => r.assessment_result?.toLowerCase() === 'fail')
  let failCallout = ''
  if (failures.length > 0) {
    failCallout = buildCallout('danger', `${failures.length} Failed Pest Inspection${failures.length > 1 ? 's' : ''}`, 'Failed inspections may have triggered contractor callouts. See contractor visits below.')
  }

  // --- 3. Contractor Visits (from pest_control_visits table) ---
  let visitsSection: string
  if (pestControlVisits.length > 0) {
    visitsSection = buildDataTable({
      headers: [
        { key: 'visit_date', label: 'Date', format: 'date' },
        { key: 'visit_type', label: 'Type', format: 'badge', badgeMap: { routine: 'blue', reactive: 'amber', emergency: 'red', follow_up: 'gray' } },
        { key: 'contractor_name', label: 'Contractor' },
        { key: 'technician_name', label: 'Technician' },
        { key: 'evidence_found', label: 'Evidence Found', format: 'boolean' },
        { key: 'treatments_applied', label: 'Treatments', format: 'array' },
        { key: 'total_cost', label: 'Cost', format: 'currency' },
      ],
      rows: pestControlVisits,
    })

    const evidenceVisits = pestControlVisits.filter(v => v.evidence_found)
    if (evidenceVisits.length > 0) {
      const pestTypesFound = [...new Set(evidenceVisits.flatMap(v => v.pest_types || []))]
      visitsSection = buildCallout('warning', `Pest Evidence Found on ${evidenceVisits.length} Visit${evidenceVisits.length > 1 ? 's' : ''}`, `Pest types detected: ${pestTypesFound.join(', ') || 'unspecified'}. Review treatments applied and follow-up actions.`) + visitsSection
    }

    // Chemical usage summary
    const allChemicals = pestControlVisits.flatMap(v => v.chemicals_used || [])
    if (allChemicals.length > 0) {
      const chemNames = [...new Set(allChemicals.map((c: any) => c.name).filter(Boolean))]
      visitsSection += `<p class="text-sm mt-2"><strong>Chemicals used during period:</strong> ${chemNames.join(', ')}</p>`
    }
  } else {
    visitsSection = buildEmptyState('No contractor pest control visits recorded for this period.')
  }

  // --- 4. Pest Sightings Log ---
  let sightingsSection: string
  if (pestSightings.length > 0) {
    sightingsSection = buildDataTable({
      headers: [
        { key: 'sighting_date', label: 'Date', format: 'date' },
        { key: 'pest_type', label: 'Pest Type' },
        { key: 'evidence_type', label: 'Evidence' },
        { key: 'location_area', label: 'Location' },
        { key: 'severity', label: 'Severity', format: 'badge', badgeMap: { low: 'green', medium: 'amber', high: 'red', critical: 'red' } },
        { key: 'resolved', label: 'Resolved', format: 'boolean' },
        { key: 'reported_by_name', label: 'Reported By' },
      ],
      rows: pestSightings,
    })

    const unresolved = pestSightings.filter(s => !s.resolved)
    if (unresolved.length > 0) {
      sightingsSection = buildCallout('danger', `${unresolved.length} Unresolved Pest Sighting${unresolved.length > 1 ? 's' : ''}`, 'Unresolved pest sightings require immediate attention and contractor notification.') + sightingsSection
    }

    // Trend summary
    const pestTypeCount: Record<string, number> = {}
    for (const s of pestSightings) {
      pestTypeCount[s.pest_type] = (pestTypeCount[s.pest_type] || 0) + 1
    }
    const trendSummary = Object.entries(pestTypeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${type} (${count})`)
      .join(', ')
    sightingsSection += `<p class="text-sm mt-2"><strong>Sighting breakdown:</strong> ${trendSummary}</p>`
  } else {
    sightingsSection = buildEmptyState('No pest sightings logged during this period.')
  }

  // --- 5. Monitoring Device Register ---
  let devicesSection: string
  if (pestControlDevices.length > 0) {
    devicesSection = buildDataTable({
      headers: [
        { key: 'device_number', label: 'Device #' },
        { key: 'device_type', label: 'Type' },
        { key: 'location_area', label: 'Location' },
        { key: 'status', label: 'Status', format: 'badge', badgeMap: { active: 'green', inactive: 'gray', needs_replacement: 'amber', removed: 'red' } },
        { key: 'activity_count_ytd', label: 'Activity (YTD)' },
        { key: 'last_activity_date', label: 'Last Activity', format: 'date' },
      ],
      rows: pestControlDevices,
    })

    // Summary stats
    const byType: Record<string, number> = {}
    let totalActivity = 0
    for (const d of pestControlDevices) {
      byType[d.device_type] = (byType[d.device_type] || 0) + 1
      totalActivity += d.activity_count_ytd || 0
    }
    const typeSummary = Object.entries(byType).map(([t, c]) => `${t.replace(/_/g, ' ')} (${c})`).join(', ')
    devicesSection = `<p class="text-sm mb-2"><strong>${pestControlDevices.length} active devices:</strong> ${typeSummary}. Total YTD activity: ${totalActivity} instance${totalActivity !== 1 ? 's' : ''}.</p>` + devicesSection
  } else {
    devicesSection = buildEmptyState('No pest control monitoring devices registered for this site.')
  }

  // --- 6. Legacy Contractor Callouts (from contractor_callouts if any exist) ---
  const pestCallouts = contractorCallouts.filter(c => c.contractor_type === 'pest_control')
  let calloutsSection: string
  if (pestCallouts.length > 0) {
    calloutsSection = buildDataTable({
      headers: [
        { key: 'requested_date', label: 'Requested', format: 'date' },
        { key: 'scheduled_date', label: 'Scheduled', format: 'date' },
        { key: 'completed_at', label: 'Completed', format: 'datetime' },
        { key: 'status', label: 'Status', format: 'badge', badgeMap: { completed: 'green', pending: 'amber', cancelled: 'gray', scheduled: 'blue' } },
        { key: 'issue_description', label: 'Issue' },
        { key: 'contractor_notes', label: 'Notes' },
      ],
      rows: pestCallouts,
    })
  } else {
    calloutsSection = ''
  }

  return buildSection(5, 'Pest Control', `
    ${buildSubSection('Contract Summary', contractSummary)}
    ${failCallout}
    ${buildSubSection('Internal Pest Inspections', inspections)}
    ${buildSubSection('Contractor Visits', visitsSection)}
    ${buildSubSection('Pest Sightings Log', sightingsSection)}
    ${buildSubSection('Monitoring Device Register', devicesSection)}
    ${calloutsSection ? buildSubSection('Failed Inspection Callouts', calloutsSection) : ''}
  `)
}
