/**
 * Fire Risk Assessment — Utility Functions
 */

import type {
  FireRAScreeningAnswers,
  FireRAComplexityTier,
  FireRAScreeningResult,
  FireRAItem,
  FireRASection,
  FireRAAssessmentData,
  FireRAGeneralInfo,
  FireRASignOff,
  RiskLevel,
  ChecklistFieldData,
} from '@/types/fire-ra';
import { FIRE_RA_SECTIONS, SECTION_ITEMS, getRiskLevel } from './constants';

// ---------------------------------------------------------------------------
// Complexity Tier Calculation (Brief section 2.2)
// ---------------------------------------------------------------------------

export function calculateComplexityTier(answers: FireRAScreeningAnswers): {
  tier: FireRAComplexityTier;
  tierExplanation: string;
  enhancedReasons: string[];
} {
  const reasons: string[] = [];

  // SPECIALIST triggers (any one)
  const isSpecialist =
    answers.occupancy === '300_plus' ||
    (answers.floorCount === 'three_plus' && answers.sleepingOnPremises) ||
    (answers.flammableMaterials === 'significant' && answers.floorCount !== 'single');

  if (isSpecialist) {
    if (answers.occupancy === '300_plus') reasons.push('Occupancy exceeds 300 people');
    if (answers.floorCount === 'three_plus' && answers.sleepingOnPremises) reasons.push('3+ floors with sleeping accommodation');
    if (answers.flammableMaterials === 'significant' && answers.floorCount !== 'single') reasons.push('Significant flammable materials in a multi-floor building');

    return {
      tier: 'specialist',
      tierExplanation: 'Professional fire risk assessment is recommended for your premises.',
      enhancedReasons: reasons,
    };
  }

  // ENHANCED triggers (any one)
  const isMultiFloor = answers.floorCount === 'two' || answers.floorCount === 'three_plus' || answers.floorCount === 'split_level';
  const isMediumOccupancy = answers.occupancy === '50_100' || answers.occupancy === '100_300';
  const hasSleeping = answers.sleepingOnPremises;
  const hasDisabilities = answers.disabilitiesOnSite === 'yes';
  const hasSignificantFlammable = answers.flammableMaterials === 'significant';

  if (isMultiFloor) reasons.push('Multi-floor premises');
  if (isMediumOccupancy) reasons.push('Occupancy between 50 and 300');
  if (hasSleeping) reasons.push('Sleeping accommodation');
  if (hasDisabilities) reasons.push('People with disabilities regularly on site');
  if (hasSignificantFlammable) reasons.push('Significant flammable/explosive materials');

  if (reasons.length > 0) {
    return {
      tier: 'enhanced',
      tierExplanation: 'Your premises requires additional assessment sections for vertical escape, sleeping risk, DSEAR considerations and/or PEEPs.',
      enhancedReasons: reasons,
    };
  }

  // STANDARD
  return {
    tier: 'standard',
    tierExplanation: 'Standard fire risk assessment with all core sections.',
    enhancedReasons: [],
  };
}

// ---------------------------------------------------------------------------
// Section / Item Filtering
// ---------------------------------------------------------------------------

export function getApplicableSections(tier: FireRAComplexityTier): number[] {
  return FIRE_RA_SECTIONS
    .filter(s => !s.enhancedOnly || tier === 'enhanced' || tier === 'specialist')
    .map(s => s.number);
}

export function getApplicableItems(sectionNumber: number, tier: FireRAComplexityTier): typeof SECTION_ITEMS[number] {
  const items = SECTION_ITEMS[sectionNumber] || [];
  if (tier === 'enhanced' || tier === 'specialist') return items;
  return items.filter(item => !item.isEnhancedOnly);
}

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

export function createEmptyItem(itemNumber: string, itemName: string, isEnhancedOnly: boolean, sortOrder: number): FireRAItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    itemNumber,
    itemName,
    finding: '',
    findingAiGenerated: false,
    existingControls: '',
    existingControlsAiGenerated: false,
    likelihood: 0,
    severity: 0,
    actionRequired: '',
    actionRequiredAiGenerated: false,
    priority: '',
    targetDate: '',
    linkedTaskId: null,
    isEnhancedOnly,
    sortOrder,
  };
}

export function createEmptySection(sectionNumber: number, tier: FireRAComplexityTier): FireRASection {
  const def = FIRE_RA_SECTIONS.find(s => s.number === sectionNumber);
  const applicableItems = getApplicableItems(sectionNumber, tier);

  return {
    sectionNumber,
    sectionName: def?.name || `Section ${sectionNumber}`,
    isApplicable: !def?.enhancedOnly || tier === 'enhanced' || tier === 'specialist',
    items: applicableItems.map((item, idx) =>
      createEmptyItem(item.itemNumber, item.itemName, item.isEnhancedOnly, idx)
    ),
    sectionNotes: '',
    completedAt: null,
  };
}

export function createEmptyGeneralInfo(): FireRAGeneralInfo {
  return {
    premisesName: '',
    premisesAddress: '',
    premisesDescription: '',
    responsiblePersonName: '',
    responsiblePersonRole: '',
    assessorName: '',
    assessorQualifications: '',
    assessmentDate: '',
    reviewDate: '',
    previousAssessmentDate: '',
    previousAssessmentRef: '',
  };
}

