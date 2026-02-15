import { escapeHtml, formatDate, formatDateTime, rateColor } from './formatters'

export function buildSection(sectionNumber: number | string, title: string, content: string, pageBreak = false): string {
  return `
    <div class="report-section${pageBreak ? ' page-break' : ''}" id="section-${sectionNumber}">
      <div class="section-header">
        <div class="section-number">${escapeHtml(String(sectionNumber))}</div>
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="section-body">
        ${content}
      </div>
    </div>`
}

export function buildSubSection(title: string, content: string): string {
  return `
    <div class="sub-section">
      <h3>${escapeHtml(title)}</h3>
      ${content}
    </div>`
}

interface TableColumn {
  key: string
  label: string
  format?: 'date' | 'datetime' | 'badge' | 'percent'
  align?: 'left' | 'center' | 'right'
  badgeMap?: Record<string, string> // value -> badge color class
}

export function buildDataTable(options: {
  headers: TableColumn[]
  rows: any[]
  maxRows?: number
  emptyMessage?: string
}): string {
  const { headers, rows, maxRows = 500, emptyMessage = 'No records available for this period.' } = options

  if (!rows || rows.length === 0) {
    return `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`
  }

  const displayRows = rows.slice(0, maxRows)
  const truncated = rows.length > maxRows

  const thRow = headers
    .map(h => `<th class="${h.align === 'center' ? 'center' : h.align === 'right' ? 'right' : ''}">${escapeHtml(h.label)}</th>`)
    .join('')

  const bodyRows = displayRows
    .map(row => {
      const cells = headers
        .map(h => {
          const val = row[h.key]
          const align = h.align === 'center' ? ' class="center"' : h.align === 'right' ? ' class="right"' : ''

          if (h.format === 'date') return `<td${align}>${formatDate(val)}</td>`
          if (h.format === 'datetime') return `<td${align}>${formatDateTime(val)}</td>`
          if (h.format === 'percent') return `<td${align} class="text-${rateColor(val || 0)}">${val != null ? Math.round(val) + '%' : 'N/A'}</td>`
          if (h.format === 'badge') {
            const color = h.badgeMap?.[String(val)?.toLowerCase()] || 'gray'
            return `<td${align}><span class="badge badge-${color}">${escapeHtml(String(val ?? 'N/A'))}</span></td>`
          }
          return `<td${align}>${escapeHtml(String(val ?? 'N/A'))}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  let footer = ''
  if (truncated) {
    footer = `<p class="muted">${rows.length} records found — showing first ${maxRows}</p>`
  }

  return `
    <table>
      <thead><tr>${thRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${footer}`
}

export function buildStatCards(stats: { value: string | number; label: string; colorClass?: string }[], columns: 3 | 4 = 4): string {
  const cards = stats
    .map(s => `
      <div class="stat-card no-break">
        <div class="stat-value ${s.colorClass || ''}">${escapeHtml(String(s.value))}</div>
        <div class="stat-label">${escapeHtml(s.label)}</div>
      </div>`)
    .join('')
  return `<div class="stats-grid${columns === 3 ? ' stats-grid-3' : ''}">${cards}</div>`
}

export function buildCallout(type: 'danger' | 'warning' | 'info' | 'success', title: string, body: string): string {
  return `
    <div class="callout callout-${type} no-break">
      <div class="callout-title">${escapeHtml(title)}</div>
      <div class="callout-body">${body}</div>
    </div>`
}

export function buildEmptyState(message: string): string {
  return `<div class="empty-state">${escapeHtml(message)}</div>`
}

export function statusBadge(status: string | null | undefined, customMap?: Record<string, string>): string {
  const s = String(status ?? 'unknown').toLowerCase()
  const defaultMap: Record<string, string> = {
    valid: 'green', active: 'green', completed: 'green', done: 'green', ok: 'green', resolved: 'green', closed: 'green', pass: 'green',
    expired: 'red', overdue: 'red', failed: 'red', critical: 'red', major: 'red', breach: 'red', fail: 'red',
    expiring: 'amber', pending: 'amber', open: 'amber', investigating: 'amber', moderate: 'amber', warning: 'amber',
    minor: 'blue', near_miss: 'blue', 'near miss': 'blue', draft: 'blue',
  }
  const map = { ...defaultMap, ...customMap }
  const color = map[s] || 'gray'
  return `<span class="badge badge-${color}">${escapeHtml(status || 'Unknown')}</span>`
}
