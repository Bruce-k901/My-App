import type { EHOReportData } from '../types'
import { buildSection, buildSubSection, buildDataTable, buildCallout, buildEmptyState } from '../utils/helpers'

export function buildPestControlSection(data: EHOReportData): string {
  const { pestControlRecords, contractorCallouts } = data

  // Internal inspections
  const inspections = buildDataTable({
    headers: [
      { key: 'completed_at', label: 'Date', format: 'datetime' },
      { key: 'completed_by_name', label: 'Inspector' },
      { key: 'assessment_result', label: 'Result', format: 'badge', badgeMap: { pass: 'green', fail: 'red', 'n/a': 'gray' } },
      { key: 'findings', label: 'Findings' },
      { key: 'actions_taken', label: 'Actions Taken' },
    ],
    rows: pestControlRecords,
    emptyMessage: 'No pest control inspection records found for this period.',
  })

  // Failed inspections callout
  const failures = pestControlRecords.filter(r => r.assessment_result?.toLowerCase() === 'fail')
  let failCallout = ''
  if (failures.length > 0) {
    failCallout = buildCallout('danger', `${failures.length} Failed Pest Inspection${failures.length > 1 ? 's' : ''}`, 'Failed inspections may have triggered contractor callouts. See contractor visits below.')
  }

  // Contractor callouts (pest control only)
  const pestCallouts = contractorCallouts.filter(c => c.contractor_type === 'pest_control')
  let contractorSection: string
  if (pestCallouts.length > 0) {
    contractorSection = buildDataTable({
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
    contractorSection = buildEmptyState('No contractor pest control visits recorded for this period.')
  }

  return buildSection(5, 'Pest Control', `
    ${failCallout}
    ${buildSubSection('Internal Pest Inspections', inspections)}
    ${buildSubSection('Contractor Pest Control Visits', contractorSection)}
  `)
}
