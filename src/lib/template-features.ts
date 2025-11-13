/**
 * Template Feature Detection Utility
 * 
 * This utility automatically determines which UI features should be enabled
 * based on the template's database configuration. This ensures consistency
 * across all templates without manual configuration.
 * 
 * Usage:
 *   const features = getTemplateFeatures(template);
 */

import { TaskTemplate } from '@/types/checklist';

export interface TemplateFeatures {
  // Asset/Equipment selection
  assetSelection: boolean; // Show asset selection UI (only if repeatable_field_name is set)
  
  // Evidence collection
  checklist: boolean; // Standard checklist items (text_note evidence type)
  yesNoChecklist: boolean; // Yes/No checklist (yes_no_checklist evidence type)
  passFail: boolean; // Pass/Fail buttons (pass_fail evidence type)
  tempLogs: boolean; // Temperature logging (temperature evidence type)
  photoEvidence: boolean; // Photo upload (photo evidence type)
  
  // Contractors & monitoring
  monitorCallout: boolean; // Monitor/callout feature (auto-enabled for temp/pass_fail, or if triggers_contractor_on_failure is true)
  
  // Documentation
  requiresSOP: boolean; // SOP requirement
  requiresRiskAssessment: boolean; // Risk assessment requirement
  libraryDropdown: boolean; // Library item selection (not currently auto-detected, set manually)
  documentUpload: boolean; // Document upload (not currently auto-detected, set manually)
  raUpload: boolean; // Risk assessment upload (not currently auto-detected, set manually)
}

/**
 * Automatically determines which features should be enabled based on template configuration.
 * 
 * Rules:
 * 1. Asset Selection: Only if repeatable_field_name is set (and not null)
 * 2. Checklist: If text_note is in evidence_types (and not yes_no_checklist)
 * 3. Yes/No Checklist: If yes_no_checklist is in evidence_types
 * 4. Pass/Fail: If pass_fail is in evidence_types
 * 5. Temperature Logs: If temperature is in evidence_types
 * 6. Photo Evidence: If photo is in evidence_types
 * 7. Monitor/Callout: Auto-enabled if temperature OR pass_fail OR triggers_contractor_on_failure
 * 8. SOP/Risk: Based on requires_sop and requires_risk_assessment flags
 */
export function getTemplateFeatures(template: TaskTemplate | null | undefined): TemplateFeatures {
  if (!template) {
    return getDefaultFeatures();
  }

  const evidenceTypes = template.evidence_types || [];
  const hasTemperature = evidenceTypes.includes('temperature');
  const hasPassFail = evidenceTypes.includes('pass_fail');
  const hasTextNote = evidenceTypes.includes('text_note');
  const hasYesNoChecklist = evidenceTypes.includes('yes_no_checklist');
  
  // Monitor/Callout is enabled if:
  // - Template has temperature logging (needs monitoring)
  // - Template has pass/fail (can trigger callouts)
  // - Template explicitly triggers contractor on failure
  const shouldEnableMonitorCallout = hasTemperature || hasPassFail || template.triggers_contractor_on_failure || false;

  return {
    // Asset selection: Only show if repeatable_field_name is set AND asset_type is set (not null)
    // This allows repeatable_field_name to be used for text-based repeatable fields (like probe names)
    // without triggering asset selection UI
    assetSelection: !!(template.repeatable_field_name && template.asset_type),
    
    // Evidence collection features
    checklist: hasTextNote && !hasYesNoChecklist,
    yesNoChecklist: hasYesNoChecklist,
    passFail: hasPassFail,
    tempLogs: hasTemperature,
    photoEvidence: evidenceTypes.includes('photo'),
    
    // Contractors & monitoring
    monitorCallout: shouldEnableMonitorCallout,
    
    // Documentation (from template flags)
    requiresSOP: template.requires_sop || false,
    requiresRiskAssessment: template.requires_risk_assessment || false,
    
    // Document upload: Enabled if requires_sop or requires_risk_assessment is true
    documentUpload: (template.requires_sop || false) || (template.requires_risk_assessment || false),
    raUpload: template.requires_risk_assessment || false,
    
    // Library dropdown: Not currently auto-detected (set manually if needed)
    libraryDropdown: false,
  };
}

/**
 * Get default (empty) feature set
 */
function getDefaultFeatures(): TemplateFeatures {
  return {
    assetSelection: false,
    checklist: false,
    yesNoChecklist: false,
    passFail: false,
    tempLogs: false,
    photoEvidence: false,
    monitorCallout: false,
    requiresSOP: false,
    requiresRiskAssessment: false,
    libraryDropdown: false,
    documentUpload: false,
    raUpload: false,
  };
}

/**
 * Map evidence types array to features (reverse mapping for template creation)
 * Used when creating/editing templates to ensure evidence_types matches features
 */
export function featuresToEvidenceTypes(features: Partial<TemplateFeatures>): string[] {
  const evidenceTypes: string[] = [];
  
  if (features.tempLogs) {
    evidenceTypes.push('temperature');
  }
  if (features.photoEvidence) {
    evidenceTypes.push('photo');
  }
  if (features.passFail) {
    evidenceTypes.push('pass_fail');
  }
  if (features.yesNoChecklist) {
    evidenceTypes.push('yes_no_checklist');
  } else if (features.checklist) {
    // Checklist uses text_note, but only if yes_no_checklist is not enabled
    evidenceTypes.push('text_note');
  }
  
  return evidenceTypes;
}

