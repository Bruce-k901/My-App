-- ============================================================================
-- Migration: Raw vs Ready-to-Eat Food Separation Audit Template
-- Description: Daily audit to prevent cross-contamination through proper storage separation
-- ============================================================================

begin;

-- Clean up ALL existing templates with similar names/slugs (including relic templates)
-- This removes old EHO import templates and any duplicates

-- Remove template fields for all potential duplicates/relics
delete from template_fields
where template_id in (
  select id from task_templates
  where (
    -- Exact slug match
    (company_id is null and slug = 'raw_rte_separation_audit')
    -- Or old EHO import slugs
    OR slug = 'separate-raw-and-ready-to-eat-foods-7'
    OR slug LIKE '%separate%raw%ready%'
    OR slug LIKE '%raw%rte%'
    -- Or similar names (case insensitive)
    OR (name ILIKE '%raw%ready%to%eat%' AND slug != 'raw_rte_separation_audit')
    OR (name ILIKE '%separation%raw%' AND slug != 'raw_rte_separation_audit')
  )
);

-- Remove repeatable labels
delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where (
    (company_id is null and slug = 'raw_rte_separation_audit')
    OR slug = 'separate-raw-and-ready-to-eat-foods-7'
    OR slug LIKE '%separate%raw%ready%'
    OR slug LIKE '%raw%rte%'
    OR (name ILIKE '%raw%ready%to%eat%' AND slug != 'raw_rte_separation_audit')
    OR (name ILIKE '%separation%raw%' AND slug != 'raw_rte_separation_audit')
  )
);

-- Remove the templates themselves (including the correct one if it exists, so we can recreate it properly)
delete from task_templates
where (
  (company_id is null and slug = 'raw_rte_separation_audit')
  OR slug = 'separate-raw-and-ready-to-eat-foods-7'
  OR slug LIKE '%separate%raw%ready%'
  OR slug LIKE '%raw%rte%'
  OR (name ILIKE '%raw%ready%to%eat%' AND slug != 'raw_rte_separation_audit')
  OR (name ILIKE '%separation%raw%' AND slug != 'raw_rte_separation_audit')
);

-- Create the template (always create, even if it was just deleted above)
insert into task_templates (
  company_id,
  name,
  slug,
  description,
  category,
  audit_category,
  frequency,
  time_of_day,
  dayparts,
  recurrence_pattern,
  assigned_to_role,
  compliance_standard,
  is_critical,
  is_template_library,
  is_active,
  evidence_types,
  instructions,
  repeatable_field_name,
  asset_type,
  requires_sop,
  triggers_contractor_on_failure,
  contractor_type
) values (
  null, -- Global template available to all companies
  'Separation Audit: Raw vs Ready-to-Eat Foods',
  'raw_rte_separation_audit',
  'Daily audit to verify proper separation between raw and ready-to-eat foods in all storage areas. Prevents cross-contamination through correct storage organization, color-coding, and physical barriers.',
  'food_safety',
  'food_safety',
  'daily',
  '07:00',
  array['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Raw meats stored BELOW cooked/ready-to-eat items',
      'Drip trays present under raw meat storage',
      'Color-coded containers used correctly',
      'Dedicated utensils for raw vs ready-to-eat',
      'Physical barriers between zones where needed'
    )
  ),
  'kitchen_manager',
  'Food Safety Act 1990, Food Hygiene Regulations, HACCP',
  true, -- Critical compliance task (high cross-contamination risk)
  true, -- Library template
  true, -- Active
  array['yes_no_checklist', 'photo'], -- Yes/No checklist with photo evidence
  'Conduct a systematic audit of storage areas to ensure proper separation between raw and ready-to-eat foods. Check storage organization, verify correct stacking order (raw below RTE), confirm color-coding systems, and inspect for physical barriers. Document any failures with before/after photos. Critical issues require immediate reorganization and re-check within 2 hours.',
  null, -- NO asset selection (repeatable_field_name = NULL)
  null, -- NO asset type filter
  true, -- Requires SOP link
  false, -- Does not trigger contractor (internal corrective action)
  null
);

-- ============================================================================
-- Template Fields (Yes/No Checklist Items)
-- ============================================================================

