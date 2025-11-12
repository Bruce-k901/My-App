-- ============================================================================
-- Seed Script: seed_compliance_templates_v2.sql
-- Description: Seeds the 12 feature-module compliance templates
-- ============================================================================
begin;

create temporary table tmp_template_ids on commit drop as
select id
from public.task_templates
where company_id is null
  and slug = any(array[
    'fridge-freezer-temperature-check',
    'hot_holding_temperature_verification',
    'weekly_pest_control_inspection',
    'fire_alarm_test_weekly',
    'first_aid_kit_inspection',
    'fire_extinguisher_inspection',
    'extraction_system_contractor_verification',
    'lighting_inspection',
    'workplace_inspection',
    'training_records_review',
    'training_compliance_management',
    'food_labelling_audit'
  ]);

delete from public.template_fields
where template_id in (select id from tmp_template_ids);

delete from public.template_repeatable_labels
where template_id in (select id from tmp_template_ids);

delete from public.task_templates
where id in (select id from tmp_template_ids);

-- 1. Fridge/Freezer Temperature Check
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions, triggers_contractor_on_failure, contractor_type
) values (
  null,
  'Fridge/Freezer Temperature Check',
  'fridge-freezer-temperature-check',
  'Daily temperature monitoring for all chilled and frozen storage units with escalation for out-of-range readings.',
  'food_safety',
  'food_safety',
  'daily',
  'before_open',
  array['before_open','during_service','after_service'],
  'kitchen_manager',
  'Food Safety Act / HACCP',
  true,
  true,
  true,
  array['temperature','checklist'],
  'Ensure all chilled/frozen equipment remains within safe limits. Escalate any failures immediately.',
  true,
  'equipment_repair'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'temperature', 'number', 'Temperature (°C)', true, 1, 'Record the measured temperature'
from public.task_templates where slug = 'fridge-freezer-temperature-check';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'status', 'pass_fail', 'Within Safe Range?', true, 2, 'Fail if outside the validated range, triggers follow-up'
from public.task_templates where slug = 'fridge-freezer-temperature-check';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'notes', 'text', 'Notes / Corrective Actions', false, 3, 'Document any corrective steps when temperatures are out of range'
from public.task_templates where slug = 'fridge-freezer-temperature-check';

-- 2. Hot Holding Temperature Verification
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions, triggers_contractor_on_failure
) values (
  null,
  'Hot Holding Temperature Verification',
  'hot_holding_temperature_verification',
  'During-service verification that hot holding equipment maintains safe temperatures above 63°C.',
  'food_safety',
  'food_safety',
  'daily',
  'during_service',
  array['during_service'],
  'BOH',
  'Food Safety Act 1990',
  true,
  true,
  true,
  array['temperature','text_note'],
  'Check every hot holding station and document any failures immediately.',
  true
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'station', 'select', 'Service Station', true, 1, 'Select the station being checked'
from public.task_templates where slug = 'hot_holding_temperature_verification';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'temperature', 'number', 'Temperature (°C)', true, 2, 'Verify temperature is maintained above 63°C'
from public.task_templates where slug = 'hot_holding_temperature_verification';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'in_range', 'pass_fail', 'Above 63°C?', true, 3, 'Fail if temperature drops below the safe limit'
from public.task_templates where slug = 'hot_holding_temperature_verification';

-- 3. Weekly Pest Control Device Inspection
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions, triggers_contractor_on_failure, contractor_type
) values (
  null,
  'Weekly Pest Control Device Inspection',
  'weekly_pest_control_inspection',
  'Inspect all pest control devices and log findings with immediate escalation for activity.',
  'food_safety',
  'food_safety',
  'weekly',
  '07:00',
  array['before_open'],
  'manager',
  'Food Safety Act 1990',
  true,
  true,
  true,
  array['pass_fail','photo','text_note'],
  'Inspect traps, bait stations, and high-risk zones. Document findings and escalate issues.',
  true,
  'pest_control'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_assessment', 'pass_fail', 'Overall Assessment', true, 1, 'Fail if any signs of pest activity are found'
from public.task_templates where slug = 'weekly_pest_control_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'notes', 'text', 'Observations / Actions', false, 2, 'Document key findings and corrective actions'
from public.task_templates where slug = 'weekly_pest_control_inspection';

-- 4. Weekly Fire Alarm Test
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions, triggers_contractor_on_failure, contractor_type
) values (
  null,
  'Weekly Fire Alarm Test',
  'fire_alarm_test_weekly',
  'Weekly testing of fire alarms and emergency lighting. Escalate faults immediately.',
  'h_and_s',
  'fire_safety',
  'weekly',
  '09:00',
  array['before_open'],
  'manager',
  'Fire Safety Order 2005',
  true,
  true,
  true,
  array['pass_fail','text_note','photo'],
  'Warn staff, activate a different call point each week, verify audibility, record the test.',
  true,
  'fire_engineer'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'test_date', 'date', 'Test Date', true, 1, 'Date the fire alarm test was performed'
from public.task_templates where slug = 'fire_alarm_test_weekly';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'call_point', 'text', 'Call Point Tested', true, 2, 'Identify the call point tested this week'
from public.task_templates where slug = 'fire_alarm_test_weekly';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'alarm_operational', 'pass_fail', 'Alarm Activated?', true, 3, 'Fail if alarm did not activate'
from public.task_templates where slug = 'fire_alarm_test_weekly';

-- 5. Weekly First Aid Kit Inspection
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions
) values (
  null,
  'Weekly First Aid Kit Inspection',
  'first_aid_kit_inspection',
  'Weekly inspection of first aid kits to ensure compliance with First Aid regulations.',
  'h_and_s',
  'health_safety',
  'weekly',
  '07:00',
  array['before_open'],
  'manager',
  'Health and Safety (First-Aid) Regulations 1981',
  true,
  true,
  true,
  array['pass_fail','text_note','photo'],
  'Confirm kits are fully stocked, in-date, and accessible. Restock immediately after any use.'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'inspection_date', 'date', 'Inspection Date', true, 1, 'Date the kit was inspected'
from public.task_templates where slug = 'first_aid_kit_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'kit_location', 'text', 'Kit Location', true, 2, 'List the kit or area checked'
from public.task_templates where slug = 'first_aid_kit_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_assessment', 'pass_fail', 'Kit Fully Stocked & In Date', true, 3, 'Fail if any items missing or expired'
from public.task_templates where slug = 'first_aid_kit_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'notes', 'text', 'Notes / Actions', false, 4, 'Document any restocking or follow-up needed'
from public.task_templates where slug = 'first_aid_kit_inspection';

-- 6. Monthly Fire Extinguisher Inspection
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions, triggers_contractor_on_failure, contractor_type
) values (
  null,
  'Monthly Fire Extinguisher Inspection',
  'fire_extinguisher_inspection',
  'Visual inspection of fire extinguishers for accessibility, condition, and charge.',
  'fire',
  'fire_safety',
  'monthly',
  '07:00',
  array['before_open'],
  'manager',
  'Regulatory Reform (Fire Safety) Order 2005',
  true,
  true,
  true,
  array['pass_fail','text_note'],
  'Inspect each extinguisher, check pressure, seals, and access. Log any faults.',
  true,
  'fire_safety'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'extinguisher_location', 'text', 'Extinguisher Location', true, 1, 'Location of the extinguisher inspected'
from public.task_templates where slug = 'fire_extinguisher_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'pressure_ok', 'pass_fail', 'Pressure Gauge in Green Zone', true, 2, 'Fail if gauge not green'
from public.task_templates where slug = 'fire_extinguisher_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'seal_intact', 'pass_fail', 'Safety Pin and Seal Intact', true, 3, 'Fail if tamper seal broken'
from public.task_templates where slug = 'fire_extinguisher_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_assessment', 'pass_fail', 'Extinguisher Ready for Use?', true, 4, 'Fail if any issues present'
from public.task_templates where slug = 'fire_extinguisher_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'fault_details', 'text', 'Fault Details / Actions', false, 5, 'Describe any issues found and actions taken'
from public.task_templates where slug = 'fire_extinguisher_inspection';

-- 7. Extraction System Contractor Verification
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions, triggers_contractor_on_failure, contractor_type
) values (
  null,
  'Extraction System Contractor Verification',
  'extraction_system_contractor_verification',
  'Verify extraction system professional service, capture contractor details, and upload certificates.',
  'h_and_s',
  'health_safety',
  'monthly',
  'before_open',
  array['before_open'],
  'manager',
  'Health and Safety at Work Act 1974',
  true,
  true,
  true,
  array['text_note','pass_fail'],
  'Confirm the service was completed by a qualified contractor, capture evidence, and set next due date.',
  true,
  'duct_cleaning'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'verification_date', 'date', 'Verification Date', true, 1, 'Date the service verification was completed'
from public.task_templates where slug = 'extraction_system_contractor_verification';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'contractor_company', 'text', 'Contractor Company', true, 2, 'Name of the contractor providing the service'
from public.task_templates where slug = 'extraction_system_contractor_verification';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'service_date', 'date', 'Service Date', true, 3, 'Date when professional service was performed'
from public.task_templates where slug = 'extraction_system_contractor_verification';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'notes', 'text', 'Service Notes / Evidence', false, 4, 'Record certificate details or follow-up actions'
from public.task_templates where slug = 'extraction_system_contractor_verification';

-- 8. Weekly Lighting Inspection
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions, triggers_contractor_on_failure, contractor_type
) values (
  null,
  'Weekly Lighting Inspection',
  'lighting_inspection',
  'Check venue lighting is operational; raise electrical callouts for unresolved faults.',
  'h_and_s',
  'health_safety',
  'weekly',
  '07:00',
  array['before_open'],
  'manager',
  'Workplace (Health, Safety and Welfare) Regulations 1992',
  false,
  true,
  true,
  array['text_note','pass_fail'],
  'Inspect all areas for lighting faults, replace bulbs if safe, and escalate electrical issues.',
  true,
  'electrical'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'inspection_date', 'date', 'Inspection Date', true, 1, 'Date the lighting inspection was performed'
from public.task_templates where slug = 'lighting_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'inspected_area', 'text', 'Area Inspected', true, 2, 'Area checked for lighting faults'
from public.task_templates where slug = 'lighting_inspection';

-- 9. Monthly Health & Safety Workplace Inspection
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions, triggers_contractor_on_failure, contractor_type
) values (
  null,
  'Monthly Health & Safety Workplace Inspection',
  'workplace_inspection',
  'Comprehensive safety walkthrough covering kitchen, FOH, staff welfare, and fire safety requirements.',
  'h_and_s',
  'health_safety',
  'monthly',
  '07:00',
  array['before_open'],
  'manager',
  'Health and Safety at Work Act 1974',
  true,
  true,
  true,
  array['text_note','pass_fail','photo'],
  'Conduct a full venue inspection, document hazards, assign corrective actions, and follow up on critical issues.',
  true,
  'safety_consultant'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'inspection_date', 'date', 'Inspection Date', true, 1, 'Date the inspection took place'
from public.task_templates where slug = 'workplace_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'inspected_by', 'text', 'Inspected By', true, 2, 'Manager responsible for the inspection'
from public.task_templates where slug = 'workplace_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_assessment', 'pass_fail', 'Overall Workplace Safe?', true, 3, 'Fail if any critical hazards remain unresolved'
from public.task_templates where slug = 'workplace_inspection';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'notes', 'text', 'Notes / Corrective Actions', false, 4, 'Document observations and assigned follow-up actions'
from public.task_templates where slug = 'workplace_inspection';

-- 10. Monthly Training Compliance Review
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions
) values (
  null,
  'Monthly Training Compliance Review',
  'training_records_review',
  'Review staff training records, update certificate expiries, and plan refresher training for gaps.',
  'compliance',
  'health_safety',
  'monthly',
  '09:00',
  array['anytime'],
  'manager',
  'Health and Safety at Work Act 1974',
  true,
  true,
  true,
  array['text_note','pass_fail'],
  'Review the live training matrix, identify gaps, and schedule necessary refresher training.'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'review_date', 'date', 'Compliance Review Date', true, 1, 'Date of the training compliance review'
from public.task_templates where slug = 'training_records_review';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'review_summary', 'text', 'Review Summary', true, 2, 'Summarise key findings and planned actions'
from public.task_templates where slug = 'training_records_review';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'bookings_required', 'text', 'Training Bookings Required', false, 3, 'Record refresher sessions needed and booking plans'
from public.task_templates where slug = 'training_records_review';

-- 11. Training Compliance Management
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions
) values (
  null,
  'Training Compliance Management',
  'training_compliance_management',
  'Manage training matrix data, summarise expiring certificates, and log follow-up actions.',
  'compliance',
  'health_safety',
  'monthly',
  '09:00',
  array['anytime'],
  'manager',
  'Health and Safety at Work Act 1974',
  true,
  true,
  true,
  array['text_note','pass_fail','repeatable_record'],
  'Review the live training matrix, capture expiring certificates, and plan bookings for gaps.'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'matrix_review', 'text', 'Matrix Review Summary', true, 1, 'Summarise key risks and actions from the matrix'
from public.task_templates where slug = 'training_compliance_management';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'expiring_certificates', 'text', 'Certificates Expiring Soon', true, 2, 'List certificates expiring within the next 2 months'
from public.task_templates where slug = 'training_compliance_management';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'bookings_planned', 'text', 'Training Bookings Planned', false, 3, 'Document refresher or new bookings arranged'
from public.task_templates where slug = 'training_compliance_management';

-- 12. Food Labelling & Dating Compliance Audit
insert into public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency,
  time_of_day, dayparts, assigned_to_role, compliance_standard,
  is_critical, is_template_library, is_active, evidence_types,
  instructions
) values (
  null,
  'Food Labelling & Dating Compliance Audit',
  'food_labelling_audit',
  'Comprehensive audit of food labelling, shelf-life controls, and FIFO adherence across the venue.',
  'food_safety',
  'food_safety',
  'weekly',
  '07:00',
  array['before_open'],
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations',
  true,
  true,
  true,
  array['text_note','pass_fail'],
  'Audit labelling accuracy, shelf-life limits, and stock rotation controls; remove out-of-date items immediately.'
);

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'audit_date', 'date', 'Audit Date', true, 1, 'Date the labelling audit was conducted'
from public.task_templates where slug = 'food_labelling_audit';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'issues_found', 'text', 'Issues Found', false, 2, 'Document any labelling or shelf-life issues'
from public.task_templates where slug = 'food_labelling_audit';

insert into public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'corrective_actions', 'text', 'Corrective Actions', false, 3, 'Record actions taken to resolve issues'
from public.task_templates where slug = 'food_labelling_audit';

commit;
