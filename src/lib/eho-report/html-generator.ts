import type { EHOReportData } from './types'
import { escapeHtml } from './utils/formatters'
import { REPORT_CSS } from './utils/css'
import { buildCoverPage } from './sections/cover-page'
import { buildExecutiveSummary } from './sections/executive-summary'
import { buildFoodSafetySection } from './sections/food-safety'
import { buildTemperatureSection } from './sections/temperature'
import { buildCleaningSection } from './sections/cleaning'
import { buildPestControlSection } from './sections/pest-control'
import { buildStaffTrainingSection } from './sections/staff-training'
import { buildIncidentsSection } from './sections/incidents'
import { buildOpeningClosingSection } from './sections/opening-closing'
import { buildHealthSafetySection } from './sections/health-safety'
import { buildFireSafetySection } from './sections/fire-safety'
import { buildCoshhSection } from './sections/coshh'
import { buildEquipmentSection } from './sections/equipment'
import { buildDocumentationSection } from './sections/documentation'
import { buildAdditionalSection } from './sections/additional'
import { buildEvidenceGallery } from './sections/evidence-gallery'

function safeSection(name: string, builder: () => string): string {
  try {
    return builder()
  } catch (err) {
    console.error(`[EHO Report] Error building section "${name}":`, err)
    return `<div class="report-section page-break"><div class="section-header"><h2>${name}</h2></div><div class="callout callout-danger"><div class="callout-title">Section Error</div><div class="callout-body">This section could not be generated. Please check the server logs.</div></div></div>`
  }
}

export function generateFullReportHtml(data: EHOReportData): string {
  const siteName = data.site.name || 'EHO Report'

  // Group sections with strategic page breaks to reduce total page count
  const sections = [
    safeSection('Cover Page', () => buildCoverPage(data)),
    safeSection('Executive Summary', () => buildExecutiveSummary(data)),
    // Food safety & monitoring group
    '<div class="page-break"></div>',
    safeSection('Food Safety', () => buildFoodSafetySection(data)),
    safeSection('Temperature Monitoring', () => buildTemperatureSection(data)),
    safeSection('Cleaning & Hygiene', () => buildCleaningSection(data)),
    safeSection('Pest Control', () => buildPestControlSection(data)),
    // People & compliance group
    '<div class="page-break"></div>',
    safeSection('Staff Training', () => buildStaffTrainingSection(data)),
    safeSection('Incidents', () => buildIncidentsSection(data)),
    safeSection('Opening & Closing', () => buildOpeningClosingSection(data)),
    // H&S group
    '<div class="page-break"></div>',
    safeSection('Health & Safety', () => buildHealthSafetySection(data)),
    safeSection('Fire Safety', () => buildFireSafetySection(data)),
    safeSection('COSHH', () => buildCoshhSection(data)),
    // Assets & documentation group
    '<div class="page-break"></div>',
    safeSection('Equipment', () => buildEquipmentSection(data)),
    safeSection('Documentation', () => buildDocumentationSection(data)),
    safeSection('Additional Records', () => buildAdditionalSection(data)),
    // Evidence
    '<div class="page-break"></div>',
    safeSection('Evidence Gallery', () => buildEvidenceGallery(data)),
  ].join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EHO Compliance Pack - ${escapeHtml(siteName)}</title>
  <style>${REPORT_CSS}</style>
</head>
<body>
  <div class="container">
    ${sections}

    <div class="report-footer">
      This report was generated automatically by Opsly. Data reflects compliance records for the specified date range.
      All information should be verified against original records where applicable.
    </div>
  </div>
</body>
</html>`
}
