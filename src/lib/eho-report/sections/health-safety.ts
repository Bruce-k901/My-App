import type { EHOReportData } from '../types'
import { getDocStatus } from '../utils/formatters'
import { buildSection, buildSubSection, buildDataTable } from '../utils/helpers'

export function buildHealthSafetySection(data: EHOReportData): string {
  const { globalDocuments, riskAssessments, taskCompletions } = data

  // H&S documents
  const hsDocs = globalDocuments.filter(d =>
    d.category?.toLowerCase().includes('h_and_s') ||
    d.category?.toLowerCase().includes('health') ||
    d.category?.toLowerCase().includes('safety')
  )

  const docsTable = buildDataTable({
    headers: [
      { key: 'name', label: 'Document' },
      { key: 'category', label: 'Category' },
      { key: 'version', label: 'Version', align: 'center' },
      { key: 'expiry_date', label: 'Expiry', format: 'date' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { valid: 'green', expiring: 'amber', expired: 'red' } },
    ],
    rows: hsDocs.map(d => ({
      ...d,
      status: getDocStatus(d.expiry_date) === 'valid' ? 'Valid' :
              getDocStatus(d.expiry_date) === 'expiring' ? 'Expiring' :
              getDocStatus(d.expiry_date) === 'expired' ? 'Expired' : 'No Expiry',
    })),
    emptyMessage: 'No health & safety documents uploaded.',
  })

  // H&S risk assessments
  const hsRAs = riskAssessments.filter(ra =>
    ra.template_type === 'general' ||
    ra.template_type === 'manual_handling' ||
    ra.title?.toLowerCase().includes('health') ||
    ra.title?.toLowerCase().includes('safety')
  )

  const raTable = buildDataTable({
    headers: [
      { key: 'title', label: 'Assessment' },
      { key: 'ref_code', label: 'Ref', align: 'center' },
      { key: 'template_type', label: 'Type' },
      { key: 'assessor_name', label: 'Assessor' },
      { key: 'assessment_date', label: 'Date', format: 'date' },
      { key: 'next_review_date', label: 'Next Review', format: 'date' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { published: 'green', draft: 'blue', archived: 'gray' } },
      { key: 'total_hazards', label: 'Hazards', align: 'center' },
      { key: 'hazards_controlled', label: 'Controlled', align: 'center' },
      { key: 'highest_risk_level', label: 'Risk', format: 'badge', badgeMap: { low: 'green', medium: 'amber', high: 'red', critical: 'red' } },
    ],
    rows: hsRAs,
    emptyMessage: 'No health & safety risk assessments found.',
  })

  // H&S task completions
  const hsTasks = taskCompletions.filter(t => t.template_category === 'h_and_s')
  const hsTasksTable = buildDataTable({
    headers: [
      { key: 'template_name', label: 'Task' },
      { key: 'completed_at', label: 'Completed', format: 'datetime' },
      { key: 'completed_by_name', label: 'By' },
      { key: 'flagged_display', label: 'Flagged', format: 'badge', align: 'center', badgeMap: { flagged: 'red', '': 'gray' } },
    ],
    rows: hsTasks.map(t => ({
      ...t,
      flagged_display: t.flagged ? 'Flagged' : '',
    })),
    maxRows: 100,
    emptyMessage: 'No H&S task completions for this period.',
  })

  return buildSection(9, 'Health & Safety Compliance', `
    ${buildSubSection('H&S Policies & Documents', docsTable)}
    ${buildSubSection('Risk Assessments', raTable)}
    ${buildSubSection('H&S Task Completions', hsTasksTable)}
  `)
}
