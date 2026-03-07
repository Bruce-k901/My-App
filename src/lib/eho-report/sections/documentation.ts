import type { EHOReportData } from '../types'
import { getDocStatus } from '../utils/formatters'
import { buildSection, buildStatCards, buildDataTable, buildCallout } from '../utils/helpers'

export function buildDocumentationSection(data: EHOReportData): string {
  const { globalDocuments } = data

  const total = globalDocuments.length
  const expired = globalDocuments.filter(d => getDocStatus(d.expiry_date) === 'expired')
  const expiring = globalDocuments.filter(d => getDocStatus(d.expiry_date) === 'expiring')
  const valid = globalDocuments.filter(d => getDocStatus(d.expiry_date) === 'valid' || getDocStatus(d.expiry_date) === 'unknown')

  const stats = buildStatCards([
    { value: total, label: 'Total Documents' },
    { value: valid.length, label: 'Valid', colorClass: 'text-green' },
    { value: expiring.length, label: 'Expiring Soon', colorClass: expiring.length > 0 ? 'text-amber' : '' },
    { value: expired.length, label: 'Expired', colorClass: expired.length > 0 ? 'text-red' : 'text-green' },
  ])

  let alerts = ''
  if (expired.length > 0) {
    const names = expired.map(d => d.name).join(', ')
    alerts += buildCallout('danger', `${expired.length} Expired Document${expired.length > 1 ? 's' : ''}`, names)
  }
  if (expiring.length > 0) {
    const names = expiring.map(d => d.name).join(', ')
    alerts += buildCallout('warning', `${expiring.length} Document${expiring.length > 1 ? 's' : ''} Expiring Within 30 Days`, names)
  }

  const table = buildDataTable({
    headers: [
      { key: 'name', label: 'Document' },
      { key: 'category', label: 'Category' },
      { key: 'version', label: 'Version', align: 'center' },
      { key: 'uploaded_at', label: 'Uploaded', format: 'date' },
      { key: 'expiry_date', label: 'Expiry', format: 'date' },
      { key: 'doc_status', label: 'Status', format: 'badge', badgeMap: { valid: 'green', expiring: 'amber', expired: 'red', 'no expiry': 'gray' } },
      { key: 'notes', label: 'Notes' },
    ],
    rows: globalDocuments.map(d => ({
      ...d,
      doc_status: getDocStatus(d.expiry_date) === 'valid' ? 'Valid' :
                  getDocStatus(d.expiry_date) === 'expiring' ? 'Expiring' :
                  getDocStatus(d.expiry_date) === 'expired' ? 'Expired' : 'No Expiry',
    })),
    emptyMessage: 'No documents uploaded. Upload all policies, certificates, and compliance documents.',
  })

  return buildSection(13, 'Documentation & Policies Register', `
    ${stats}
    ${alerts}
    ${table}
  `)
}
