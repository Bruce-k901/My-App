import type { EHOReportData } from '../types'
import { getDocStatus } from '../utils/formatters'
import { buildSection, buildSubSection, buildDataTable } from '../utils/helpers'

export function buildFoodSafetySection(data: EHOReportData): string {
  const { globalDocuments, riskAssessments } = data

  // Food safety related documents
  const foodSafetyCategories = ['food_safety', 'haccp', 'allergen', 'food_hygiene', 'food safety', 'sop']
  const foodDocs = globalDocuments.filter(d =>
    foodSafetyCategories.some(c => d.category?.toLowerCase().includes(c))
  )

  const docsWithStatus = foodDocs.map(d => ({
    ...d,
    doc_status: getDocStatus(d.expiry_date) === 'valid' ? 'Valid' :
                getDocStatus(d.expiry_date) === 'expiring' ? 'Expiring' :
                getDocStatus(d.expiry_date) === 'expired' ? 'Expired' : 'No Expiry',
  }))

  const docsTable = buildDataTable({
    headers: [
      { key: 'name', label: 'Document' },
      { key: 'category', label: 'Category' },
      { key: 'version', label: 'Version', align: 'center' },
      { key: 'uploaded_at', label: 'Uploaded', format: 'date' },
      { key: 'expiry_date', label: 'Expiry', format: 'date' },
      { key: 'doc_status', label: 'Status', format: 'badge', align: 'center', badgeMap: { valid: 'green', expiring: 'amber', expired: 'red', 'no expiry': 'gray' } },
    ],
    rows: docsWithStatus,
    emptyMessage: 'No food safety documents uploaded. Ensure Food Safety Policy, HACCP Plan, and Allergen Management Policy are uploaded to the system.',
  })

  // Food safety risk assessments
  const foodRAs = riskAssessments.filter(ra =>
    ra.template_type === 'general' ||
    ra.title?.toLowerCase().includes('food') ||
    ra.title?.toLowerCase().includes('haccp')
  )

  const raTable = buildDataTable({
    headers: [
      { key: 'title', label: 'Assessment' },
      { key: 'ref_code', label: 'Ref', align: 'center' },
      { key: 'assessor_name', label: 'Assessor' },
      { key: 'assessment_date', label: 'Date', format: 'date' },
      { key: 'next_review_date', label: 'Next Review', format: 'date' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { published: 'green', draft: 'blue', archived: 'gray', overdue: 'red' } },
      { key: 'highest_risk_level', label: 'Risk Level', format: 'badge', badgeMap: { low: 'green', medium: 'amber', high: 'red', critical: 'red' } },
    ],
    rows: foodRAs,
    emptyMessage: 'No food safety risk assessments found.',
  })

  return buildSection(2, 'Food Safety Management System', `
    ${buildSubSection('Key Policies & Documents', docsTable)}
    ${buildSubSection('Food Safety Risk Assessments', raTable)}
  `)
}
