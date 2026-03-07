/**
 * Fire Risk Assessment (Fire RA) Types
 * Used with the existing risk_assessments table (template_type = 'fire')
 * Assessment data stored in assessment_data JSONB column
 */

// ---------------------------------------------------------------------------
// Complexity Screening
// ---------------------------------------------------------------------------

export type PremisesType =
  | 'restaurant_cafe'
  | 'pub_bar'
  | 'hotel_bnb'
  | 'retail_shop'
  | 'warehouse'
  | 'food_manufacturing'
  | 'office'
  | 'other';

export type FloorCount = 'single' | 'two' | 'three_plus' | 'split_level';
export type FlammableMaterials = 'none' | 'small' | 'significant';
export type OccupancyRange = 'under_25' | '25_50' | '50_100' | '100_300' | '300_plus';
export type LastProfessionalAssessment = 'never' | 'within_12_months' | '1_3_years' | '3_plus_years' | 'dont_know';

export interface FireRAScreeningAnswers {
  premisesType: PremisesType;
  premisesTypeOther?: string;
  floorCount: FloorCount;
  sleepingOnPremises: boolean;
  flammableMaterials: FlammableMaterials;
  occupancy: OccupancyRange;
  disabilitiesOnSite: 'yes' | 'no' | 'unknown';
  lastProfessionalAssessment: LastProfessionalAssessment;
}

export type FireRAComplexityTier = 'standard' | 'enhanced' | 'specialist';

export interface FireRAScreeningResult {
  answers: FireRAScreeningAnswers;
  tier: FireRAComplexityTier;
  tierExplanation: string;
  enhancedReasons: string[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Risk Rating
// ---------------------------------------------------------------------------

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface FireRARiskRating {
  likelihood: number; // 1-5
  severity: number;   // 1-5
}

export interface RiskLevelInfo {
  level: RiskLevel;
  color: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Checklist (premises-type-specific checkbox options)
// ---------------------------------------------------------------------------

export interface ChecklistOption {
  id: string;
  label: string;
  checked: boolean;
  isCustom: boolean;
  aiSuggested: boolean;
}

export interface ChecklistFieldData {
  checklist: ChecklistOption[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Assessment Items & Sections
// ---------------------------------------------------------------------------

export type FireRAPriority = 'high' | 'medium' | 'low';

export interface FireRAItem {
  id: string;
  itemNumber: string;     // e.g. '2.1', '5.7'
  itemName: string;
  // Legacy string fields — always synced from checklists for backward compat
  finding: string;
  findingAiGenerated: boolean;
  existingControls: string;
  existingControlsAiGenerated: boolean;
  actionRequired: string;
  actionRequiredAiGenerated: boolean;
  // Structured checklist fields (undefined in old saved data)
  findingChecklist?: ChecklistFieldData;
  existingControlsChecklist?: ChecklistFieldData;
  actionRequiredChecklist?: ChecklistFieldData;
  // Risk & metadata
  likelihood: number;     // 1-5
  severity: number;       // 1-5
  priority: FireRAPriority | '';
  targetDate: string;     // ISO date string
  linkedTaskId: string | null;
  isEnhancedOnly: boolean;
  sortOrder: number;
}

export interface FireRASection {
  sectionNumber: number;
  sectionName: string;
  isApplicable: boolean;
  items: FireRAItem[];
  sectionNotes: string;
  completedAt: string | null; // ISO timestamp
}

// ---------------------------------------------------------------------------
// General Info (Section 1)
// ---------------------------------------------------------------------------

export interface FireRAGeneralInfo {
  premisesName: string;
  premisesAddress: string;
  premisesDescription: string;
  responsiblePersonName: string;
  responsiblePersonRole: string;
  assessorName: string;
  assessorQualifications: string;
  assessmentDate: string;
  reviewDate: string;
  previousAssessmentDate: string;
  previousAssessmentRef: string;
}

// ---------------------------------------------------------------------------
// Sign-off
// ---------------------------------------------------------------------------

export interface FireRASignOff {
  assessorName: string;
  assessorDate: string;
  responsiblePersonName: string;
  responsiblePersonDate: string;
}

// ---------------------------------------------------------------------------
// Full assessment_data JSONB shape
// ---------------------------------------------------------------------------

export interface FireRAAssessmentData {
  screening: FireRAScreeningResult;
  generalInfo: FireRAGeneralInfo;
  sections: FireRASection[];
  signOff: FireRASignOff;
  specialistAdvisoryAcknowledged: boolean;
}

// ---------------------------------------------------------------------------
// AI Assist
// ---------------------------------------------------------------------------

export type FireRAAIField = 'finding' | 'existing_controls' | 'action_required';
export type FireRAAIMode = 'generate' | 'improve' | 'suggest_actions';

export interface FireRAAIAssistRequest {
  sectionNumber: number;
  itemNumber: string;
  field: FireRAAIField;
  existingText: string;
  premisesContext: {
    premisesType: string;
    premisesAddress: string;
    tier: FireRAComplexityTier;
    floorCount: string;
    occupancy: string;
    sleepingOnPremises: boolean;
    flammableMaterials: string;
  };
  mode: FireRAAIMode;
  userInput?: string; // answer to clarifying question
}

export interface FireRAAIAssistResponse {
  suggestion: string;
  mode: FireRAAIMode;
  suggestedChecklist?: ChecklistOption[];
}

// ---------------------------------------------------------------------------
// Task Generation
// ---------------------------------------------------------------------------

export interface FireRATaskPreview {
  itemId: string;
  sectionNumber: number;
  sectionName: string;
  itemNumber: string;
  itemName: string;
  taskName: string;
  description: string;
  priority: FireRAPriority;
  dueDate: string;
  existingMatchId: string | null;
  existingMatchName: string | null;
  selected: boolean;
  linkToExisting: boolean;
}
