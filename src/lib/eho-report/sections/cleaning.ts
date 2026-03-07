import type { EHOReportData } from '../types'
import { buildSection, buildStatCards, buildDataTable } from '../utils/helpers'

export function buildCleaningSection(data: EHOReportData): string {
  const { cleaningRecords } = data

  const total = cleaningRecords.length
  const byDaypart: Record<string, number> = {}
  cleaningRecords.forEach(r => {
    const dp = r.daypart || 'unspecified'
    byDaypart[dp] = (byDaypart[dp] || 0) + 1
  })

  const stats = buildStatCards([
    { value: total, label: 'Total Cleaning Tasks' },
    { value: byDaypart['before_open'] || 0, label: 'Before Open' },
    { value: byDaypart['during_service'] || byDaypart['mid_shift'] || 0, label: 'During Service' },
    { value: byDaypart['after_service'] || byDaypart['close'] || 0, label: 'After Close' },
  ])

  const table = buildDataTable({
    headers: [
      { key: 'template_name', label: 'Task' },
      { key: 'completed_at', label: 'Completed', format: 'datetime' },
      { key: 'completed_by_name', label: 'Completed By' },
      { key: 'daypart', label: 'Daypart', align: 'center' },
      { key: 'due_date', label: 'Due Date', format: 'date' },
    ],
    rows: cleaningRecords,
    maxRows: 300,
    emptyMessage: 'No cleaning records found for this period. Ensure cleaning schedules are configured and being completed.',
  })

  return buildSection(4, 'Cleaning & Hygiene Records', `
    ${stats}
    ${table}
  `)
}
