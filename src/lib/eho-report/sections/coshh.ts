import type { EHOReportData } from '../types'
import { getDocStatus } from '../utils/formatters'
import { buildSection, buildSubSection, buildDataTable, buildStatCards, buildCallout } from '../utils/helpers'

export function buildCoshhSection(data: EHOReportData): string {
  const { coshhDataSheets, riskAssessments } = data

  // Stats
  const activeSheets = coshhDataSheets.filter(s => s.status?.toLowerCase() === 'active')
  const verified = coshhDataSheets.filter(s => s.verification_status?.toLowerCase() === 'verified')
  const expired = coshhDataSheets.filter(s => getDocStatus(s.expiry_date) === 'expired')

  const stats = buildStatCards([
    { value: coshhDataSheets.length, label: 'Total Chemicals' },
    { value: activeSheets.length, label: 'Active', colorClass: 'text-green' },
    { value: verified.length, label: 'Verified' },
    { value: expired.length, label: 'Expired SDS', colorClass: expired.length > 0 ? 'text-red' : 'text-green' },
  ])

  let expiryCallout = ''
  if (expired.length > 0) {
    const names = expired.map(s => s.product_name).join(', ')
    expiryCallout = buildCallout('danger', `${expired.length} Expired Safety Data Sheet${expired.length > 1 ? 's' : ''}`, names)
  }

  // Chemical inventory table
  const chemTable = buildDataTable({
    headers: [
      { key: 'product_name', label: 'Product' },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'hazard_display', label: 'Hazards' },
      { key: 'document_type', label: 'Doc Type' },
      { key: 'issue_date', label: 'Issue Date', format: 'date' },
      { key: 'expiry_date', label: 'Expiry', format: 'date' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { active: 'green', inactive: 'gray', expired: 'red' } },
      { key: 'verification_status', label: 'Verified', format: 'badge', badgeMap: { verified: 'green', unverified: 'amber', pending: 'amber' } },
    ],
    rows: coshhDataSheets.map(s => ({
      ...s,
      hazard_display: s.hazard_types?.join(', ') || 'N/A',
    })),
    emptyMessage: 'No COSHH data sheets found. Upload safety data sheets for all chemicals used on site.',
  })

  // COSHH risk assessments
  const coshhRAs = riskAssessments.filter(ra => ra.template_type === 'coshh')

  const raTable = buildDataTable({
    headers: [
      { key: 'title', label: 'Assessment' },
      { key: 'ref_code', label: 'Ref', align: 'center' },
      { key: 'assessor_name', label: 'Assessor' },
      { key: 'assessment_date', label: 'Date', format: 'date' },
      { key: 'next_review_date', label: 'Next Review', format: 'date' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { published: 'green', draft: 'blue', archived: 'gray' } },
      { key: 'linked_chemicals_display', label: 'Linked Chemicals' },
      { key: 'linked_ppe_display', label: 'Required PPE' },
    ],
    rows: coshhRAs.map(ra => ({
      ...ra,
      linked_chemicals_display: ra.linked_chemicals?.join(', ') || 'N/A',
      linked_ppe_display: ra.linked_ppe?.join(', ') || 'N/A',
    })),
    emptyMessage: 'No COSHH risk assessments found.',
  })

  return buildSection(11, 'COSHH & Chemical Safety', `
    ${stats}
    ${expiryCallout}
    ${buildSubSection('Chemical Inventory', chemTable)}
    ${buildSubSection('COSHH Risk Assessments', raTable)}
  `)
}
