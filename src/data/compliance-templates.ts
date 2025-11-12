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

import { TaskTemplate, TaskCategory } from '@/types/checklist'

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
  notes: null,
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
  notes: null,
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
  notes: null,
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
  notes: null,
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
  notes: null,
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
  notes: null,
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
  notes: null,
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
  return (
    COMPLIANCE_MODULE_TEMPLATES.find((template) => template.slug === slug) || null
  )
}

const TEMPLATE_TIMESTAMP = new Date().toISOString()

export function buildComplianceTemplate({
  slug,
  name,
  description,
  category,
  auditCategory,
  frequency,
  dayparts,
  assignedRole,
  evidenceTypes,
  complianceStandard,
  isCritical,
  workflowType = "checklist_verify",
  workflowConfig = {} as ComplianceTemplate["workflowConfig"],
  instructions,
  triggersContractorOnFailure = false,
  contractorType = null as string | null,
}: {
  slug: string
  name: string
  description: string
  category: TaskCategory | string
  auditCategory: string
  frequency: string
  dayparts: string[]
  assignedRole: string
  evidenceTypes: string[]
  complianceStandard: string
  isCritical: boolean
  workflowType?: WorkflowType
  workflowConfig?: ComplianceTemplate["workflowConfig"]
  instructions?: string
  triggersContractorOnFailure?: boolean
  contractorType?: string | null
}): ComplianceTemplate {
  return {
    id: slug,
    company_id: null,
    name,
    slug,
    description,
    category: category as TaskCategory,
    audit_category: auditCategory,
    frequency,
    recurrence_pattern: null,
    time_of_day: dayparts[0] ?? "anytime",
    dayparts,
    assigned_to_role: assignedRole,
    assigned_to_user_id: null,
    site_id: null,
    asset_id: null,
    asset_type: null,
    instructions: instructions ?? description,
    repeatable_field_name: null,
    evidence_types: evidenceTypes,
    requires_sop: false,
    requires_risk_assessment: false,
    linked_sop_id: null,
    linked_risk_id: null,
    compliance_standard: complianceStandard,
    is_critical: isCritical,
    triggers_contractor_on_failure: triggersContractorOnFailure,
    contractor_type: contractorType,
    is_active: true,
    is_template_library: true,
    created_at: TEMPLATE_TIMESTAMP,
    updated_at: TEMPLATE_TIMESTAMP,
    workflowType,
    workflowConfig,
  }
}

