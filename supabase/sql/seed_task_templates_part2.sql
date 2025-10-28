-- Seed Task Templates Part 2: Fire & Security, Cleaning, Compliance

-- ============================================================================
-- FIRE & SECURITY TEMPLATES (3)
-- ============================================================================

-- FR-001: Fire Alarm Test - Weekly
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, is_critical,
  is_template_library, is_active
) VALUES (
  'FR-001: Fire Alarm Test - Weekly',
  'fr001_fire_alarm_test',
  'Weekly fire alarm functionality test per Fire Safety Order 2005.',
  'fire',
  'weekly',
  ARRAY['anytime'],
  'duty_manager',
  'Fire Safety Order 2005',
  'fire',
  ARRAY['pass_fail'],
  true,
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'test_date', 'Test Date', 'date', true, 1
FROM task_templates WHERE slug = 'fr001_fire_alarm_test';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order, help_text)
SELECT id, 'test_point_activated', 'Test Point Activated', 'text', true, 2, 'Which alarm point was tested?'
FROM task_templates WHERE slug = 'fr001_fire_alarm_test';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'alarm_activated', 'Alarm Activated', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'fr001_fire_alarm_test';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'all_staff_heard', 'All Staff Heard', 'pass_fail', true, 4
FROM task_templates WHERE slug = 'fr001_fire_alarm_test';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'issues', 'Issues', 'text', false, 5
FROM task_templates WHERE slug = 'fr001_fire_alarm_test';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'manager_initials', 'Manager Initials', 'text', true, 6
FROM task_templates WHERE slug = 'fr001_fire_alarm_test';

-- FR-002: Emergency Exit & Assembly Point Check
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, is_critical,
  is_template_library, is_active
) VALUES (
  'FR-002: Emergency Exit & Assembly Point Check',
  'fr002_emergency_exit_check',
  'Verify emergency exits and assembly points are accessible and properly marked.',
  'fire',
  'monthly',
  ARRAY['anytime'],
  'duty_manager',
  'Fire Safety Order 2005',
  'fire',
  ARRAY['photo', 'pass_fail'],
  true,
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'all_exits_accessible', 'All Exits Accessible', 'pass_fail', true, 1
FROM task_templates WHERE slug = 'fr002_emergency_exit_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'signage_visible_legible', 'Signage Visible & Legible', 'pass_fail', true, 2
FROM task_templates WHERE slug = 'fr002_emergency_exit_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'assembly_point_clear', 'Assembly Point Clear', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'fr002_emergency_exit_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'emergency_lighting_working', 'Emergency Lighting Working', 'pass_fail', true, 4
FROM task_templates WHERE slug = 'fr002_emergency_exit_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'photo_evidence', 'Photo Evidence', 'photo', true, 5
FROM task_templates WHERE slug = 'fr002_emergency_exit_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'issues_found', 'Issues Found', 'text', false, 6
FROM task_templates WHERE slug = 'fr002_emergency_exit_check';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'manager_initials', 'Manager Initials', 'text', true, 7
FROM task_templates WHERE slug = 'fr002_emergency_exit_check';

-- FR-003: Fire Extinguisher Inspection - Visual
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, repeatable_field_name,
  is_template_library, is_active
) VALUES (
  'FR-003: Fire Extinguisher Inspection - Visual',
  'fr003_fire_extinguisher',
  'Visual inspection of all fire extinguishers on premises.',
  'fire',
  'monthly',
  ARRAY['anytime'],
  'duty_manager',
  'Fire Safety Order 2005',
  'fire',
  ARRAY['photo', 'pass_fail', 'text_note'],
  'extinguisher_location',
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'location', 'Location', 'select', true, 1
FROM task_templates WHERE slug = 'fr003_fire_extinguisher';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order, help_text)
SELECT id, 'extinguisher_type', 'Extinguisher Type', 'text', true, 2, 'CO2, water, powder, foam'
FROM task_templates WHERE slug = 'fr003_fire_extinguisher';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'last_service_date', 'Last Service Date', 'date', true, 3
FROM task_templates WHERE slug = 'fr003_fire_extinguisher';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'next_service_due', 'Next Service Due', 'date', true, 4
FROM task_templates WHERE slug = 'fr003_fire_extinguisher';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'pressure_gauge_ok', 'Pressure Gauge OK', 'pass_fail', true, 5
FROM task_templates WHERE slug = 'fr003_fire_extinguisher';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'physical_damage', 'Physical Damage', 'pass_fail', true, 6
FROM task_templates WHERE slug = 'fr003_fire_extinguisher';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'manager_initials', 'Manager Initials', 'text', true, 7
FROM task_templates WHERE slug = 'fr003_fire_extinguisher';

