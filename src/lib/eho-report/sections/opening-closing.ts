import type { EHOReportData } from '../types'
import { buildSection, buildStatCards, buildDataTable, buildCallout } from '../utils/helpers'

export function buildOpeningClosingSection(data: EHOReportData): string {
  const { openingClosingChecklists } = data

  const opening = openingClosingChecklists.filter(r => r.daypart === 'before_open' || r.checklist_type?.toLowerCase().includes('opening'))
  const closing = openingClosingChecklists.filter(r => r.daypart === 'after_service' || r.checklist_type?.toLowerCase().includes('closing'))

  // Calculate unique dates
  const openingDates = new Set(opening.map(r => r.completed_at?.split('T')[0]))
  const closingDates = new Set(closing.map(r => r.completed_at?.split('T')[0]))

  // Days with both
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const daysWithBoth = [...openingDates].filter(d => closingDates.has(d)).length
  const gapDays = totalDays - daysWithBoth

  const stats = buildStatCards([
    { value: opening.length, label: 'Opening Checklists' },
    { value: closing.length, label: 'Closing Checklists' },
    { value: daysWithBoth, label: 'Days With Both' },
    { value: gapDays, label: 'Days With Gaps', colorClass: gapDays > 0 ? 'text-amber' : 'text-green' },
  ])

  let gapCallout = ''
  if (gapDays > 5) {
    gapCallout = buildCallout('warning', `${gapDays} Days Without Complete Checklists`, `Out of ${totalDays} days in the report period, ${gapDays} days are missing either an opening or closing checklist.`)
  }

  const table = buildDataTable({
    headers: [
      { key: 'checklist_type', label: 'Type' },
      { key: 'completed_at', label: 'Completed', format: 'datetime' },
      { key: 'completed_by_name', label: 'Completed By' },
      { key: 'daypart', label: 'Daypart', align: 'center' },
    ],
    rows: openingClosingChecklists,
    maxRows: 300,
    emptyMessage: 'No opening or closing checklists found for this period.',
  })

  return buildSection(8, 'Daily Opening & Closing Checklists', `
    ${stats}
    ${gapCallout}
    ${table}
  `)
}
