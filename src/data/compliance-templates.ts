/**
 * Compliance Templates - Single Source of Truth
 * This file contains all template definitions for the checklist system.
 * 
 * Templates automatically roll out as global templates (company_id = NULL)
 * when users visit the Compliance Templates page. They appear in the
 * template library and can be used to create task instances.
 * 
 * Batch 1: Measurement + Escalate Templates (7 total)
 * 
 * ✅ FULLY FUNCTIONAL (with UI components):
 * - SFBB Temperature Checks (measurement) - TemperatureCheckTemplate component
 * - Hot Holding Temperatures (measurement_escalate) - HotHoldingTemplate component
 * 
 * 📋 TEMPLATE DEFINITIONS (ready for rollout):
 * - Fire Alarm Testing (measurement_escalate)
 * - Emergency Lighting Test (measurement_escalate)
 * - PAT Testing (measurement_escalate)
 * - Temperature Probe Calibration (measurement_escalate)
 * - Extraction System Service (measurement_escalate)
 * 
 * All templates are configured with:
 * - Correct workflow types
 * - Escalation rules
 * - Form configurations
 * - Asset type mappings
 * - Contractor integration
 * - Compliance standards
 */

import { TaskTemplate } from '@/types/checklist'

export type WorkflowType = 
  | 'measurement'
  | 'measurement_escalate'
  | 'inspection'
  | 'checklist_verify'
  | 'document_track'
  | 'simple_confirm'

export interface ComplianceTemplate extends TaskTemplate {
  // Template-specific metadata
  workflowType: WorkflowType
  
  // Workflow configuration
  workflowConfig: {
    escalationRules?: {
      outOfRangeAction: 'monitor' | 'callout'
      monitoringDuration?: number // minutes
      thresholds?: {
        warning?: number
        critical?: number
      }
    }
    verificationRules?: {
      requiresPhoto?: boolean
      requiresSignature?: boolean
    }
    trackingRules?: {
      expiryWarningDays?: number
      autoArchiveAfterExpiry?: boolean
    }
    formConfig?: {
      type: 'temperature_grid' | 'pass_fail_grid' | 'calibration_check' | 'service_verification'
      assets: string
      validation?: {
        min?: number
        max?: number
        critical?: number
        pass?: string
        fail?: string
        boilingPoint?: number
        icePoint?: number
        tolerance?: number
      }
    }
  }
}

/**
 * SFBB Temperature Checks Template
 * Daily temperature monitoring for refrigeration equipment
 */
export const SFBB_TEMPERATURE_CHECKS_TEMPLATE: ComplianceTemplate = {
  id: 'sfbb-temperature-checks', // This will be replaced with actual UUID when saved
  company_id: null, // Will be set per company
  name: 'SFBB Temperature Checks',
  slug: 'sfbb-temperature-checks',
  description: 'Daily temperature monitoring for refrigerators, freezers, and hot holding units to ensure food safety compliance',
  category: 'food_safety',
  audit_category: 'food_safety',
  frequency: 'daily',
  recurrence_pattern: null,
  time_of_day: 'before_open',
  dayparts: ['morning', 'afternoon', 'evening'],
  assigned_to_role: 'kitchen_manager',
  assigned_to_user_id: null,
  site_id: null,
  asset_id: null,
  asset_type: null,
  instructions: 'Record temperature readings for all refrigeration and hot holding equipment. If temperature is out of range, escalate according to workflow.',
  repeatable_field_name: 'fridge_name',
  evidence_types: ['temperature', 'photo', 'pass_fail'],
  requires_sop: false,
  requires_risk_assessment: false,
  linked_sop_id: null,
  linked_risk_id: null,
  compliance_standard: 'Food Safety Act / HACCP',
  is_critical: false,
  triggers_contractor_on_failure: true,
  contractor_type: 'equipment_repair',
  is_active: true,
  is_template_library: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  
  // Template-specific fields
  workflowType: 'measurement',
  workflowConfig: {
    escalationRules: {
      outOfRangeAction: 'monitor', // Can be 'monitor' or 'callout'
      monitoringDuration: 30, // minutes
      thresholds: {
        warning: 5, // °C above max or below min triggers warning
        critical: 8 // °C above max or below min triggers critical/callout
      }
    }
  }
}

/**
 * Template fields for SFBB Temperature Checks
 */