INSERT INTO public.task_repeatable_labels (task_template_id, label_text, display_order)
SELECT id, 'Kitchen - Near Hob', 1 FROM task_templates WHERE slug = 'fr003_fire_extinguisher'
UNION ALL
SELECT id, 'Front of House - Bar Area', 2 FROM task_templates WHERE slug = 'fr003_fire_extinguisher'
UNION ALL
SELECT id, 'Front Entrance', 3 FROM task_templates WHERE slug = 'fr003_fire_extinguisher'
UNION ALL
SELECT id, 'Back Office', 4 FROM task_templates WHERE slug = 'fr003_fire_extinguisher';

-- ============================================================================
-- CLEANING & MAINTENANCE TEMPLATES (3)
-- ============================================================================

-- CL-001: FOH Deep Clean Checklist - Daily Post-Service
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types,
  is_template_library, is_active
) VALUES (
  'CL-001: FOH Deep Clean Checklist - Daily Post-Service',
  'cl001_foh_deep_clean',
  'Comprehensive front of house cleaning checklist post-service.',
  'cleaning',
  'daily',
  ARRAY['after_service'],
  'floor_manager',
  'Environmental Health',
  'cleanliness',
  ARRAY['pass_fail'],
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'tables_chairs_cleaned', 'Tables & Chairs Cleaned', 'pass_fail', true, 1
FROM task_templates WHERE slug = 'cl001_foh_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'floor_swept_mopped', 'Floor Swept & Mopped', 'pass_fail', true, 2
FROM task_templates WHERE slug = 'cl001_foh_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'toilets_cleaned', 'Toilets Cleaned', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'cl001_foh_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'bar_area_wiped', 'Bar Area Wiped', 'pass_fail', true, 4
FROM task_templates WHERE slug = 'cl001_foh_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'bins_emptied', 'Bins Emptied', 'pass_fail', true, 5
FROM task_templates WHERE slug = 'cl001_foh_deep_clean';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'cleaner_initials', 'Cleaner Initials', 'text', true, 6
FROM task_templates WHERE slug = 'cl001_foh_deep_clean';

-- CL-002: Pest Control Log & Trap Check
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types,
  is_template_library, is_active
) VALUES (
  'CL-002: Pest Control Log & Trap Check',
  'cl002_pest_control',
  'Weekly pest control trap inspection and log.',
  'cleaning',
  'weekly',
  ARRAY['anytime'],
  'manager',
  'Food Safety Act',
  'food_safety',
  ARRAY['pass_fail', 'text_note', 'photo'],
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'check_date', 'Check Date', 'date', true, 1
FROM task_templates WHERE slug = 'cl002_pest_control';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'traps_inspected', 'Traps Inspected', 'pass_fail', true, 2
FROM task_templates WHERE slug = 'cl002_pest_control';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'evidence_found', 'Evidence Found', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'cl002_pest_control';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'evidence_description', 'Evidence Description', 'text', false, 4
FROM task_templates WHERE slug = 'cl002_pest_control';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'action_taken', 'Action Taken', 'text', false, 5
FROM task_templates WHERE slug = 'cl002_pest_control';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'checked_by_initials', 'Checked By (Initials)', 'text', true, 6
FROM task_templates WHERE slug = 'cl002_pest_control';

-- CL-003: Equipment PPM - Chiller/Freezer Unit
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, triggers_contractor_on_failure,
  contractor_type, is_template_library, is_active
) VALUES (
  'CL-003: Equipment PPM - Chiller/Freezer Unit',
  'cl003_equipment_ppm',
  'Quarterly preventative maintenance for chiller/freezer units.',
  'cleaning',
  'monthly',
  ARRAY['anytime'],
  'facilities_manager',
  'Manufacturer maintenance',
  'maintenance',
  ARRAY['text_note', 'photo'],
  true,
  'equipment_repair',
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'equipment_id', 'Equipment ID', 'text', true, 1
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'service_date', 'Service Date', 'date', true, 2
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'engineer_name', 'Engineer Name', 'text', true, 3
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'coils_cleaned', 'Coils Cleaned', 'pass_fail', true, 4
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'doors_sealing', 'Doors Sealing', 'pass_fail', true, 5
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'temperature_calibrated', 'Temperature Calibrated', 'pass_fail', true, 6
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'drainage_clear', 'Drainage Clear', 'pass_fail', true, 7
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'issues_found', 'Issues Found', 'text', false, 8
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'next_service_due', 'Next Service Due', 'date', true, 9
FROM task_templates WHERE slug = 'cl003_equipment_ppm';

-- ============================================================================
-- COMPLIANCE & AUDIT TEMPLATES (3)
-- ============================================================================

-- CP-001: Monthly Compliance Audit - Self-Assessment
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types, is_critical,
  is_template_library, is_active
) VALUES (
  'CP-001: Monthly Compliance Audit - Self-Assessment',
  'cp001_monthly_audit',
  'Comprehensive monthly self-assessment audit covering all compliance areas.',
  'compliance',
  'monthly',
  ARRAY['anytime'],
  'duty_manager',
  'HACCP',
  'compliance',
  ARRAY['text_note', 'photo', 'pass_fail'],
  true,
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, min_value, max_value, display_order)
SELECT id, 'food_safety_score', 'Food Safety Score', 'number', true, 0, 100, 1
FROM task_templates WHERE slug = 'cp001_monthly_audit';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, min_value, max_value, display_order)
SELECT id, 'health_safety_score', 'Health & Safety Score', 'number', true, 0, 100, 2
FROM task_templates WHERE slug = 'cp001_monthly_audit';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, min_value, max_value, display_order)
SELECT id, 'fire_safety_score', 'Fire Safety Score', 'number', true, 0, 100, 3
FROM task_templates WHERE slug = 'cp001_monthly_audit';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, min_value, max_value, display_order)
SELECT id, 'cleanliness_score', 'Cleanliness Score', 'number', true, 0, 100, 4
FROM task_templates WHERE slug = 'cp001_monthly_audit';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'critical_issues', 'Critical Issues', 'text', false, 5
FROM task_templates WHERE slug = 'cp001_monthly_audit';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'action_plan', 'Action Plan', 'text', false, 6
FROM task_templates WHERE slug = 'cp001_monthly_audit';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'auditor_initials', 'Auditor Initials', 'text', true, 7
FROM task_templates WHERE slug = 'cp001_monthly_audit';

