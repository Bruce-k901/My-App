/**
 * Compliance Templates - Single Source of Truth
 *
 * All templates use the enhanced Yes/No checklist format with per-answer
 * actions (logException, requireAction, requestAction) and staff-facing
 * corrective-action messages. Use the yn() helper to build items.
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
 * Build an enhanced Yes/No checklist item with corrective-action guidance.
 * Every "No" answer logs an exception and requires the staff member to
 * document what action they took. Safety-critical items also notify the manager.
 */
function yn(text: string, noMessage: string, safety?: boolean) {
  return {
    text,
    options: [
      { label: "Yes", value: "yes", actions: {} },
      {
        label: "No",
        value: "no",
        actions: {
          logException: true,
          requireAction: true,
          ...(safety ? { requestAction: true } : {}),
          message: noMessage,
        },
      },
    ],
  };
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
  assetType = null as string | null,
  repeatableFieldName = null as string | null,
  recurrencePattern = null as Record<string, any> | null,
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
  assetType?: string | null
  repeatableFieldName?: string | null
  recurrencePattern?: Record<string, any> | null
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
    recurrence_pattern: recurrencePattern,
    time_of_day: dayparts[0] ?? "anytime",
    dayparts,
    assigned_to_role: assignedRole,
    assigned_to_user_id: null,
    site_id: null,
    asset_id: null,
    asset_type: assetType,
    instructions: instructions ?? description,
    repeatable_field_name: repeatableFieldName,
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
  // ─── FOOD SAFETY: Temperature ───
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
    assetType: "refrigeration_equipment",
    repeatableFieldName: "asset_name",
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
    evidenceTypes: ["temperature", "text_note", "photo"],
    complianceStandard: "Food Safety Act 1990",
    isCritical: true,
    workflowType: "measurement",
    assetType: "hot_holding_equipment",
    repeatableFieldName: "equipment_name",
  }),

  // ─── FOOD SAFETY: Pest Control ───
  buildComplianceTemplate({
    slug: "weekly_pest_control_inspection",
    name: "Weekly Pest Control Device Inspection",
    description: "Inspect all pest control devices, record findings, and trigger contractor callouts for any activity.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "weekly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["pass_fail", "photo", "yes_no_checklist"],
    complianceStandard: "Food Safety Act 1990",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "pest_control",
    recurrencePattern: {
      daypart_times: { before_open: "07:00" },
      default_checklist_items: [
        yn("All mouse traps checked in storage areas", "Identify which traps need attention and reset. Document specific locations.", true),
        yn("Insectocutors functional in food preparation areas", "Report faulty units. Clean catch trays if needed.", true),
        yn("Bait stations inspected in external areas", "Report missing or damaged bait stations to pest contractor.", true),
        yn("No droppings or gnaw marks found", "Take photos. Do not disturb evidence. Call pest control contractor immediately.", true),
        yn("No pest entry points around doors/windows", "Photograph entry points. Arrange for immediate proofing.", true),
        yn("No pest activity in dry goods storage", "Quarantine affected stock. Contact pest control immediately.", true),
        yn("All findings documented with photos", "Complete documentation before end of shift."),
      ]
    },
  }),

  // ─── HEALTH & SAFETY: Fire ───
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
    assetType: "fire_alarms",
    repeatableFieldName: "fire_alarm_location",
  }),

  // ─── HEALTH & SAFETY: First Aid ───
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
    evidenceTypes: ["pass_fail", "photo", "yes_no_checklist"],
    complianceStandard: "Health and Safety (First-Aid) Regulations 1981",
    isCritical: true,
    recurrencePattern: {
      daypart_times: { before_open: "07:00" },
      default_checklist_items: [
        yn("Fabric plasters — assorted sizes in date and adequate quantity", "Restock immediately. Order replacements if stock not available."),
        yn("Blue plasters for food handlers in date and adequate quantity", "Restock immediately. Food handlers must have blue detectable plasters."),
        yn("Medium sterile dressings available", "Restock immediately."),
        yn("Large sterile dressings available", "Restock immediately."),
        yn("Burns dressings available", "Restock immediately."),
        yn("Disposable gloves available", "Restock immediately."),
        yn("Antiseptic wipes available", "Restock immediately."),
        yn("Eye wash solution in date and available", "Replace immediately. Check expiry date on new stock."),
        yn("Scissors and tweezers present", "Replace missing items today."),
        yn("Finger cots available", "Restock immediately."),
        yn("Burns gel sachets in date", "Replace expired sachets. Check expiry on new stock."),
        yn("Accident book available and completed", "Locate accident book. If lost, obtain replacement today."),
        yn("All used or expired items restocked", "Restock now. Order items not available on-site."),
      ]
    },
  }),

  // ─── FIRE SAFETY: Extinguishers ───
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
    evidenceTypes: ["pass_fail", "yes_no_checklist", "photo"],
    complianceStandard: "Regulatory Reform (Fire Safety) Order 2005",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "fire_safety",
    recurrencePattern: {
      date_of_month: 1,
      daypart_times: { before_open: "07:00" },
      default_checklist_items: [
        yn("Pressure gauge in green zone", "Tag out of service. Arrange professional inspection immediately.", true),
        yn("Safety pin and seal intact", "Tag out of service. Report potential tampering to management.", true),
        yn("No physical damage or corrosion", "Tag out of service. Arrange replacement.", true),
        yn("Clear access — not obstructed or hidden", "Clear obstruction immediately. Ensure extinguisher is visible and accessible.", true),
        yn("Inspection tag present and current", "Request replacement tag. Schedule professional inspection if overdue."),
        yn("Inspection recorded in fire safety log", "Complete fire safety log entry now."),
        yn("All issues reported for immediate service", "Escalate all outstanding issues to fire safety contractor.", true),
      ]
    },
  }),

  // ─── HEALTH & SAFETY: Extraction / Lighting ───
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
    evidenceTypes: ["text_note", "pass_fail", "photo"],
    complianceStandard: "Health and Safety at Work Act 1974",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "duct_cleaning",
    assetType: "extraction_systems",
    repeatableFieldName: "extraction_system",
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
    evidenceTypes: ["text_note", "pass_fail", "photo"],
    complianceStandard: "Workplace (Health, Safety and Welfare) Regulations 1992",
    isCritical: false,
    triggersContractorOnFailure: true,
    contractorType: "electrical",
  }),

  // ─── HEALTH & SAFETY: Workplace Inspection ───
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
    evidenceTypes: ["yes_no_checklist", "text_note", "pass_fail", "photo"],
    complianceStandard: "Health and Safety at Work Act 1974",
    isCritical: true,
    triggersContractorOnFailure: true,
    contractorType: "safety_consultant",
    recurrencePattern: {
      default_checklist_items: [
        yn("Floors clean, dry, and free from trip hazards", "Address hazard immediately. Cordon area if wet or damaged.", true),
        yn("Fire exits clear and accessible", "Clear obstruction immediately. This is a legal requirement.", true),
        yn("Emergency lighting functional", "Report to electrician. Arrange emergency repair.", true),
        yn("First aid kits stocked and accessible", "Restock immediately. Ensure first aider is on shift."),
        yn("Electrical equipment in good condition (no frayed cables)", "Take out of service immediately. Arrange PAT test or repair.", true),
        yn("Manual handling aids available where needed", "Source required aids. Restrict lifting tasks until resolved."),
        yn("Ventilation and extraction systems operational", "Report to maintenance. Check for fumes or heat build-up.", true),
        yn("Staff welfare facilities clean and adequate", "Schedule immediate clean. Address any deficiencies."),
        yn("Accident book available and up to date", "Locate or replace accident book. Complete any missing entries."),
        yn("Safety signage displayed correctly", "Replace missing or damaged signage today."),
      ]
    },
  }),

  // ─── COMPLIANCE: Training ───
  buildComplianceTemplate({
    slug: "training_records_review",
    name: "Monthly Training Compliance Review",
    description:
      "Monthly review of staff training records, compliance matrix, certificate expiries, and training gaps. Covers food hygiene, allergen awareness, HACCP, and role-specific competency requirements.",
    category: TaskCategory.COMPLIANCE,
    auditCategory: "health_safety",
    frequency: "monthly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "pass_fail", "photo", "document_upload"],
    complianceStandard: "Health and Safety at Work Act 1974",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("All food handlers hold Level 2 Food Hygiene (or equivalent)", "Book training immediately for non-compliant staff. Record names and booking dates."),
        yn("HACCP training completed for relevant staff", "Identify gaps and schedule HACCP training within 2 weeks."),
        yn("Allergen awareness training records current for all staff", "Schedule allergen refresher. Staff cannot prepare allergen-sensitive food until trained.", true),
        yn("New starter inductions completed before commencing work", "Do not allow uninducted staff to work unsupervised."),
        yn("Temporary/agency staff training documented", "Conduct immediate induction. Document training before next shift."),
        yn("Refresher training schedule in place and being followed", "Create refresher schedule and assign to training coordinator."),
        yn("Training matrix reviewed — gaps identified and planned", "Complete training matrix review. Assign all training gaps within 1 month."),
        yn("Certificate expiry dates checked — renewals scheduled", "Check all expiry dates today. Book renewals for any expiring within 3 months."),
        yn("Supervisors trained to appropriate level for their role", "Identify supervisor training gaps. Book Level 3 or equivalent."),
        yn("Training records filed and accessible for audit", "Locate missing records. Set up accessible filing system."),
      ]
    },
  }),

  // ─── FOOD SAFETY: Labelling & Dating ───
  buildComplianceTemplate({
    slug: "food_labelling_dating_audit",
    name: "Food Labelling & Dating Compliance Audit",
    description:
      "Comprehensive audit of food labelling, dating, and stock rotation systems. Ensures labels never run out, correct usage, FIFO system working, no expired food, and no evidence of tampering or relabelling.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "weekly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "pass_fail", "photo"],
    complianceStandard: "Food Safety Act 1990, Food Hygiene Regulations, HACCP",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("All stored food items have date labels applied", "Label all unlabelled items immediately. Discard any that cannot be identified."),
        yn("Use-by and best-before dates legible and accurate", "Replace illegible labels. Verify dates against stock records."),
        yn("FIFO system being followed — oldest stock at front", "Reorganise stock now. Retrain staff on FIFO procedures."),
        yn("No expired food found in any storage area", "Remove and dispose of expired stock immediately. Record waste.", true),
        yn("Opened items labelled with open date and use-by", "Label all opened items now. Discard any without clear dates."),
        yn("Labels not tampered with or relabelled", "Investigate immediately. Remove suspect items from storage.", true),
        yn("Sufficient label stock available for all areas", "Order labels today. Ensure temporary supply is available."),
        yn("Frozen items labelled with product name and freeze date", "Label all unlabelled frozen items. Discard any unidentifiable items."),
        yn("Staff understand and follow labelling procedures", "Schedule refresher training on labelling procedures this week."),
        yn("Prep items labelled with allergen information where required", "Label all prep items with allergen info immediately.", true),
      ]
    },
  }),

  // ─── FOOD SAFETY: Raw/RTE Separation ───
  buildComplianceTemplate({
    slug: "raw_rte_separation_audit",
    name: "Separation Audit: Raw vs Ready-to-Eat Foods",
    description:
      "Daily audit to verify proper separation between raw and ready-to-eat foods in all storage areas. Prevents cross-contamination through correct storage organization, color-coding, and physical barriers.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "daily",
    dayparts: ["before_open"],
    assignedRole: "kitchen_manager",
    evidenceTypes: ["yes_no_checklist", "pass_fail", "photo"],
    complianceStandard: "Food Safety Act 1990, Food Hygiene Regulations, HACCP",
    isCritical: true,
    recurrencePattern: {
      daypart_times: { before_open: "07:00" },
      default_checklist_items: [
        yn("Raw meats stored BELOW cooked/ready-to-eat items", "Reorganise storage immediately. Dispose of any contaminated RTE food.", true),
        yn("Drip trays present under raw meat storage", "Place drip trays under all raw meat. Clean any drips immediately.", true),
        yn("Colour-coded containers used correctly", "Replace incorrect containers now. Retrain staff on colour-coding system."),
        yn("Dedicated utensils for raw vs ready-to-eat", "Separate utensils immediately. Clean any shared utensils before RTE use.", true),
        yn("Physical barriers between zones where needed", "Install barriers or separate products now. Prevent cross-contamination.", true),
      ]
    },
  }),

  // ─── FOOD SAFETY: Handwashing ───
  buildComplianceTemplate({
    slug: "handwashing_station_compliance_check",
    name: "Handwashing Station Compliance Check",
    description:
      "Daily verification of all handwashing facilities to ensure operational compliance. Check hot/cold water supply, soap/towel availability, signage, and water temperature.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "cleaning_premises",
    frequency: "daily",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "temperature", "pass_fail", "photo"],
    complianceStandard: "Food Safety Act 1990, Food Hygiene Regulations, HACCP",
    isCritical: true,
    recurrencePattern: {
      daypart_times: { before_open: "07:00" },
      default_checklist_items: [
        yn("Hot AND cold running water available", "Report to maintenance immediately. Station cannot be used without running water.", true),
        yn("Liquid soap dispenser full", "Refill soap dispenser now. Ensure backup stock is available."),
        yn("Paper towels stocked", "Restock paper towels now. Ensure backup stock is available."),
        yn("No-touch bin with liner in place", "Replace bin liner. Source replacement bin if damaged."),
        yn("'Now Wash Your Hands' sign visible", "Replace signage today. Ensure sign is clearly visible."),
        yn("Water temperature reaches 40-45°C", "Report to maintenance. Check thermostat settings.", true),
      ]
    },
  }),

  // ─── FOOD SAFETY: Probe Calibration ───
  buildComplianceTemplate({
    slug: "temperature_probe_calibration_audit",
    name: "Temperature Probe Calibration Audit",
    description:
      "Monthly calibration of all temperature probes using ice bath (0°C) and boiling water (100°C) tests. Verify probe accuracy, condition, and functionality.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "handling_storage",
    frequency: "monthly",
    dayparts: ["before_open"],
    assignedRole: "kitchen_manager",
    evidenceTypes: ["yes_no_checklist", "temperature", "pass_fail", "photo"],
    complianceStandard: "Food Safety Act 1990, Food Hygiene Regulations, HACCP",
    isCritical: true,
    assetType: "temperature_probes",
    repeatableFieldName: "probe_name",
    recurrencePattern: {
      daypart_times: { before_open: "09:00" },
      default_checklist_items: [
        yn("Ice bath test: reads 0°C ±1°C", "Tag probe out of calibration. Do not use until recalibrated or replaced.", true),
        yn("Boiling water test: reads 100°C ±1°C", "Tag probe out of calibration. Review recent temperature logs taken with this probe.", true),
        yn("Probe clean and undamaged", "Clean or replace probe. Do not use damaged probes."),
        yn("Battery functional", "Replace battery now. Do not use probes with low battery."),
        yn("Calibration date sticker updated", "Update sticker with today's date and next due date."),
      ]
    },
  }),

  // ─── HEALTH & SAFETY: Fire Drill ───
  buildComplianceTemplate({
    slug: "fire_drill_execution_documentation",
    name: "Fire Drill Execution & Documentation",
    description:
      "Biannual fire drill execution and documentation. Test alarm activation, record evacuation timing, conduct headcount at assembly points, verify fire warden duties, and document all findings.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "fire_safety",
    frequency: "biannual",
    dayparts: ["during_service"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "pass_fail", "photo", "text_note", "document_upload"],
    complianceStandard: "Regulatory Reform (Fire Safety) Order 2005",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("Fire alarm activated successfully", "Report alarm fault to fire engineer immediately. Do not delay.", true),
        yn("All staff evacuated to assembly point", "Identify who did not evacuate. Retrain immediately.", true),
        yn("Evacuation completed within target time", "Review evacuation routes. Identify bottlenecks and address."),
        yn("Full headcount conducted at assembly point", "Implement headcount procedure. Assign headcount responsibility.", true),
        yn("Fire wardens performed their duties correctly", "Retrain fire wardens. Schedule refresher within 1 week."),
        yn("All fire exits and escape routes were clear", "Clear obstructions immediately. Issue reminder to all staff.", true),
        yn("Disabled staff/visitors evacuation plan tested", "Review PEEP plans. Ensure evacuation chairs are accessible."),
        yn("Drill findings recorded in fire safety log", "Complete fire log entry with all drill details and observations."),
        yn("Improvement actions identified and assigned", "Document all improvements with owners and deadlines."),
        yn("Staff debriefed on drill outcomes", "Schedule debrief session within 48 hours."),
      ]
    },
  }),

  // ─── HEALTH & SAFETY: Emergency Contacts ───
  buildComplianceTemplate({
    slug: "emergency_contact_list_compliance_check",
    name: "Emergency Contact List Compliance Check",
    description:
      "Quarterly verification that emergency contact lists are displayed correctly in all required locations. Verify contact information is current, legible, and includes all required details.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "welfare_first_aid",
    frequency: "quarterly",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "pass_fail", "photo", "text_note"],
    complianceStandard: "Health & Safety at Work Act 1974, Management of Health & Safety at Work Regulations 1999",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("Emergency contact list displayed in all required locations", "Print and display updated lists in all required areas today."),
        yn("All contact numbers verified as current and correct", "Call and verify each number. Update any that have changed."),
        yn("Contact list includes: fire, ambulance, police, gas, water, electricity", "Add any missing emergency services to the list immediately.", true),
        yn("Key holders and management contacts are current", "Update key holder and management details. Distribute to all staff."),
        yn("First aider names and contact details displayed", "Update first aider details. Ensure at least one per shift."),
        yn("Nearest hospital A&E address and phone displayed", "Add nearest A&E details to the contact list."),
        yn("Contact list is legible and not damaged", "Replace damaged or faded lists with fresh copies."),
        yn("Staff know where to find emergency contacts", "Brief staff on emergency contact locations during next team meeting."),
      ]
    },
  }),

  // ─── FOOD SAFETY: Staff Sickness ───
  buildComplianceTemplate({
    slug: "staff_sickness_exclusion_log",
    name: "Staff Sickness & Exclusion Log",
    description:
      "Log and track staff illness, exclusions, and return-to-work clearance. Ensures compliance with food safety regulations requiring exclusion of symptomatic staff from food handling areas.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "personal_hygiene",
    frequency: "triggered",
    dayparts: [],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "photo"],
    complianceStandard: "Food Safety Act 1990, Food Hygiene Regulations 2013",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("Staff member's name, role, and symptoms recorded", "Record full details before proceeding. Include date of symptom onset."),
        yn("Staff member excluded from food handling areas", "Remove from food handling duties immediately. This is a legal requirement.", true),
        yn("Symptoms include vomiting, diarrhoea, or jaundice", "Exclude for minimum 48 hours after symptoms cease. Notify EHO if multiple staff affected.", true),
        yn("Date of exclusion and expected return date recorded", "Record exclusion start date and earliest return date (48 hrs post-symptoms)."),
        yn("GP or medical clearance obtained before return", "Do not allow return to food handling without medical clearance."),
        yn("Other staff checked for similar symptoms", "Ask all team members about symptoms. Exclude any with similar complaints.", true),
        yn("Work areas cleaned and sanitised after exclusion", "Deep clean all areas the staff member worked in."),
        yn("Sickness log updated and filed for audit", "Complete the sickness log and file in compliance records."),
      ]
    },
  }),

  // ─── CLEANING: Schedule Compliance ───
  buildComplianceTemplate({
    slug: "cleaning_schedule_compliance_audit",
    name: "Verify Cleaning Schedule Compliance",
    description:
      "Daily manager audit to verify cleaning schedule compliance, chemical usage, and staff procedures.",
    category: TaskCategory.CLEANING,
    auditCategory: "food_safety",
    frequency: "daily",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "photo", "pass_fail", "text_note"],
    complianceStandard: "Food Safety Act 1990, HACCP",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("Cleaning schedule covers all areas, equipment, and frequencies", "Update cleaning schedule to include all areas. Review with staff."),
        yn("Cleaning records completed and signed off for today", "Complete outstanding cleaning records. Brief staff on sign-off requirements."),
        yn("Chemical dilution rates displayed and followed correctly", "Display correct dilution charts. Retrain staff on correct dilution rates."),
        yn("COSHH assessments current for all cleaning chemicals", "Update COSHH assessments. Remove any chemicals without current assessments."),
        yn("Food contact surfaces clean to touch and sight", "Re-clean surfaces immediately. Investigate why cleaning was missed.", true),
        yn("Equipment disassembled and cleaned per schedule", "Disassemble and clean now. Retrain staff on equipment cleaning procedures."),
        yn("Cleaning materials stored separately from food areas", "Relocate cleaning materials immediately. Ensure locked storage.", true),
        yn("Staff observed following correct cleaning procedures", "Retrain staff on correct procedures. Observe again within 24 hours."),
        yn("No missed areas or overdue deep cleans", "Schedule overdue deep cleans this week. Update cleaning roster."),
        yn("Chemicals locked away and properly labelled", "Lock chemicals away immediately. Label any unlabelled containers.", true),
      ]
    },
  }),

  // ─── FOOD SAFETY: Handwashing Observation ───
  buildComplianceTemplate({
    slug: "staff_handwashing_compliance_observation",
    name: "Staff Handwashing Compliance Observation",
    description:
      "Daily random spot checks to observe and verify staff handwashing compliance. Conduct discreet observations without disrupting workflow.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "personal_hygiene",
    frequency: "daily",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note"],
    complianceStandard: "Food Safety Act 1990, Food Hygiene Regulations, HACCP",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("Staff wash hands on entry to food handling areas", "Remind staff immediately. Brief team on handwashing requirements."),
        yn("Handwashing observed after handling raw food", "Intervene immediately. Retrain staff member on cross-contamination risks.", true),
        yn("Hands washed after breaks, eating, or smoking", "Remind staff. Issue verbal warning if repeat offence."),
        yn("Hands washed after touching face, hair, or body", "Remind staff. Reinforce 'hands only for food' message."),
        yn("Correct technique: soap, 20 seconds, rinse, dry", "Demonstrate correct technique. Display handwashing poster at each station."),
        yn("Hands washed after handling waste or cleaning chemicals", "Intervene immediately. Retrain on contamination risks.", true),
        yn("Staff use disposable gloves correctly (changed between tasks)", "Issue correct gloves. Retrain on when to change gloves."),
        yn("No evidence of skipping handwashing between tasks", "Brief all staff on handwashing protocol. Monitor more closely this week."),
      ]
    },
  }),

  // ─── FOOD SAFETY: Protective Clothing ───
  buildComplianceTemplate({
    slug: "protective_clothing_compliance_check",
    name: "Protective Clothing Compliance Check",
    description:
      "Daily start-of-shift inspection to verify staff are wearing clean, appropriate protective clothing.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "personal_hygiene",
    frequency: "daily",
    dayparts: ["before_open"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "photo"],
    complianceStandard: "Food Safety Act 1990, Food Hygiene Regulations, HACCP",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("Clean protective clothing worn by all food handlers", "Issue clean clothing. Staff must not start work in soiled clothing."),
        yn("Hair fully covered by hairnet or hat", "Issue hairnet. Staff cannot enter food areas without hair restraint."),
        yn("No jewellery except plain wedding band", "Ask staff to remove jewellery. Store in lockers before entering food areas."),
        yn("Fingernails short, clean, and free of nail varnish", "Ask staff to trim nails or remove varnish before handling food."),
        yn("Cuts and wounds covered with blue detectable plasters", "Issue blue plasters from first aid kit. Cover all visible wounds."),
        yn("Appropriate footwear worn (closed-toe, non-slip)", "Ask staff to change footwear. Do not allow open-toed shoes in kitchen."),
        yn("Colour-coded clothing used correctly per zone", "Issue correct clothing for zone. Retrain on colour-coding system."),
        yn("Personal items stored in lockers, not in food areas", "Remove personal items from food areas immediately. Use designated lockers."),
        yn("Visitors and contractors given appropriate PPE", "Issue PPE before entry. Escort until PPE is worn correctly."),
      ]
    },
  }),

  // ─── HEALTH & SAFETY: Policy Reviews ───
  buildComplianceTemplate({
    slug: "health_safety_policy_review_maintenance",
    name: "Health & Safety Policy Review & Maintenance",
    description:
      "Annual review and maintenance of the Health & Safety Policy. Ensures policy remains current, legally compliant, and all staff are aware of requirements.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "policy_organisation",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload"],
    complianceStandard: "Health & Safety at Work Act 1974",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("H&S policy document is current and dated within last 12 months", "Update the policy document with today's date. Review all sections."),
        yn("Policy signed by senior management/owner", "Obtain signature from senior management before displaying."),
        yn("Policy statement displayed and accessible to all staff", "Print and display in staff areas. Ensure digital copy is accessible."),
        yn("Responsibilities clearly assigned (employer, managers, staff)", "Update responsibility assignments. Communicate changes to all staff."),
        yn("Policy reflects current workplace activities and hazards", "Review and update to include any new activities or hazards."),
        yn("Emergency procedures section is current", "Update emergency procedures. Ensure staff are briefed on changes.", true),
        yn("All staff have been briefed on the policy", "Schedule policy briefing for all staff within 2 weeks."),
        yn("Training requirements identified and actioned", "Create training action plan. Schedule outstanding training."),
        yn("Previous year's incidents reviewed and lessons incorporated", "Review incident log. Add preventive measures for recurring issues."),
        yn("Policy review date set for next 12 months", "Set calendar reminder for next annual review."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "competent_health_safety_person_appointment",
    name: "Competent Health & Safety Person Appointment",
    description:
      "Annual verification that a competent Health & Safety person is formally appointed.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "policy_organisation",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload"],
    complianceStandard: "Health & Safety at Work Act 1974",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("Competent person formally appointed in writing", "Arrange formal appointment letter. This is a legal requirement."),
        yn("Appointed person has appropriate qualifications/training", "Arrange IOSH or NEBOSH training. Document qualifications held."),
        yn("Appointment documented and filed", "File appointment letter in H&S records."),
        yn("Contact details displayed for all staff to see", "Display competent person details on the H&S notice board."),
        yn("Competent person aware of their responsibilities", "Brief appointed person on their duties and authority."),
        yn("Competent person has authority to take action on H&S matters", "Confirm authority in writing. Communicate to all managers."),
        yn("Training records up to date for appointed person", "Update training records. Schedule any required CPD."),
        yn("Appointment reviewed and reconfirmed for this year", "Reconfirm appointment in writing for this year."),
      ]
    },
  }),

  // ─── HEALTH & SAFETY: Risk Assessments ───
  buildComplianceTemplate({
    slug: "general_workplace_risk_assessment",
    name: "General Workplace Risk Assessment",
    description:
      "Annual comprehensive risk assessment covering all work areas. Identifies hazards, rates risks, documents control measures, and ensures staff consultation.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "risk_assessment",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload", "photo"],
    complianceStandard: "Management of Health & Safety at Work Regulations 1999",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("All work areas included in the risk assessment", "Identify and add any missing areas. Walk the entire premises."),
        yn("Hazards identified for each area (slips, trips, falls, burns, cuts)", "Conduct hazard walk. Record all hazards found."),
        yn("Risk ratings assigned (likelihood x severity)", "Rate each hazard using the risk matrix. Prioritise high-risk items."),
        yn("Control measures documented for each hazard", "Document control measures. Implement any missing controls."),
        yn("Staff consulted during the assessment", "Consult with staff representatives. Record their input."),
        yn("Vulnerable groups considered (young workers, pregnant, disabled)", "Assess specific risks for vulnerable groups. Update controls as needed."),
        yn("Risk assessment signed and dated", "Sign and date the assessment. File original and display summary."),
        yn("Actions from previous assessment completed", "Review and close outstanding actions. Escalate any overdue items."),
        yn("Staff trained on relevant control measures", "Schedule training for any new or updated control measures."),
        yn("Review date set for next 12 months", "Set calendar reminder for next annual review."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "manual_handling_risk_assessment",
    name: "Manual Handling Risk Assessment",
    description:
      "Annual assessment of all manual handling tasks to identify risks, document weight limits, verify training, and ensure mechanical aids are available.",
    category: TaskCategory.HEALTH_AND_SAFETY,
    auditCategory: "risk_assessment",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload", "photo"],
    complianceStandard: "Manual Handling Operations Regulations 1992",
    isCritical: true,
    recurrencePattern: {
      default_checklist_items: [
        yn("All manual handling tasks identified and listed", "Identify and record all tasks involving lifting, carrying, pushing, or pulling."),
        yn("Weight limits displayed for each task/area", "Create and display weight limit signage in all relevant areas."),
        yn("Mechanical aids available (trolleys, sack barrows, pallet trucks)", "Source required aids. Do not allow heavy lifting without aids."),
        yn("Staff trained in correct manual handling techniques", "Schedule manual handling training for untrained staff."),
        yn("High-risk tasks assessed using TILE (Task, Individual, Load, Environment)", "Complete TILE assessment for each high-risk task. Document findings."),
        yn("Delivery areas assessed for safe unloading", "Review delivery area layout. Ensure adequate space and equipment."),
        yn("Control measures in place to reduce manual handling where possible", "Implement controls: reduce weight, use aids, team lifting for heavy items."),
        yn("Incident records reviewed for manual handling injuries", "Review incident log. Investigate any manual handling injuries."),
        yn("Assessment signed, dated, and filed", "Sign and date assessment. File in H&S records."),
        yn("Review date set for next 12 months", "Set calendar reminder for next annual review."),
      ]
    },
  }),

  // ─── SALSA Compliance Templates ───
  buildComplianceTemplate({
    slug: "salsa_annual_food_safety_review",
    name: "Annual SALSA Food Safety Review",
    description:
      "Comprehensive annual review of all five SALSA standard sections — prerequisite controls, HACCP, management systems, GMP, and supplier approval.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "pass_fail", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    workflowConfig: {
      verificationRules: { requiresSignature: true },
    },
    recurrencePattern: {
      default_checklist_items: [
        yn("Prerequisite controls reviewed and legally compliant", "Identify non-compliant prerequisites. Create action plan with deadlines."),
        yn("HACCP plan reviewed — scope, flow diagrams, and CCPs current", "Update HACCP plan. Schedule HACCP team meeting within 2 weeks.", true),
        yn("Management systems documentation up to date", "Update documentation. Version-control all management system documents."),
        yn("Training records current for all food handlers", "Identify training gaps. Schedule outstanding training within 1 month."),
        yn("Cleaning schedules reviewed and verified effective", "Update cleaning schedules. Verify effectiveness through ATP testing."),
        yn("Temperature monitoring records complete and compliant", "Investigate gaps in temperature records. Retrain staff if needed.", true),
        yn("Allergen management procedures reviewed", "Update allergen procedures. Retrain staff on any changes.", true),
        yn("Pest control contract and inspection records current", "Contact pest control provider. Update contract if expired.", true),
        yn("Supplier approval list reviewed — all approvals current", "Review and update supplier list. Chase overdue approvals."),
        yn("Calibration records up to date for all probes/equipment", "Schedule overdue calibrations. Tag out-of-date equipment."),
        yn("Labelling and shelf-life procedures reviewed", "Update labelling procedures. Verify all labels are compliant."),
        yn("Document control system reviewed — SOPs current", "Update SOPs. Remove obsolete versions from circulation."),
        yn("Non-conformances from previous period all closed out", "Close outstanding NCs. Escalate any that require management action."),
        yn("Actions from previous annual review completed", "Complete outstanding actions. Carry forward with new deadlines if needed."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_mock_recall_exercise",
    name: "Mock Recall Exercise",
    description:
      "Annual mock recall to demonstrate traceability capability within 4 hours. SALSA requires this as evidence of recall readiness.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "pass_fail", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    workflowConfig: {
      verificationRules: { requiresSignature: true },
    },
    instructions:
      "Use the automated mock recall tool at /dashboard/stockly/traceability to run forward and backward traces. Record batch code, time taken, and customer count.",
    recurrencePattern: {
      default_checklist_items: [
        yn("Random batch code selected for the exercise", "Select a batch code from current stock. Record the code chosen."),
        yn("FORWARD trace completed: batch → all customers who received it", "Complete forward trace. Document any gaps in traceability.", true),
        yn("BACKWARD trace completed: batch → all raw material suppliers", "Complete backward trace. Document any gaps in supplier records.", true),
        yn("Full trace completed within target time (under 4 hours)", "Investigate delays. Improve systems to meet 4-hour target."),
        yn("100% of affected products/customers can be identified", "Identify gaps in traceability. Implement corrective measures.", true),
        yn("Recall team members know their roles and responsibilities", "Brief recall team on roles. Update recall plan if needed."),
        yn("Customer and supplier contact lists are current and accessible", "Update contact lists. Ensure accessible to recall team."),
        yn("Communication templates (letters/emails) are ready to use", "Create or update recall communication templates."),
        yn("Quantities balance — input vs output vs waste", "Investigate quantity discrepancies. Improve recording procedures."),
        yn("Gaps documented and corrective actions assigned", "Assign corrective actions with owners and deadlines."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_food_fraud_assessment",
    name: "Food Fraud Vulnerability Assessment",
    description:
      "Annual assessment of food fraud risks per SALSA requirement. Covers authenticity, substitution, dilution, and supply chain vulnerabilities.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "pass_fail", "document_upload", "photo"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    recurrencePattern: {
      default_checklist_items: [
        yn("FSA/RASFF alerts reviewed for all ingredients used", "Check FSA and RASFF websites today. Record any relevant alerts."),
        yn("High-risk ingredients assessed for substitution risk", "Assess each high-risk ingredient. Document substitution risks."),
        yn("High-risk ingredients assessed for dilution/adulteration risk", "Assess each high-risk ingredient. Document adulteration risks."),
        yn("Supply chain complexity evaluated for each supplier", "Map supply chains. Flag complex or opaque supply chains."),
        yn("Geographical origin risks reviewed for imported ingredients", "Check origin risk ratings. Source from lower-risk regions where possible."),
        yn("Certificates of analysis current for high-risk items", "Request updated certificates. Do not accept deliveries without valid CoA.", true),
        yn("Vulnerability level scored (low/medium/high) per ingredient", "Complete vulnerability scoring. Focus mitigation on high-risk items."),
        yn("Mitigation measures documented for medium and high-risk items", "Document mitigation measures. Review effectiveness quarterly."),
        yn("Incidents or complaints related to ingredient quality reviewed", "Review complaint records. Investigate any quality concerns."),
        yn("Food fraud policy updated and communicated to relevant staff", "Update policy. Brief all relevant staff on changes."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_haccp_plan_review",
    name: "HACCP Plan Review",
    description:
      "Annual review of the HACCP plan to verify it remains current and effective. SALSA requires documented evidence of regular HACCP review.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "pass_fail", "document_upload", "photo"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    workflowConfig: {
      verificationRules: { requiresSignature: true },
    },
    recurrencePattern: {
      default_checklist_items: [
        yn("HACCP scope covers all current products and processes", "Update scope to include all current products. Remove discontinued items."),
        yn("Process flow diagrams are accurate and up to date", "Update flow diagrams. Walk through production to verify accuracy."),
        yn("Hazard analysis covers biological, chemical, physical, and allergen risks", "Review hazard analysis. Add any missing hazard categories.", true),
        yn("Critical Control Points (CCPs) correctly identified and justified", "Review CCP identification. Justify with scientific evidence.", true),
        yn("Critical limits are science-based and documented", "Verify critical limits are based on legislation or scientific evidence."),
        yn("Monitoring procedures are effective and consistently followed", "Review monitoring records. Retrain staff on monitoring procedures."),
        yn("Corrective action plans are in place for each CCP", "Create or update corrective action plans for each CCP.", true),
        yn("Verification activities (testing, audits) scheduled and completed", "Schedule outstanding verification activities."),
        yn("HACCP team membership is current and competent", "Update team membership. Ensure all members have appropriate training."),
        yn("All recipe, process, or equipment changes assessed since last review", "Assess impact of any changes. Update HACCP plan accordingly."),
        yn("HACCP records complete, accurate, and retrievable", "Complete missing records. File in accessible location."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_internal_audit",
    name: "Internal Food Safety Audit",
    description:
      "Quarterly internal audit of food safety practices. Covers hygiene, cleaning, temperature control, allergen handling, and documentation.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "quarterly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "photo", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    workflowConfig: {
      verificationRules: { requiresPhoto: true, requiresSignature: true },
    },
    recurrencePattern: {
      default_checklist_items: [
        yn("Personal hygiene: staff compliant (handwashing, PPE, jewellery)", "Issue corrective actions for non-compliant staff. Retrain immediately."),
        yn("Cleaning: schedules completed, surfaces visually clean", "Investigate gaps. Re-clean any dirty surfaces now."),
        yn("Temperature: fridge/freezer/hot hold logs complete and in range", "Complete missing logs. Investigate any out-of-range readings.", true),
        yn("Allergens: controls in place, labelling correct, no cross-contact risk", "Review allergen controls. Correct any labelling errors immediately.", true),
        yn("Raw/RTE separation: correct storage, colour-coding, dedicated utensils", "Reorganise storage. Replace incorrect containers or utensils.", true),
        yn("Stock rotation: FIFO followed, no expired products found", "Remove expired stock. Retrain staff on FIFO procedures."),
        yn("Pest control: devices checked, no evidence of pest activity", "Report any pest evidence to contractor immediately.", true),
        yn("Equipment: clean, in good repair, calibration current", "Schedule repairs or calibrations. Tag out-of-service equipment."),
        yn("Traceability: batch codes recorded, delivery records complete", "Complete missing records. Retrain staff on traceability procedures."),
        yn("Documentation: SOPs accessible, logs up to date, signatures present", "Update SOPs. Complete missing log entries."),
        yn("Non-conformances from previous audit addressed and closed", "Close outstanding NCs. Escalate overdue items to management."),
        yn("Staff awareness: team can explain food safety procedures", "Schedule refresher training for staff who cannot explain procedures."),
        yn("Photos taken of any non-conformances found", "Take photos of all non-conformances before corrective action."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_supplier_approval_review",
    name: "Supplier Approval Review",
    description:
      "Annual review of supplier approval status. Verify certificates, specs, and risk ratings are current for all approved suppliers.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "document_track",
    workflowConfig: {
      trackingRules: { expiryWarningDays: 30 },
    },
    instructions:
      "Review approved supplier list at /dashboard/stockly/suppliers/approved-list. Check all certificates are current and risk ratings up to date.",
    recurrencePattern: {
      default_checklist_items: [
        yn("All suppliers on approved list have current approval status", "Review and update approval status. Remove unapproved suppliers."),
        yn("Supplier certificates and accreditations are in date", "Request updated certificates. Do not order from expired suppliers.", true),
        yn("Product specifications on file for all raw materials", "Request specs from suppliers. Do not accept deliveries without specs."),
        yn("Risk ratings assigned and reviewed for each supplier", "Complete risk rating for each supplier using the risk matrix."),
        yn("Goods-in rejection rates reviewed per supplier", "Analyse rejection rates. Escalate high-rejection suppliers."),
        yn("Supplier questionnaires current (within 12 months)", "Send updated questionnaires to suppliers with expired responses."),
        yn("Alternative suppliers identified for critical raw materials", "Identify and approve alternatives for single-source ingredients."),
        yn("Supplier complaints or quality issues documented and resolved", "Review complaints log. Follow up unresolved quality issues."),
        yn("Food fraud risk assessment covers all suppliers", "Update food fraud assessment to include any new suppliers."),
        yn("Approved supplier list updated with any changes", "Update the list with all changes made during this review."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_goods_in_verification",
    name: "Goods-In Inspection Verification",
    description:
      "Weekly verification that goods-in procedures are being followed correctly — temperature checks, batch codes captured, condition assessments completed.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "weekly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "photo"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    recurrencePattern: {
      default_checklist_items: [
        yn("Temperature checks taken on all chilled/frozen deliveries", "Take temperature readings now. Reject deliveries above safe limits.", true),
        yn("Batch codes and best-before dates recorded on intake", "Record batch codes for all deliveries received today."),
        yn("Delivery condition assessed (damage, pests, contamination)", "Inspect all deliveries. Reject any with damage or contamination signs.", true),
        yn("Supplier matches approved supplier list", "Verify supplier is on approved list. Do not accept from unapproved suppliers.", true),
        yn("Quantities match delivery note/invoice", "Check quantities against delivery note. Report discrepancies to supplier."),
        yn("Products stored correctly and promptly after intake", "Store outstanding deliveries immediately. Check temperature-sensitive items first.", true),
        yn("Rejected items documented with reasons and photos", "Document all rejections with photos. Notify supplier of rejection."),
        yn("Goods-in records complete and signed off", "Complete all goods-in records. Sign and date."),
      ]
    },
  }),

  // ─── SALSA Issue 6: Full Coverage ───
  buildComplianceTemplate({
    slug: "salsa_allergen_management_review",
    name: "SALSA Allergen Management Review",
    description:
      "Quarterly review of allergen management controls per SALSA Issue 6. Covers risk assessment, cross-contact prevention, labelling, staff training, and supplier declarations.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "quarterly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    workflowConfig: {
      verificationRules: { requiresSignature: true },
    },
    recurrencePattern: {
      default_checklist_items: [
        yn("Allergen risk assessment current for all products", "Update allergen risk assessment. Include any new products or ingredients.", true),
        yn("All 14 UK allergens identified and documented per recipe", "Review recipes. Ensure all 14 allergens are checked per product.", true),
        yn("Cross-contact risks assessed for shared equipment/surfaces", "Assess shared equipment. Implement cleaning validation between allergen runs.", true),
        yn("Allergen-free claims verified and evidence-based", "Verify claims with testing or validated cleaning. Remove unverified claims.", true),
        yn("Staff trained on allergen awareness (records current)", "Schedule allergen training for staff with expired records."),
        yn("Allergen information available at point of sale/dispatch", "Update allergen info at POS. Ensure menus/labels are accurate.", true),
        yn("Cleaning procedures validated for allergen removal", "Validate cleaning between allergen products. Use ATP or protein swabs."),
        yn("Supplier specifications confirm allergen declarations", "Request updated specs from suppliers. Flag any missing allergen declarations.", true),
        yn("Segregation of allergenic ingredients in storage", "Reorganise storage. Separate allergens from allergen-free ingredients.", true),
        yn("Labelling reviewed — all allergens emphasised correctly", "Update labels. Ensure allergens are in bold per UK regulations.", true),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_premises_structure_audit",
    name: "SALSA Premises, Layout & Structure Audit",
    description:
      "Quarterly audit of premises condition, layout, and structure per SALSA Issue 6. Covers building fabric, ventilation, drainage, pest proofing, and cross-contamination prevention.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "quarterly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "photo"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    workflowConfig: {
      verificationRules: { requiresPhoto: true, requiresSignature: true },
    },
    recurrencePattern: {
      default_checklist_items: [
        yn("Walls, floors, and ceilings clean, intact, and well-maintained", "Schedule repairs. Photograph damage for maintenance request.", true),
        yn("Adequate lighting in all production and storage areas", "Replace bulbs. Report electrical faults to contractor."),
        yn("Ventilation and extraction systems functional and clean", "Report faults to contractor. Clean filters if accessible.", true),
        yn("Drainage adequate and no standing water", "Clear blockages. Report persistent drainage issues to plumber.", true),
        yn("Layout prevents cross-contamination (raw/RTE separation)", "Review layout. Implement physical barriers if needed.", true),
        yn("Handwashing facilities accessible with hot water and soap", "Report faulty facilities to maintenance immediately.", true),
        yn("Changing facilities adequate for staff numbers", "Report inadequate facilities. Propose improvements to management."),
        yn("External areas tidy and free from pest harbourage", "Clear debris and overgrowth. Remove anything attracting pests.", true),
        yn("Pest proofing intact — doors, screens, drains, gaps sealed", "Report gaps to maintenance. Arrange temporary proofing if needed.", true),
        yn("Site plan available showing layout and product flow", "Create or update site plan. Display in management office."),
        yn("No structural damage or maintenance issues outstanding", "Report structural damage immediately. Cordon off unsafe areas.", true),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_document_control_review",
    name: "SALSA Document Control Review",
    description:
      "Annual review of document control systems per SALSA Issue 6. Ensures SOPs, records, specifications, and HACCP documentation are current, version-controlled, and retained for the required period.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    workflowConfig: {
      verificationRules: { requiresSignature: true },
    },
    recurrencePattern: {
      default_checklist_items: [
        yn("All SOPs are current, version-controlled, and approved", "Update outdated SOPs. Apply version numbers and approval signatures."),
        yn("Obsolete documents removed from circulation", "Remove obsolete documents from all locations. Archive for records."),
        yn("Records retained for product shelf-life plus one year", "Review retention schedule. Archive or destroy as appropriate."),
        yn("Document review schedule in place and followed", "Create review schedule. Assign responsibility for each document set."),
        yn("All required records are complete and accessible", "Complete missing records. Ensure filing system is logical and accessible."),
        yn("Product specifications on file and current", "Request updated specs from suppliers. File in specification folder."),
        yn("Supplier documentation (certificates, specs) up to date", "Chase overdue supplier documentation. Set expiry reminders."),
        yn("HACCP documentation complete and version-controlled", "Update HACCP documents. Apply version control to all files."),
        yn("Staff can locate and access relevant procedures", "Test staff access. Improve filing or labelling if needed."),
        yn("Digital records backed up and protected", "Verify backup system is working. Test a restore procedure."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_stock_control_fifo_audit",
    name: "SALSA Stock Control & FIFO Audit",
    description:
      "Weekly audit of stock control and FIFO compliance per SALSA Issue 6. Verifies stock rotation, date labelling, expiry management, and correct storage conditions.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "weekly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "photo", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    recurrencePattern: {
      default_checklist_items: [
        yn("FIFO (First In, First Out) system being followed", "Reorganise stock now. Move oldest to front. Retrain staff."),
        yn("No expired products found in any storage area", "Remove and dispose of expired stock immediately. Record waste.", true),
        yn("All items date-labelled with received and/or opened dates", "Label all unlabelled items now. Discard any unidentifiable items."),
        yn("Stock rotation signs/system visible and understood by staff", "Install or replace FIFO signage. Brief staff on rotation system."),
        yn("Chilled stock within use-by/best-before dates", "Remove expired chilled stock immediately. Check all units.", true),
        yn("Frozen stock labelled with product name and freeze date", "Label all unlabelled frozen items. Discard any unidentifiable items."),
        yn("Dry goods stored off floor and in sealed containers", "Move items off floor. Transfer to sealed containers."),
        yn("Opened items covered, labelled, and within use-by period", "Cover and label opened items. Discard any past use-by."),
        yn("Waste records match expected usage patterns", "Investigate discrepancies. Review waste records with kitchen team."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_labelling_compliance_audit",
    name: "SALSA Product Labelling Compliance Audit",
    description:
      "Monthly audit of product labelling for manufactured goods per SALSA Issue 6. Covers legal label requirements, allergen declaration, nutritional information, batch codes, and label stock control.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "monthly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "photo"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    recurrencePattern: {
      default_checklist_items: [
        yn("Product labels contain all legally required information", "Review label requirements. Update labels to include all mandatory fields."),
        yn("Allergens emphasised in ingredients list (bold/colour)", "Update labels to emphasise allergens in bold per UK regulations.", true),
        yn("Use-by and best-before dates accurate and legible", "Correct inaccurate dates. Replace illegible labels."),
        yn("Batch/lot codes present and traceable", "Add batch codes to all products. Verify traceability of existing codes."),
        yn("Net quantity/weight declarations accurate", "Verify weights. Correct any inaccurate declarations."),
        yn("Storage instructions correct and clear", "Update storage instructions. Ensure they match actual requirements."),
        yn("Business name and address on label", "Add or correct business details on labels."),
        yn("Country of origin stated where required", "Add country of origin where legally required."),
        yn("Nutritional information present and accurate", "Update nutritional information. Verify against lab analysis."),
        yn("Labels match current approved product specifications", "Update labels to match current specs. Remove non-compliant labels."),
        yn("Label stock controlled — no obsolete versions in use", "Remove obsolete labels from stock. Destroy to prevent accidental use."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_non_conformance_corrective_action_review",
    name: "SALSA Non-Conformance & Corrective Action Review",
    description:
      "Monthly review of non-conformances and corrective actions per SALSA Issue 6. Ensures all NCs are recorded, root cause analysed, corrective actions completed, and trends monitored.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "monthly",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    recurrencePattern: {
      default_checklist_items: [
        yn("All non-conformances recorded with clear descriptions", "Record outstanding NCs with full details. Include date, location, and description."),
        yn("Root cause analysis completed for each NC", "Complete root cause analysis. Use 5-Whys or fishbone method."),
        yn("Corrective actions assigned with responsible person and due date", "Assign corrective actions. Set realistic deadlines."),
        yn("Overdue corrective actions escalated to management", "Escalate overdue actions now. Agree revised deadlines with management."),
        yn("Completed corrective actions verified as effective", "Verify effectiveness of closed actions. Reopen if issue persists."),
        yn("Customer complaints logged and investigated", "Log outstanding complaints. Complete investigation within 5 working days."),
        yn("Trends analysed — recurring NCs identified", "Review NC data for patterns. Create preventive action plan for recurring issues."),
        yn("Preventive actions implemented for systemic issues", "Implement preventive measures. Monitor for effectiveness."),
        yn("NC register accessible and up to date", "Update NC register. Ensure all staff know where to find it."),
        yn("Staff aware of how to report non-conformances", "Brief staff on NC reporting procedure. Display reporting steps."),
      ]
    },
  }),
  buildComplianceTemplate({
    slug: "salsa_food_defence_security_assessment",
    name: "SALSA Food Defence & Site Security Assessment",
    description:
      "Annual food defence and site security assessment per SALSA Issue 6 (new requirement). Covers access control, visitor management, food security plan, and deliberate contamination prevention.",
    category: TaskCategory.FOOD_SAFETY,
    auditCategory: "food_safety",
    frequency: "annually",
    dayparts: ["anytime"],
    assignedRole: "manager",
    evidenceTypes: ["yes_no_checklist", "text_note", "document_upload"],
    complianceStandard: "SALSA Issue 6",
    isCritical: true,
    workflowType: "checklist_verify",
    workflowConfig: {
      verificationRules: { requiresSignature: true },
    },
    recurrencePattern: {
      default_checklist_items: [
        yn("Food defence/security plan documented and current", "Create or update food defence plan. Include all required sections."),
        yn("Site access controlled — visitors signed in and supervised", "Implement visitor sign-in procedure. Ensure supervision at all times.", true),
        yn("Unauthorised access prevention measures in place", "Review access controls. Install locks or access systems where needed.", true),
        yn("Storage areas secured when not in use", "Lock storage areas. Issue keys only to authorised staff.", true),
        yn("Staff aware of food defence procedures and reporting", "Brief all staff on food defence. Explain suspicious activity reporting."),
        yn("Incoming goods checked for signs of tampering", "Inspect all deliveries for tampering. Report suspect items immediately.", true),
        yn("Water supply secure and tested where applicable", "Verify water supply security. Schedule testing if applicable.", true),
        yn("Cyber security measures in place for digital systems", "Review cyber security. Ensure passwords are strong and access is controlled."),
        yn("Incident response plan covers deliberate contamination", "Review incident plan. Ensure contamination response is documented.", true),
        yn("Food defence assessment reviewed within last 12 months", "Schedule next review. Set calendar reminder for 12 months."),
      ]
    },
  }),
]

export const COMPLIANCE_MODULE_TEMPLATES = COMPLIANCE_MODULE_TEMPLATES_V2

export const COMPLIANCE_MODULE_SLUGS = COMPLIANCE_MODULE_TEMPLATES.map(
  (template) => template.slug
)

export function getAllTemplates(): ComplianceTemplate[] {
  return COMPLIANCE_MODULE_TEMPLATES
}