export const SFBB_TEMPERATURE_FIELDS = [
  {
    field_name: 'fridge_name',
    field_type: 'select' as const,
    label: 'Fridge Name',
    required: true,
    field_order: 1,
    help_text: 'Select the unit being checked',
    options: null, // Will be populated dynamically from assets
    min_value: null,
    max_value: null,
    warn_threshold: null,
    fail_threshold: null
  },
  {
    field_name: 'temperature',
    field_type: 'number' as const,
    label: 'Temperature (°C)',
    required: true,
    field_order: 2,
    help_text: 'Record the temperature reading',
    options: null,
    min_value: -20,
    max_value: 50,
    warn_threshold: null,
    fail_threshold: null
  },
  {
    field_name: 'status',
    field_type: 'pass_fail' as const,
    label: 'Status',
    required: true,
    field_order: 3,
    help_text: 'Pass if temperature is within acceptable range',
    options: null,
    min_value: null,
    max_value: null,
    warn_threshold: null,
    fail_threshold: null
  },
  {
    field_name: 'initials',
    field_type: 'text' as const,
    label: 'Initials',
    required: true,
    field_order: 4,
    help_text: 'Enter your initials',
    options: null,
    min_value: null,
    max_value: null,
    warn_threshold: null,
    fail_threshold: null
  },
  {
    field_name: 'photo',
    field_type: 'photo' as const,
    label: 'Photo Evidence',
    required: false,
    field_order: 5,
    help_text: 'Optional photo of the temperature reading',
    options: null,
    min_value: null,
    max_value: null,
    warn_threshold: null,
    fail_threshold: null
  }
]

/**
 * Hot Holding Temperatures Template
 * Daily temperature monitoring for hot holding equipment
 */
export const HOT_HOLDING_TEMPS_TEMPLATE: ComplianceTemplate = {
  id: 'hot_holding_temps',
  company_id: null,
  name: 'Verify hot holding above 63°C',
  slug: 'hot-holding-temps',
  description: 'Record during service to ensure compliance',
  category: 'food_safety',
  audit_category: 'food_safety',
  frequency: 'daily',
  recurrence_pattern: null,
  time_of_day: 'during_service',
  dayparts: ['during_service'],
  assigned_to_role: 'kitchen_manager',
  assigned_to_user_id: null,
  site_id: null,
  asset_id: null,
  asset_type: 'hot_holding_equipment',
  instructions: 'Record hot holding temperatures during service. Minimum temperature is 63°C. If below 63°C, escalate according to workflow.',
  repeatable_field_name: 'hot_holding_unit',
  evidence_types: ['temperature'],
  requires_sop: false,
  requires_risk_assessment: false,
  linked_sop_id: null,
  linked_risk_id: null,
  compliance_standard: 'Food Safety Act / HACCP',
  is_critical: true,
  triggers_contractor_on_failure: true,
  contractor_type: 'equipment_repair',
  is_active: true,
  is_template_library: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workflowType: 'measurement_escalate',
  workflowConfig: {
    escalationRules: {
      outOfRangeAction: 'monitor',
      monitoringDuration: 30,
      thresholds: {
        warning: 65,
        critical: 60
      }
    },
    formConfig: {
      type: 'temperature_grid',
      assets: 'hot_holding_equipment',
      validation: {
        min: 63,
        max: 85,
        critical: 60
      }
    }
  }
}

/**
 * Fire Alarm Testing Template
 * Weekly fire alarm and emergency system testing
 */
export const FIRE_ALARM_TEST_TEMPLATE: ComplianceTemplate = {
  id: 'fire_alarm_test',
  company_id: null,
  name: 'Test fire alarms and emergency lighting',
  slug: 'fire-alarm-test',
  description: 'Weekly testing of fire alarms and emergency lighting systems',
  category: 'h_and_s',
  audit_category: 'fire_safety',
  frequency: 'weekly',
  recurrence_pattern: null,
  time_of_day: 'before_open',
  dayparts: ['before_open'],
  assigned_to_role: 'manager',
  assigned_to_user_id: null,
  site_id: null,
  asset_id: null,
  asset_type: 'fire_alarms',
  instructions: 'Test all fire alarms and emergency lighting. Verify operational status and escalate any faults immediately.',
  repeatable_field_name: 'fire_alarm_location',
  evidence_types: ['pass_fail'],
  requires_sop: false,
  requires_risk_assessment: false,
  linked_sop_id: null,
  linked_risk_id: null,
  compliance_standard: 'Fire Safety Order 2005',
  is_critical: true,
  triggers_contractor_on_failure: true,
  contractor_type: 'fire_engineer',
  is_active: true,
  is_template_library: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workflowType: 'measurement_escalate',
  workflowConfig: {
    escalationRules: {
      outOfRangeAction: 'callout',
      monitoringDuration: 0,
      thresholds: {
        warning: null,
        critical: null
      }
    },
    formConfig: {
      type: 'pass_fail_grid',
      assets: 'fire_alarms',
      validation: {
        pass: 'operational',
        fail: 'faulty'
      }
    }
  }
}

