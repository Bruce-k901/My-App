-- ============================================================================
-- Seed: food_labelling_audit_template (sanitised)
-- ============================================================================
begin;

delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'food_labelling_audit'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'food_labelling_audit'
);

delete from task_templates
where company_id is null
  and slug = 'food_labelling_audit';

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
  triggers_contractor_on_failure,
  contractor_type
) values (
  null,
  'Food Labelling & Dating Compliance Audit',
  'food_labelling_audit',
  'Comprehensive audit of food labelling, shelf-life controls, and FIFO adherence across the venue.',
  'food_safety',
  'food_safety',
  'weekly',
  'before_open',
  array['before_open'],
  jsonb_build_object(
    'days', array[1],
    'daypart_times', jsonb_build_object('before_open','07:00'),
    'default_checklist_items', jsonb_build_array(
      'Confirm label supplies available in all prep areas',
      'Check labels show food name, prep date, and use-by date',
      'Verify allergen information present where required',
      'Ensure FIFO rotation in chilled, frozen, and dry storage',
      'Confirm prepared foods remain within safe shelf life',
      'Remove any out-of-date or unlabelled food immediately',
      'Check for signs of relabelling or altered dates',
      'Review high-risk items (cooked meats, rice, dairy)',
      'Record corrective actions and follow-up tasks'
    )
  ),
  'manager',
  'Food Safety Act 1990, Food Hygiene Regulations',
  true,
  true,
  true,
  array['text_note','pass_fail','photo'],
  'Audit food labelling, dating, and stock rotation systems. Document issues, remove non-compliant stock, and record follow-up actions.',
  null,
  false,
  null
);

-- Audit basics
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'audit_date', 'date', 'Audit Date', true, 1,
  'Date the food labelling audit was completed.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'auditor_name', 'text', 'Auditor Name', true, 2,
  'Name of the person conducting the audit.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
select id, 'areas_audited', 'select', 'Areas Audited', true, 3,
  'Select the areas covered during this audit.',
  jsonb_build_array(
    jsonb_build_object('value','main_kitchen','label','Main Kitchen'),
    jsonb_build_object('value','all_kitchen_areas','label','All Kitchen Areas'),
    jsonb_build_object('value','full_venue','label','Full Venue'),
    jsonb_build_object('value','specific_section','label','Specific Section Focus')
  )
from task_templates where company_id is null and slug = 'food_labelling_audit';

-- Label stock assessment
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'label_stock_adequate', 'pass_fail', 'Label Stock Adequate', true, 4,
  'Pass if sufficient label supplies are available across the venue.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'label_stock_notes', 'text', 'Label Stock Notes', false, 5,
  'Record any label supply issues or restocking needs.',
  'e.g., Allergen labels low in pastry section.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

-- Label content and dating
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'label_content_correct', 'pass_fail', 'Label Content Correct', true, 6,
  'Pass if labels include food name, prep date, and use-by date.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'date_format_consistent', 'pass_fail', 'Date Format Consistent', true, 7,
  'Pass if labels use consistent DD/MM/YYYY formatting.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'shelf_life_appropriate', 'pass_fail', 'Shelf Life Appropriate', true, 8,
  'Pass if use-by dates match safe shelf life guidelines.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

-- Stock rotation
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'fifo_system_working', 'pass_fail', 'FIFO System Effective', true, 9,
  'Pass if FIFO rotation is being followed across all storage areas.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'rotation_issues_found', 'text', 'Stock Rotation Issues', false, 10,
  'Describe any stock rotation problems identified.',
  'e.g., Older stock behind new deliveries in walk-in fridge.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

-- Out-of-date and unlabelled food
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'no_out_of_date_food', 'pass_fail', 'No Out-of-Date Food', true, 11,
  'Pass if no expired food was found during the audit.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'out_of_date_items', 'text', 'Out-of-Date Items', false, 12,
  'List any expired items discovered and disposal actions taken.',
  'e.g., Two salads expired yesterday, removed and logged.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'all_food_labelled', 'pass_fail', 'All Food Labelled', true, 13,
  'Pass if every item checked is correctly labelled.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

-- Tampering / food defence
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'no_tampering_evidence', 'pass_fail', 'No Signs of Tampering', true, 14,
  'Pass if there is no evidence of relabelling or altered dates.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

-- Corrective actions
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'immediate_actions_taken', 'text', 'Immediate Corrective Actions', true, 15,
  'Record immediate actions taken to resolve issues identified.',
  'e.g., Removed expired stock, restocked labels, briefed team on FIFO.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'follow_up_actions_required', 'text', 'Follow-up Actions Required', false, 16,
  'List further actions or training needed to prevent recurrence.',
  'e.g., Refresher training on labelling for night shift.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'generate_follow_up_tasks', 'pass_fail', 'Follow-up Tasks Created', true, 17,
  'Pass when follow-up tasks have been created or assigned.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

-- Overall assessment
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_compliance_met', 'pass_fail', 'Overall Compliance Met', true, 18,
  'Pass if labelling, dating, and rotation are compliant. Fail if major issues remain.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'compliance_summary', 'text', 'Compliance Summary', true, 19,
  'Provide a brief summary of findings and overall status.',
  'e.g., Good overall compliance; minor rotation issues addressed immediately.'
from task_templates where company_id is null and slug = 'food_labelling_audit';

commit;
