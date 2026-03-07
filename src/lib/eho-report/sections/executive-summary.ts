import type { EHOReportData } from '../types'
import { rateColor } from '../utils/formatters'
import { buildSection, buildStatCards, buildDataTable, buildCallout } from '../utils/helpers'

export function buildExecutiveSummary(data: EHOReportData): string {
  const { complianceSummary, complianceScores } = data

  const totalTasks = complianceSummary.reduce((s, r) => s + (r.total_tasks || 0), 0)
  const totalCompleted = complianceSummary.reduce((s, r) => s + (r.completed_tasks || 0), 0)
  const totalMissed = complianceSummary.reduce((s, r) => s + (r.missed_tasks || 0), 0)
  const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0
  const totalFlagged = complianceSummary.reduce((s, r) => s + (r.flagged_completions || 0), 0)

  const stats = buildStatCards([
    { value: totalTasks, label: 'Total Tasks' },
    { value: totalCompleted, label: 'Completed', colorClass: 'text-green' },
    { value: totalMissed, label: 'Missed', colorClass: totalMissed > 0 ? 'text-red' : '' },
    { value: `${overallRate}%`, label: 'Overall Rate', colorClass: `text-${rateColor(overallRate)}` },
  ])

  const categoryTable = buildDataTable({
    headers: [
      { key: 'category', label: 'Category' },
      { key: 'total_tasks', label: 'Total', align: 'center' },
      { key: 'completed_tasks', label: 'Completed', align: 'center' },
      { key: 'missed_tasks', label: 'Missed', align: 'center' },
      { key: 'completion_rate', label: 'Rate', format: 'percent', align: 'center' },
      { key: 'flagged_completions', label: 'Flagged', align: 'center' },
    ],
    rows: complianceSummary,
    emptyMessage: 'No compliance summary data available.',
  })

  // Areas of concern
  const concerns = complianceSummary.filter(r => (r.completion_rate || 0) < 80)
  let concernsHtml = ''
  if (concerns.length > 0) {
    const items = concerns.map(c => `<strong>${c.category}</strong>: ${Math.round(c.completion_rate)}% completion rate (${c.missed_tasks} missed)`).join('<br/>')
    concernsHtml = buildCallout('warning', 'Areas Requiring Attention', items)
  }

  if (totalFlagged > 0) {
    concernsHtml += buildCallout('danger', `${totalFlagged} Flagged Completion${totalFlagged > 1 ? 's' : ''}`, 'Some task completions have been flagged for review. See individual sections for details.')
  }

  // Compliance score trend
  let scoreTrend = ''
  if (complianceScores.length > 0) {
    const avg = Math.round(complianceScores.reduce((s, r) => s + r.score, 0) / complianceScores.length)
    const latest = Math.round(complianceScores[0].score)
    const oldest = Math.round(complianceScores[complianceScores.length - 1].score)
    const trend = latest >= oldest ? 'improving' : 'declining'

    scoreTrend = buildStatCards([
      { value: `${latest}%`, label: 'Latest Score', colorClass: `text-${rateColor(latest)}` },
      { value: `${avg}%`, label: 'Period Average', colorClass: `text-${rateColor(avg)}` },
      { value: trend === 'improving' ? '↑' : '↓', label: `Trend: ${trend}`, colorClass: trend === 'improving' ? 'text-green' : 'text-red' },
    ], 3)
  }

  return buildSection(1, 'Executive Compliance Summary', `
    ${stats}
    ${scoreTrend}
    ${concernsHtml}
    ${categoryTable}
  `)
}