-- CP-002: SOP Review & Update Trigger
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types,
  is_template_library, is_active
) VALUES (
  'CP-002: SOP Review & Update Trigger',
  'cp002_sop_review',
  'Annual review and update of Standard Operating Procedures.',
  'compliance',
  'triggered',
  ARRAY['anytime'],
  'manager',
  'Risk management',
  'compliance',
  ARRAY['text_note', 'pass_fail'],
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'sop_name', 'SOP Name', 'text', true, 1
FROM task_templates WHERE slug = 'cp002_sop_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'last_review_date', 'Last Review Date', 'date', true, 2
FROM task_templates WHERE slug = 'cp002_sop_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'still_relevant', 'Still Relevant', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'cp002_sop_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'updates_made', 'Updates Made', 'text', false, 4
FROM task_templates WHERE slug = 'cp002_sop_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'version_number', 'Version Number', 'text', true, 5
FROM task_templates WHERE slug = 'cp002_sop_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'reviewed_by_initials', 'Reviewed By (Initials)', 'text', true, 6
FROM task_templates WHERE slug = 'cp002_sop_review';

-- CP-003: Training Records Review
INSERT INTO public.task_templates (
  name, slug, description, category, frequency, dayparts, assigned_to_role,
  compliance_standard, audit_category, evidence_types,
  is_template_library, is_active
) VALUES (
  'CP-003: Training Records Review',
  'cp003_training_review',
  'Quarterly review of staff training records and certifications.',
  'compliance',
  'triggered',
  ARRAY['anytime'],
  'hr_manager',
  'Staff competency',
  'compliance',
  ARRAY['text_note', 'pass_fail'],
  true,
  true
);

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'all_staff_inducted', 'All Staff Inducted', 'pass_fail', true, 1
FROM task_templates WHERE slug = 'cp003_training_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'food_safety_training_current', 'Food Safety Training Current', 'pass_fail', true, 2
FROM task_templates WHERE slug = 'cp003_training_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'manual_handling_certificates_valid', 'Manual Handling Certificates Valid', 'pass_fail', true, 3
FROM task_templates WHERE slug = 'cp003_training_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'retraining_needed', 'Retraining Needed', 'text', false, 4
FROM task_templates WHERE slug = 'cp003_training_review';

INSERT INTO public.task_fields (task_template_id, field_name, field_label, field_type, is_required, display_order)
SELECT id, 'reviewed_by_initials', 'Reviewed By (Initials)', 'text', true, 5
FROM task_templates WHERE slug = 'cp003_training_review';

COMMENT ON TABLE public.task_templates IS '18 compliance task templates fully seeded with fields and repeatable labels';