/**
 * Emergency Lighting Test Template
 * Weekly emergency lighting system testing
 */
export const EMERGENCY_LIGHTING_TEST_TEMPLATE: ComplianceTemplate = {
  id: 'emergency_lighting_test',
  company_id: null,
  name: 'Test emergency lighting',
  slug: 'emergency-lighting-test',
  description: 'Weekly testing of emergency lighting systems',
  category: 'h_and_s',
  audit_category: 'fire_safety',
  frequency: 'weekly',
  recurrence_pattern: null,
  time_of_day: 'before_open',
  dayparts: ['before_open'],
  assigned_to_role: 'manager',
  assigned_to_user_id: null,
  site_id: null,
  asset_id: null,
  asset_type: 'emergency_lights',
  instructions: 'Test all emergency lighting units. Verify they activate and provide adequate illumination. Escalate any failures immediately.',
  repeatable_field_name: 'emergency_light_location',
  evidence_types: ['pass_fail'],
  requires_sop: false,
  requires_risk_assessment: false,
  linked_sop_id: null,
  linked_risk_id: null,
  compliance_standard: 'Fire Safety Order 2005',
  is_critical: true,
  triggers_contractor_on_failure: true,
  contractor_type: 'fire_engineer',
  is_active: true,
  is_template_library: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workflowType: 'measurement_escalate',
  workflowConfig: {
    escalationRules: {
      outOfRangeAction: 'callout',
      monitoringDuration: 0,
      thresholds: {
        warning: null,
        critical: null
      }
    },
    formConfig: {
      type: 'pass_fail_grid',
      assets: 'emergency_lights'
    }
  }
}

/**
 * PAT Testing Template
 * Annual Portable Appliance Testing
 */
export const PAT_TESTING_TEMPLATE: ComplianceTemplate = {
  id: 'pat_testing',
  company_id: null,
  name: 'PAT test electrical equipment',
  slug: 'pat-testing',
  description: 'Annual Portable Appliance Testing of electrical equipment',
  category: 'h_and_s',
  audit_category: 'health_and_safety',
  frequency: 'annually', // 'annual' maps to 'annually' in database
  recurrence_pattern: null,
  time_of_day: 'anytime',
  dayparts: ['before_open'],
  assigned_to_role: 'manager',
  assigned_to_user_id: null,
  site_id: null,
  asset_id: null,
  asset_type: 'portable_appliances',
  instructions: 'Conduct PAT testing on all portable electrical appliances. Record test results and certificate numbers. Escalate any failed equipment.',
  repeatable_field_name: 'appliance_name',
  evidence_types: ['pass_fail', 'document'],
  requires_sop: false,
  requires_risk_assessment: false,
  linked_sop_id: null,
  linked_risk_id: null,
  compliance_standard: 'Electricity at Work Regulations 1989',
  is_critical: true,
  triggers_contractor_on_failure: true,
  contractor_type: 'electrical_contractor',
  is_active: true,
  is_template_library: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workflowType: 'measurement_escalate',
  workflowConfig: {
    escalationRules: {
      outOfRangeAction: 'callout',
      monitoringDuration: 0,
      thresholds: {
        warning: null,
        critical: null
      }
    },
    formConfig: {
      type: 'pass_fail_grid',
      assets: 'portable_appliances'
    }
  }
}

/**
 * Temperature Probe Calibration Template
 * Monthly calibration of temperature probes
 */
