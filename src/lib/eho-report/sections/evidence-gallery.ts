import type { EHOReportData } from '../types'
import { escapeHtml, formatDate } from '../utils/formatters'
import { buildSection, buildEmptyState } from '../utils/helpers'

interface EvidenceItem {
  url: string
  taskName: string
  completedAt: string
  completedBy: string
}

export function buildEvidenceGallery(data: EHOReportData): string {
  const { taskCompletions } = data

  // Collect all evidence attachments from task completions
  const allEvidence: EvidenceItem[] = []

  for (const task of taskCompletions) {
    if (task.evidence_attachments && task.evidence_attachments.length > 0) {
      for (const url of task.evidence_attachments) {
        allEvidence.push({
          url,
          taskName: task.template_name,
          completedAt: task.completed_at,
          completedBy: task.completed_by_name,
        })
      }
    }
  }

  if (allEvidence.length === 0) {
    return buildSection('A', 'Evidence Photo Gallery', buildEmptyState('No evidence photos attached to task completions during this period.'))
  }

  // Limit to 60 photos to keep the report manageable
  const display = allEvidence.slice(0, 60)
  const truncated = allEvidence.length > 60

  const grid = display.map(e => `
    <div class="evidence-item no-break">
      <img class="evidence-thumb" src="${escapeHtml(e.url)}" alt="${escapeHtml(e.taskName)}" loading="lazy" />
      <div class="evidence-caption">${escapeHtml(e.taskName)}</div>
      <div class="evidence-caption">${formatDate(e.completedAt)} — ${escapeHtml(e.completedBy)}</div>
    </div>`
  ).join('')

  const countNote = truncated
    ? `<p class="muted">${allEvidence.length} evidence photos found — showing first 60</p>`
    : `<p class="muted">${allEvidence.length} evidence photo${allEvidence.length > 1 ? 's' : ''}</p>`

  return buildSection('A', 'Evidence Photo Gallery', `
    ${countNote}
    <div class="evidence-grid">${grid}</div>
  `)
}
