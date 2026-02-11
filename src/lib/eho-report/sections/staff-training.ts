import type { EHOReportData } from '../types'
import { escapeHtml, formatDate, getDocStatus } from '../utils/formatters'
import { buildSection, buildSubSection, buildDataTable, buildCallout, statusBadge } from '../utils/helpers'

export function buildStaffTrainingSection(data: EHOReportData): string {
  const { trainingRecords, staffProfiles } = data

  // Staff training matrix
  const now = new Date()
  const matrixRows = staffProfiles
    .filter(p => p.full_name)
    .map(p => {
      const fsStatus = getDocStatus(p.food_safety_expiry_date)
      const hsStatus = getDocStatus(p.h_and_s_expiry_date)
      const fmStatus = p.fire_marshal_trained ? getDocStatus(p.fire_marshal_expiry_date) : 'unknown'
      const faStatus = p.first_aid_trained ? getDocStatus(p.first_aid_expiry_date) : 'unknown'

      return {
        name: p.full_name,
        role: p.position_title || p.app_role || 'N/A',
        food_safety: p.food_safety_level
          ? `${statusBadge(fsStatus === 'valid' ? 'Valid' : fsStatus === 'expiring' ? 'Expiring' : fsStatus === 'expired' ? 'Expired' : p.food_safety_level)} L${p.food_safety_level}`
          : '<span class="muted">Not recorded</span>',
        food_safety_expiry: formatDate(p.food_safety_expiry_date),
        h_and_s: p.h_and_s_level
          ? statusBadge(hsStatus === 'valid' ? 'Valid' : hsStatus === 'expiring' ? 'Expiring' : hsStatus === 'expired' ? 'Expired' : 'Set')
          : '<span class="muted">Not recorded</span>',
        fire_marshal: p.fire_marshal_trained
          ? statusBadge(fmStatus === 'valid' ? 'Valid' : fmStatus === 'expiring' ? 'Expiring' : fmStatus === 'expired' ? 'Expired' : 'Trained')
          : '<span class="muted">No</span>',
        first_aid: p.first_aid_trained
          ? statusBadge(faStatus === 'valid' ? 'Valid' : faStatus === 'expiring' ? 'Expiring' : faStatus === 'expired' ? 'Expired' : 'Trained')
          : '<span class="muted">No</span>',
        coshh: p.cossh_trained
          ? statusBadge('Valid')
          : '<span class="muted">No</span>',
      }
    })

  // Check for expiring/expired certifications
  const expiredStaff = staffProfiles.filter(p => {
    const dates = [p.food_safety_expiry_date, p.h_and_s_expiry_date, p.fire_marshal_expiry_date, p.first_aid_expiry_date]
    return dates.some(d => d && new Date(d) < now)
  })

  let expiryCallout = ''
  if (expiredStaff.length > 0) {
    const names = expiredStaff.map(p => escapeHtml(p.full_name || 'Unknown')).join(', ')
    expiryCallout = buildCallout('danger', `${expiredStaff.length} Staff Member${expiredStaff.length > 1 ? 's' : ''} with Expired Certifications`, names)
  }

  // The matrix table uses raw HTML values so we need a custom approach
  let matrixHtml: string
  if (matrixRows.length === 0) {
    matrixHtml = '<div class="empty-state">No staff profiles found. Add staff members to the system to track training compliance.</div>'
  } else {
    const rows = matrixRows.map(r => `
      <tr>
        <td>${escapeHtml(r.name || '')}</td>
        <td>${escapeHtml(r.role)}</td>
        <td class="center">${r.food_safety}</td>
        <td class="center">${r.food_safety_expiry}</td>
        <td class="center">${r.h_and_s}</td>
        <td class="center">${r.fire_marshal}</td>
        <td class="center">${r.first_aid}</td>
        <td class="center">${r.coshh}</td>
      </tr>`).join('')

    matrixHtml = `
      <table>
        <thead><tr>
          <th>Name</th><th>Role</th><th class="center">Food Safety</th><th class="center">FS Expiry</th>
          <th class="center">H&amp;S</th><th class="center">Fire Marshal</th><th class="center">First Aid</th><th class="center">COSHH</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
  }

  // Training records for the period
  const recordsTable = buildDataTable({
    headers: [
      { key: 'staff_name', label: 'Staff Member' },
      { key: 'training_type', label: 'Training Type' },
      { key: 'completed_at', label: 'Completed', format: 'datetime' },
      { key: 'expiry_date', label: 'Expiry', format: 'date' },
      { key: 'certificate_number', label: 'Certificate No.' },
      { key: 'provider', label: 'Provider' },
    ],
    rows: trainingRecords,
    emptyMessage: 'No training records found for this period.',
  })

  return buildSection(6, 'Staff Training & Competency', `
    ${expiryCallout}
    ${buildSubSection('Staff Training Matrix', matrixHtml)}
    ${buildSubSection('Training Records (Period)', recordsTable)}
  `)
}