export const PROBE_CALIBRATION_TEMPLATE: ComplianceTemplate = {
  id: 'probe_calibration',
  company_id: null,
  name: 'Calibrate temperature probes',
  slug: 'probe-calibration',
  description: 'Monthly calibration verification of temperature probes using boiling and ice water method',
  category: 'food_safety',
  audit_category: 'food_safety',
  frequency: 'monthly',
  recurrence_pattern: null,
  time_of_day: 'before_open',
  dayparts: ['before_open'],
  assigned_to_role: 'kitchen_manager',
  assigned_to_user_id: null,
  site_id: null,
  asset_id: null,
  asset_type: 'temperature_probes',
  instructions: 'Calibrate probes using boiling water (100°C) and ice water (0°C) method. Tolerance is ±1°C. Record results and escalate out-of-tolerance probes.',
  repeatable_field_name: 'probe_name',
  evidence_types: ['temperature', 'pass_fail'],
  requires_sop: false,
  requires_risk_assessment: false,
  linked_sop_id: null,
  linked_risk_id: null,
  compliance_standard: 'Food Safety Act / HACCP',
  is_critical: false,
  triggers_contractor_on_failure: false,
  contractor_type: null,
  is_active: true,
  is_template_library: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workflowType: 'measurement_escalate',
  workflowConfig: {
    escalationRules: {
      outOfRangeAction: 'monitor',
      monitoringDuration: 60,
      thresholds: {
        warning: 1.5,
        critical: 2
      }
    },
    formConfig: {
      type: 'calibration_check',
      assets: 'temperature_probes',
      validation: {
        boilingPoint: 100,
        icePoint: 0,
        tolerance: 1
      }
    }
  }
}

/**
 * Extraction System Service Template
 * Biannual service of extraction and ventilation systems
 */
export const EXTRACTION_SERVICE_TEMPLATE: ComplianceTemplate = {
  id: 'extraction_service',
  company_id: null,
  name: 'Service extraction and ventilation systems',
  slug: 'extraction-service',
  description: 'Biannual service and verification of extraction and ventilation systems',
  category: 'h_and_s',
  audit_category: 'health_and_safety',
  frequency: 'quarterly', // 'biannual' (twice per year) maps to 'quarterly' in database
  recurrence_pattern: null,
  time_of_day: 'anytime',
  dayparts: ['before_open'],
  assigned_to_role: 'manager',
  assigned_to_user_id: null,
  site_id: null,
  asset_id: null,
  asset_type: 'extraction_systems',
  instructions: 'Service extraction and ventilation systems. Verify operation, clean filters, check airflow. Record service certificate details.',
  repeatable_field_name: 'extraction_system',
  evidence_types: ['pass_fail', 'document'],
  requires_sop: false,
  requires_risk_assessment: false,
  linked_sop_id: null,
  linked_risk_id: null,
  compliance_standard: 'Health & Safety at Work Act 1974',
  is_critical: true,
  triggers_contractor_on_failure: true,
  contractor_type: 'ventilation_contractor',
  is_active: true,
  is_template_library: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workflowType: 'measurement_escalate',
  workflowConfig: {
    escalationRules: {
      outOfRangeAction: 'callout',
      monitoringDuration: 0,
      thresholds: {
        warning: null,
        critical: null
      }
    },
    formConfig: {
      type: 'service_verification',
      assets: 'extraction_systems'
    }
  }
}

/**
 * Get template by slug
 */
export function getTemplateBySlug(slug: string): ComplianceTemplate | null {
  const templates: ComplianceTemplate[] = [
    SFBB_TEMPERATURE_CHECKS_TEMPLATE,
    HOT_HOLDING_TEMPS_TEMPLATE,
    FIRE_ALARM_TEST_TEMPLATE,
    EMERGENCY_LIGHTING_TEST_TEMPLATE,
    PAT_TESTING_TEMPLATE,
    PROBE_CALIBRATION_TEMPLATE,
    EXTRACTION_SERVICE_TEMPLATE
  ]
  
  return templates.find(t => t.slug === slug) || null
}

/**
 * Get all available templates
 * NOTE: The following templates are excluded because they have dedicated React components:
 * - SFBB_TEMPERATURE_CHECKS_TEMPLATE (TemperatureCheckTemplate component)
 * - HOT_HOLDING_TEMPS_TEMPLATE (HotHoldingTemplate component)
 * - FIRE_ALARM_TEST_TEMPLATE (FireAlarmTestTemplate component)
 * - EMERGENCY_LIGHTING_TEST_TEMPLATE (EmergencyLightingTemplate component)
 * - PAT_TESTING_TEMPLATE (PATTestingTemplate component)
 * - PROBE_CALIBRATION_TEMPLATE (ProbeCalibrationTemplate component)
 * - EXTRACTION_SERVICE_TEMPLATE (ExtractionServiceTemplate component)
 * 
 * These are rendered as React components at the top of the compliance templates page,
 * so they should not be auto-imported into the database.
 */
export function getAllTemplates(): ComplianceTemplate[] {
  // Return empty array to prevent auto-importing duplicates
  // The original templates are rendered as React components
  return []
  
  // Uncomment below if you want to include other templates that don't have React components:
  // return [
  //   // Add other templates here that don't have React components
  // ]
}