-- Audit Information
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'audit_date', 'date', 'Audit Date', true, 1,
  'Date when the separation audit was completed.'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'auditor_name', 'text', 'Auditor Name', true, 2,
  'Name of the person conducting the separation audit.',
  'e.g., John Smith'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Storage Location Selection
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'storage_location', 'select', 'Storage Location', true, 3,
  'Select the storage area being audited.',
  jsonb_build_array(
    jsonb_build_object('value', 'walk_in_refrigerator', 'label', 'Walk-in Refrigerator'),
    jsonb_build_object('value', 'prep_line_refrigerator', 'label', 'Prep Line Refrigerator'),
    jsonb_build_object('value', 'sandwich_deli_counter', 'label', 'Sandwich/Deli Counter'),
    jsonb_build_object('value', 'display_refrigerator', 'label', 'Display Refrigerator'),
    jsonb_build_object('value', 'freezer_storage', 'label', 'Freezer Storage'),
    jsonb_build_object('value', 'other', 'label', 'Other Storage Area')
  )
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Refrigerator Asset Selection (for tracking specific units)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'refrigerator_unit', 'text', 'Refrigerator Unit ID/Name', false, 4,
  'Enter the specific refrigerator unit identifier or name for asset tracking.',
  'e.g., Walk-in Chiller #1, Prep Fridge A, Display Fridge Main'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Overall Assessment (Pass/Fail for overall compliance)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_separation_compliant', 'pass_fail', 'Overall Separation Compliance', true, 5,
  'Pass: All separation criteria met. Fail: One or more failures found requiring corrective action. Failures will trigger monitor/callout workflow.'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions in the task completion modal

-- Severity Assessment (if failure)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'severity_level', 'select', 'Severity Level (if failure)', false, 6,
  'Select the severity level if any failures were found.',
  jsonb_build_array(
    jsonb_build_object('value', 'minor', 'label', 'Minor: Incorrect container color'),
    jsonb_build_object('value', 'major', 'label', 'Major: Raw above ready-to-eat in same unit'),
    jsonb_build_object('value', 'critical', 'label', 'Critical: Direct contact between raw and ready-to-eat')
  )
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Immediate Actions
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'immediate_actions', 'text', 'Immediate Corrective Actions Taken', false, 7,
  'Document all immediate actions taken to resolve separation issues (e.g., reorganization, staff briefing).',
  'e.g., Reorganized walk-in fridge - moved raw chicken to bottom shelf, separated from ready-to-eat salads. Briefed prep team on correct storage procedures.'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Re-check Required
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'recheck_required', 'pass_fail', 'Re-check Required (Critical Issues)', false, 8,
  'YES: Re-check completed within 2 hours for critical issues. NO: Re-check still pending.'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'recheck_time', 'text', 'Re-check Time (if required)', false, 9,
  'Enter the time when re-check was completed (for critical issues).',
  'e.g., 09:30'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Escalation
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'manager_notified', 'pass_fail', 'Kitchen Manager Notified (Major/Critical)', false, 10,
  'YES: Kitchen manager has been notified of major or critical issues. NO: Notification pending or not required.'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Staff Retraining
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'retraining_required', 'pass_fail', 'Staff Retraining Required', false, 11,
  'YES: Staff retraining has been scheduled or completed. NO: Retraining not required or pending.'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'retraining_details', 'text', 'Retraining Details', false, 12,
  'Document retraining actions taken or scheduled.',
  'e.g., Briefed all prep staff on separation procedures. Scheduled formal training session for Friday.'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Notes
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'audit_notes', 'text', 'Additional Notes', false, 13,
  'Any additional observations or notes from the audit.',
  'e.g., Overall good compliance. Minor color-coding issue addressed immediately.'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

-- Photo Evidence (Required for each storage area)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'before_photos', 'photo', 'Before Photos (if failure)', false, 14,
  'Upload photos showing the separation issues found (mandatory for failures).'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'after_photos', 'photo', 'After Photos (corrective action)', false, 15,
  'Upload photos showing the corrected storage organization (mandatory for failures).'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'compliance_photos', 'photo', 'Compliance Photos (if passing)', false, 16,
  'Upload photos showing correct separation and storage organization (good practice documentation).'
from task_templates where company_id is null and slug = 'raw_rte_separation_audit';

commit;

