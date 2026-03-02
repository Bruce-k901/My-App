import type { EHOReportData } from '../types'
import { getDocStatus } from '../utils/formatters'
import { buildSection, buildSubSection, buildDataTable } from '../utils/helpers'

export function buildFireSafetySection(data: EHOReportData): string {
  const { globalDocuments, riskAssessments, taskCompletions } = data

  // Fire documents
  const fireDocs = globalDocuments.filter(d =>
    d.category?.toLowerCase().includes('fire')
  )

  const docsTable = buildDataTable({
    headers: [
      { key: 'name', label: 'Document' },
      { key: 'version', label: 'Version', align: 'center' },
      { key: 'expiry_date', label: 'Expiry', format: 'date' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { valid: 'green', expiring: 'amber', expired: 'red' } },
    ],
    rows: fireDocs.map(d => ({
      ...d,
      status: getDocStatus(d.expiry_date) === 'valid' ? 'Valid' :
              getDocStatus(d.expiry_date) === 'expiring' ? 'Expiring' :
              getDocStatus(d.expiry_date) === 'expired' ? 'Expired' : 'No Expiry',
    })),
    emptyMessage: 'No fire safety documents uploaded.',
  })

  // Fire risk assessments
  const fireRAs = riskAssessments.filter(ra =>
    ra.template_type === 'fire' ||
    ra.title?.toLowerCase().includes('fire')
  )

  const raTable = buildDataTable({
    headers: [
      { key: 'title', label: 'Assessment' },
      { key: 'ref_code', label: 'Ref', align: 'center' },
      { key: 'assessor_name', label: 'Assessor' },
      { key: 'assessment_date', label: 'Date', format: 'date' },
      { key: 'next_review_date', label: 'Next Review', format: 'date' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { published: 'green', draft: 'blue', archived: 'gray' } },
    ],
    rows: fireRAs,
    emptyMessage: 'No fire risk assessments found.',
  })

  // Fire safety task completions
  const fireTasks = taskCompletions.filter(t => t.template_category === 'fire')

  // Group by task type for summary
  const taskTypes: Record<string, number> = {}
  fireTasks.forEach(t => {
    const name = t.template_name || 'Unknown'
    taskTypes[name] = (taskTypes[name] || 0) + 1
  })

  let taskSummary = ''
  if (Object.keys(taskTypes).length > 0) {
    const summaryRows = Object.entries(taskTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ task_name: name, completions: count }))

    taskSummary = buildDataTable({
      headers: [
        { key: 'task_name', label: 'Fire Safety Check' },
        { key: 'completions', label: 'Completions', align: 'center' },
      ],
      rows: summaryRows,
    })
  }

  const fireTasksTable = buildDataTable({
    headers: [
      { key: 'template_name', label: 'Task' },
      { key: 'completed_at', label: 'Completed', format: 'datetime' },
      { key: 'completed_by_name', label: 'By' },
    ],
    rows: fireTasks,
    maxRows: 200,
    emptyMessage: 'No fire safety task completions for this period.',
  })

  return buildSection(10, 'Fire Safety', `
    ${buildSubSection('Fire Safety Documents', docsTable)}
    ${buildSubSection('Fire Risk Assessments', raTable)}
    ${taskSummary ? buildSubSection('Fire Safety Check Summary', taskSummary) : ''}
    ${buildSubSection('Fire Safety Records', fireTasksTable)}
  `)
}
