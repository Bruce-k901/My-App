import type { EHOReportData } from '../types'
import { buildSection, buildSubSection, buildEmptyState } from '../utils/helpers'

export function buildAdditionalSection(data: EHOReportData): string {
  // These are placeholder sections for future modules

  const supplierSection = buildSubSection(
    'Supplier Due Diligence & Delivery Records',
    buildEmptyState('Supplier delivery tracking is not yet active. When configured, delivery records with temperature checks and condition assessments will appear here.')
  )

  const healthDecSection = buildSubSection(
    'Staff Health Declarations',
    buildEmptyState('Staff health declaration tracking is not yet active. When configured, fitness-for-work declarations will appear here.')
  )

  const allergenSection = buildSubSection(
    'Allergen Management',
    buildEmptyState('Allergen management module is not yet active. When configured, allergen declarations and procedures will appear here.')
  )

  return buildSection(14, 'Supplier & Additional Records', `
    ${supplierSection}
    ${healthDecSection}
    ${allergenSection}
  `)
}
