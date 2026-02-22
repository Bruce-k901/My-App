import type { EHOReportData } from '../types'
import { formatDate } from '../utils/formatters'
import { buildSection, buildSubSection, buildDataTable, buildStatCards, buildCallout } from '../utils/helpers'

export function buildEquipmentSection(data: EHOReportData): string {
  const { assets, patAppliances } = data

  const today = new Date()

  // Asset stats
  const overdue = assets.filter(a => a.next_service_date && new Date(a.next_service_date) < today)
  const activeAssets = assets.filter(a => a.status !== 'decommissioned')

  const stats = buildStatCards([
    { value: assets.length, label: 'Total Assets' },
    { value: activeAssets.length, label: 'Active' },
    { value: overdue.length, label: 'Service Overdue', colorClass: overdue.length > 0 ? 'text-red' : 'text-green' },
    { value: patAppliances.length, label: 'PAT Items' },
  ])

  let overdueCallout = ''
  if (overdue.length > 0) {
    const items = overdue.map(a => `<strong>${a.name}</strong> — due ${formatDate(a.next_service_date)}`).join('<br/>')
    overdueCallout = buildCallout('warning', `${overdue.length} Asset${overdue.length > 1 ? 's' : ''} Overdue for Service`, items)
  }

  const assetTable = buildDataTable({
    headers: [
      { key: 'name', label: 'Asset' },
      { key: 'category', label: 'Category' },
      { key: 'brand_model', label: 'Brand / Model' },
      { key: 'serial_number', label: 'Serial No.' },
      { key: 'status', label: 'Status', format: 'badge', badgeMap: { operational: 'green', active: 'green', needs_repair: 'amber', decommissioned: 'gray' } },
      { key: 'last_service_date', label: 'Last Service', format: 'date' },
      { key: 'next_service_date', label: 'Next Service', format: 'date' },
      { key: 'warranty_end', label: 'Warranty End', format: 'date' },
    ],
    rows: assets.map(a => ({
      ...a,
      brand_model: [a.brand, a.model].filter(Boolean).join(' ') || 'N/A',
    })),
    emptyMessage: 'No assets registered for this site.',
  })

  // PAT appliances
  const patWithLabel = patAppliances.filter(p => p.has_current_pat_label)
  const patWithout = patAppliances.filter(p => !p.has_current_pat_label)

  let patCallout = ''
  if (patWithout.length > 0) {
    const items = patWithout.map(p => p.name).join(', ')
    patCallout = buildCallout('warning', `${patWithout.length} Appliance${patWithout.length > 1 ? 's' : ''} Without Current PAT Label`, items)
  }

  const patTable = buildDataTable({
    headers: [
      { key: 'name', label: 'Appliance' },
      { key: 'brand', label: 'Brand' },
      { key: 'has_current_pat_label', label: 'PAT Label', format: 'badge', badgeMap: { true: 'green', false: 'red' } },
      { key: 'purchase_date', label: 'Purchase Date', format: 'date' },
    ],
    rows: patAppliances.map(p => ({
      ...p,
      has_current_pat_label: p.has_current_pat_label ? 'Yes' : 'No',
    })),
    emptyMessage: 'No PAT appliances registered.',
  })

  return buildSection(12, 'Equipment & Asset Register', `
    ${stats}
    ${overdueCallout}
    ${buildSubSection('Asset Register', assetTable)}
    ${patCallout}
    ${buildSubSection('PAT Testing Records', patTable)}
  `)
}