const COMPLIANCE_MODULE_TEMPLATES_V2: ComplianceTemplate[] = [
  buildComplianceTemplate({
    slug: "fridge-freezer-temperature-check",
    name: "Fridge/Freezer Temperature Check",
    description:
      "Daily temperature monitoring for all chilled and frozen storage units with escalation for out-of-range readings.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "daily",
    dayparts: ["before_open", "during_service", "after_service"],
    assignedRole: "kitchen_manager",
    evidenceTypes: ["temperature", "checklist"],
    complianceStandard: "Food Safety Act / HACCP",
    isCritical: true,
    workflowType: "measurement",
    triggersContractorOnFailure: true,
    contractorType: "equipment_repair",
  }),
  buildComplianceTemplate({
    slug: "hot_holding_temperature_verification",
    name: "Hot Holding Temperature Verification",
    description:
      "During-service verification that all hot holding equipment maintains safe temperatures above 63°C.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "daily",
    dayparts: ["during_service"],
    assignedRole: "BOH",
    evidenceTypes: ["temperature", "text_note"],
    complianceStandard: "Food Safety Act 1990",
    isCritical: true,
    workflowType: "measurement",
  }),
  buildComplianceTemplate({
    slug: "weekly_pest_control_inspection",
    name: "Weekly Pest Control Device Inspection",
    description: "Inspect all pest control devices, record findings, and trigger contractor callouts for any activity.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "weekly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["pass_fail", "photo", "text_note"],
    complianceStandard: "Food Safety Act 1990",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "pest_control",
  }),
  buildComplianceTemplate({
    slug: "fire_alarm_test_weekly",
    name: "Weekly Fire Alarm Test",
    description:
      "Weekly testing of fire alarms and emergency lighting with documentation and contractor escalation for faults.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "fire_safety",
    frequency: "weekly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["pass_fail", "photo", "text_note"],
    complianceStandard: "Fire Safety Order 2005",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "fire_engineer",
  }),
  buildComplianceTemplate({
    slug: "first_aid_kit_inspection",
    name: "Weekly First Aid Kit Inspection",
    description:
      "Comprehensive check of first aid kits to ensure supplies are in date, restocked, and accident book is available.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "health_safety",
    frequency: "weekly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["pass_fail", "photo", "text_note"],
    complianceStandard: "Health and Safety (First-Aid) Regulations 1981",
    isCritical: true,
  }),
  buildComplianceTemplate({
    slug: "fire_extinguisher_inspection",
    name: "Monthly Fire Extinguisher Inspection",
    description:
      "Visual inspection of fire extinguishers for accessibility, condition, pressure, and documentation compliance.",
    category: TaskCategory.FIRE,
    auditCategory: "fire_safety",
    frequency: "monthly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["pass_fail", "text_note"],
    complianceStandard: "Regulatory Reform (Fire Safety) Order 2005",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "fire_safety",
  }),
  buildComplianceTemplate({
    slug: "extraction_system_contractor_verification",
    name: "Extraction System Contractor Verification",
    description:
      "Verify professional extraction cleaning service, upload certificates, and track next due dates.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "health_safety",
    frequency: "monthly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["text_note", "pass_fail"],
    complianceStandard: "Health and Safety at Work Act 1974",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "duct_cleaning",
  }),
  buildComplianceTemplate({
    slug: "lighting_inspection",
    name: "Weekly Lighting Inspection",
    description:
      "Check all lighting across the venue is operational and raise electrical callouts for unresolved faults.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "health_safety",
    frequency: "weekly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["text_note", "pass_fail"],
    complianceStandard: "Workplace (Health, Safety and Welfare) Regulations 1992",
    isCritical: false,
    triggersContractorOnFailure: true,
    contractorType: "electrical",
  }),
  buildComplianceTemplate({
    slug: "workplace_inspection",
    name: "Monthly Health & Safety Workplace Inspection",
    description:
      "Comprehensive safety walkthrough covering kitchen, FOH, staff welfare, and fire safety requirements.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "health_safety",
    frequency: "monthly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["text_note", "pass_fail", "photo"],
    complianceStandard: "Health and Safety at Work Act 1974",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "safety_consultant",
  }),
  buildComplianceTemplate({
    slug: "training_records_review",
    name: "Monthly Training Compliance Review",
    description:
      "Review staff training records, update certificate expiries, and plan refresher training for gaps.",
    category: TaskCategory.COMPLIANCE,
    auditCategory: "health_safety",
    frequency: "monthly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["text_note", "pass_fail"],
    complianceStandard: "Health and Safety at Work Act 1974",
    isCritical: true,
  }),
  buildComplianceTemplate({
    slug: "training_compliance_management",
    name: "Training Compliance Management",
    description:
      "Manage live training matrix data, summarise expiring certificates, and log follow-up actions.",
    category: TaskCategory.COMPLIANCE,
    auditCategory: "health_safety",
    frequency: "monthly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["text_note", "pass_fail", "repeatable_record"],
    complianceStandard: "Health and Safety at Work Act 1974",
    isCritical: true,
  }),
  buildComplianceTemplate({
    slug: "food_labelling_audit",
    name: "Food Labelling & Dating Compliance Audit",
    description:
      "Comprehensive audit of food labelling, shelf-life controls, and FIFO adherence across the venue.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "weekly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["text_note", "pass_fail"],
    complianceStandard: "Food Safety Act 1990, Food Hygiene Regulations",
    isCritical: true,
  }),
]

export const COMPLIANCE_MODULE_TEMPLATES = COMPLIANCE_MODULE_TEMPLATES_V2

export const COMPLIANCE_MODULE_SLUGS = COMPLIANCE_MODULE_TEMPLATES.map(
  (template) => template.slug
)

export function getAllTemplates(): ComplianceTemplate[] {
  return COMPLIANCE_MODULE_TEMPLATES
}

