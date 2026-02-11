import type { EHOReportData } from '../types'
import { escapeHtml, formatDate, rateColor } from '../utils/formatters'

const SECTION_TITLES = [
  'Executive Compliance Summary',
  'Food Safety Management System',
  'Temperature Monitoring',
  'Cleaning & Hygiene Records',
  'Pest Control',
  'Staff Training & Competency',
  'Incidents & Accidents',
  'Daily Opening & Closing Checklists',
  'Health & Safety Compliance',
  'Fire Safety',
  'COSHH & Chemical Safety',
  'Equipment & Asset Register',
  'Documentation & Policies Register',
  'Supplier & Additional Records',
]

export function buildCoverPage(data: EHOReportData): string {
  const { site, company } = data
  const addressParts = [site.address_line1, site.address_line2, site.city, site.postcode].filter(Boolean)
  const siteAddress = addressParts.join(', ')

  const now = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // Latest compliance score
  const latestScore = data.complianceScores.length > 0 ? data.complianceScores[0] : null
  const scoreValue = latestScore ? Math.round(latestScore.score) : null

  let scoreHtml = ''
  if (scoreValue != null) {
    scoreHtml = `
      <div class="cover-score">
        <div class="score-value text-${rateColor(scoreValue)}">${scoreValue}%</div>
        <div class="score-label">Compliance<br/>Score</div>
      </div>`
  }

  const tocItems = SECTION_TITLES
    .map((title, i) => `
      <li>
        <span class="toc-num">${i + 1}</span>
        <span class="toc-title">${escapeHtml(title)}</span>
      </li>`)
    .join('')

  return `
    <div class="cover-page">
      <div class="brand-bar"></div>
      <h1>EHO Compliance Pack</h1>
      <div class="subtitle">Environmental Health Officer Inspection Report</div>
      <div class="site-name">${escapeHtml(site.name)}</div>
      ${siteAddress ? `<div class="site-address">${escapeHtml(siteAddress)}</div>` : ''}
      ${company?.legal_name ? `<div class="muted">${escapeHtml(company.legal_name)}</div>` : ''}
      ${scoreHtml}
      <div class="cover-meta">
        <span><strong>Period:</strong> ${formatDate(data.startDate)} — ${formatDate(data.endDate)}</span>
        <span><strong>Generated:</strong> ${now}</span>
      </div>
    </div>

    <div class="toc page-break">
      <h2>Contents</h2>
      <ul class="toc-list">
        ${tocItems}
        <li>
          <span class="toc-num">A</span>
          <span class="toc-title">Evidence Photo Gallery</span>
        </li>
      </ul>
    </div>`
}