export function createEmptySignOff(): FireRASignOff {
  return {
    assessorName: '',
    assessorDate: '',
    responsiblePersonName: '',
    responsiblePersonDate: '',
  };
}

export function createEmptyAssessmentData(
  screeningResult: FireRAScreeningResult
): FireRAAssessmentData {
  const tier = screeningResult.tier;
  const applicableSections = getApplicableSections(tier);

  return {
    screening: screeningResult,
    generalInfo: createEmptyGeneralInfo(),
    sections: FIRE_RA_SECTIONS.map(s =>
      createEmptySection(s.number, tier)
    ).map(s => ({
      ...s,
      isApplicable: applicableSections.includes(s.sectionNumber),
    })),
    signOff: createEmptySignOff(),
    specialistAdvisoryAcknowledged: false,
  };
}

// ---------------------------------------------------------------------------
// Risk Computation
// ---------------------------------------------------------------------------

export function computeItemRiskScore(item: FireRAItem): number {
  if (item.likelihood <= 0 || item.severity <= 0) return 0;
  return item.likelihood * item.severity;
}

export function computeItemRiskLevel(item: FireRAItem): RiskLevel | null {
  const score = computeItemRiskScore(item);
  if (score === 0) return null;
  return getRiskLevel(score).level;
}

export function computeSectionRisk(items: FireRAItem[]): RiskLevel | null {
  const scores = items
    .map(computeItemRiskScore)
    .filter(s => s > 0);
  if (scores.length === 0) return null;
  const highest = Math.max(...scores);
  return getRiskLevel(highest).level;
}

export function computeOverallRisk(sections: FireRASection[]): { level: RiskLevel | null; score: number } {
  const allItems = sections
    .filter(s => s.isApplicable)
    .flatMap(s => s.items);
  const scores = allItems
    .map(computeItemRiskScore)
    .filter(s => s > 0);
  if (scores.length === 0) return { level: null, score: 0 };
  const highest = Math.max(...scores);
  return { level: getRiskLevel(highest).level, score: highest };
}

// ---------------------------------------------------------------------------
// Completion Tracking
// ---------------------------------------------------------------------------

export function computeSectionCompletion(section: FireRASection): { total: number; completed: number; percent: number } {
  if (!section.isApplicable || section.items.length === 0) {
    return { total: 0, completed: 0, percent: 100 };
  }
  const total = section.items.length;
  const completed = section.items.filter(item =>
    item.finding.trim() !== '' && item.likelihood > 0 && item.severity > 0
  ).length;
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export function computeOverallCompletion(sections: FireRASection[]): { total: number; completed: number; percent: number } {
  const applicable = sections.filter(s => s.isApplicable && s.items.length > 0);
  const total = applicable.reduce((sum, s) => sum + s.items.length, 0);
  const completed = applicable.reduce((sum, s) =>
    sum + s.items.filter(item => item.finding.trim() !== '' && item.likelihood > 0 && item.severity > 0).length, 0
  );
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

// ---------------------------------------------------------------------------
// Ref Code Generation
// ---------------------------------------------------------------------------

export function generateFireRARefCode(title: string): string {
  const nameBit = title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'FIRE';
  return `RA-FIRE-${nameBit}-001`;
}

// ---------------------------------------------------------------------------
// Action Items Extraction
// ---------------------------------------------------------------------------

export function extractActionItems(assessmentData: FireRAAssessmentData): Array<FireRAItem & { sectionNumber: number; sectionName: string }> {
  return assessmentData.sections
    .filter(s => s.isApplicable)
    .flatMap(section =>
      section.items
        .filter(item => item.actionRequired.trim() !== '')
        .map(item => ({
          ...item,
          sectionNumber: section.sectionNumber,
          sectionName: section.sectionName,
        }))
    );
}

// ---------------------------------------------------------------------------
// Highest Risk Level string (for risk_assessments.highest_risk_level column)
// ---------------------------------------------------------------------------

export function computeHighestRiskLevel(assessmentData: FireRAAssessmentData): string {
  const { level } = computeOverallRisk(assessmentData.sections);
  return level || 'Low';
}

export function computeTotalHazards(assessmentData: FireRAAssessmentData): number {
  return assessmentData.sections
    .filter(s => s.isApplicable)
    .reduce((sum, s) => sum + s.items.filter(i => computeItemRiskScore(i) > 0).length, 0);
}

export function computeHazardsControlled(assessmentData: FireRAAssessmentData): number {
  return assessmentData.sections
    .filter(s => s.isApplicable)
    .reduce((sum, s) => sum + s.items.filter(i =>
      computeItemRiskScore(i) > 0 && i.actionRequired.trim() !== '' && i.linkedTaskId !== null
    ).length, 0);
}

// ---------------------------------------------------------------------------
// Checklist Helpers
// ---------------------------------------------------------------------------

/**
 * Flatten a ChecklistFieldData into a plain text string.
 * Checked items become `- {label}` lines; notes appended at end.
 */
export function flattenChecklist(data: ChecklistFieldData): string {
  const checked = data.checklist.filter(o => o.checked).map(o => `- ${o.label}`);
  const lines = [...checked];
  if (data.notes.trim()) lines.push(data.notes.trim());
  return lines.join('\n');
}
