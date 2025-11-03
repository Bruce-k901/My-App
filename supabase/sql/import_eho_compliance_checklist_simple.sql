-- EHO Compliance Checklist Import (Simple Version)
-- Generated from: EHO_Compliance_Checklist.xlsx
-- Total tasks: 34
-- Company ID: f99510bc-b290-47c6-8f12-282bea67bd91
-- 
-- Ready to run! This script will import 34 EHO compliance tasks.
-- Run this script in Supabase SQL Editor.

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Maintain documented food safety management system (HACCP or equivalent)',
  'maintain-documented-food-safety-management-system-haccp-or-equivalent-1',
  'System must be up to date and reflect actual operations',
  'food_safety',
  'Management System',
  'annually',
  'System must be up to date and reflect actual operations',
  ARRAY['HACCP Plan'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Review HACCP system for effectiveness',
  'review-haccp-system-for-effectiveness-2',
  'Annual review required or after process change',
  'food_safety',
  'Management System',
  'annually',
  'Annual review required or after process change',
  ARRAY['Review Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Ensure staff trained in food hygiene and allergens',
  'ensure-staff-trained-in-food-hygiene-and-allergens-3',
  'All food handlers trained to Level 2 or above',
  'food_safety',
  'Management System',
  'annually',
  'All food handlers trained to Level 2 or above',
  ARRAY['Training Certificates'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Check fridge/freezer temperatures',
  'check-fridge-freezer-temperatures-4',
  'Record all cold storage temperatures',
  'food_safety',
  'Handling & Storage',
  'daily',
  'Record all cold storage temperatures',
  ARRAY['Temperature Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Verify hot holding above 63°C',
  'verify-hot-holding-above-63-c-5',
  'Record during service to ensure compliance',
  'food_safety',
  'Handling & Storage',
  'daily',
  'Record during service to ensure compliance',
  ARRAY['Temperature Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Label and date all stored foods',
  'label-and-date-all-stored-foods-6',
  'All opened or prepared foods labelled with use-by date',
  'food_safety',
  'Handling & Storage',
  'daily',
  'All opened or prepared foods labelled with use-by date',
  ARRAY['Date Labels'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Separate raw and ready-to-eat foods',
  'separate-raw-and-ready-to-eat-foods-7',
  'Store raw meats below ready-to-eat foods',
  'food_safety',
  'Handling & Storage',
  'daily',
  'Store raw meats below ready-to-eat foods',
  ARRAY[]::TEXT[],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Calibrate temperature probes',
  'calibrate-temperature-probes-8',
  'Use boiling/ice water method to verify probe accuracy',
  'food_safety',
  'Handling & Storage',
  'monthly',
  'Use boiling/ice water method to verify probe accuracy',
  ARRAY['Calibration Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Follow cleaning schedule for all areas',
  'follow-cleaning-schedule-for-all-areas-9',
  'Ensure daily, weekly, deep cleaning per plan',
  'food_safety',
  'Cleaning & Premises',
  'daily',
  'Ensure daily, weekly, deep cleaning per plan',
  ARRAY['Cleaning Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Inspect pest control devices',
  'inspect-pest-control-devices-10',
  'Check traps and insectocutors, log findings',
  'food_safety',
  'Cleaning & Premises',
  'weekly',
  'Check traps and insectocutors, log findings',
  ARRAY['Pest Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Check refuse storage area cleanliness',
  'check-refuse-storage-area-cleanliness-11',
  'Ensure bins closed, area clean, no infestation',
  'food_safety',
  'Cleaning & Premises',
  'daily',
  'Ensure bins closed, area clean, no infestation',
  ARRAY[]::TEXT[],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Verify handwashing facilities operational',
  'verify-handwashing-facilities-operational-12',
  'Soap, paper towels, hot/cold water available',
  'food_safety',
  'Cleaning & Premises',
  'daily',
  'Soap, paper towels, hot/cold water available',
  ARRAY[]::TEXT[],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Deep clean kitchen and equipment',
  'deep-clean-kitchen-and-equipment-13',
  'Full strip-down and sanitation of equipment',
  'food_safety',
  'Cleaning & Premises',
  'monthly',
  'Full strip-down and sanitation of equipment',
  ARRAY['Deep Clean Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Ensure staff handwashing compliance',
  'ensure-staff-handwashing-compliance-14',
  'Supervise and record as per hygiene policy',
  'food_safety',
  'Personal Hygiene',
  'daily',
  'Supervise and record as per hygiene policy',
  ARRAY[]::TEXT[],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Check protective clothing worn and clean',
  'check-protective-clothing-worn-and-clean-15',
  'Aprons, hats, gloves where required',
  'food_safety',
  'Personal Hygiene',
  'daily',
  'Aprons, hats, gloves where required',
  ARRAY[]::TEXT[],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Log staff sickness and exclusions',
  'log-staff-sickness-and-exclusions-16',
  'Staff unfit for work must be excluded per policy',
  'food_safety',
  'Personal Hygiene',
  'triggered',
  'Staff unfit for work must be excluded per policy',
  ARRAY['Sickness Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Maintain Health & Safety Policy',
  'maintain-health-safety-policy-17',
  'Review annually and communicate updates',
  'h_and_s',
  'Policy & Organisation',
  'annually',
  'Review annually and communicate updates',
  ARRAY['H&S Policy'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Appoint competent H&S person',
  'appoint-competent-h-s-person-18',
  'Assign role in writing and maintain training',
  'h_and_s',
  'Policy & Organisation',
  'annually',
  'Assign role in writing and maintain training',
  ARRAY['Appointment Letter'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Conduct general risk assessment',
  'conduct-general-risk-assessment-19',
  'Cover all site activities and update annually',
  'h_and_s',
  'Risk Assessment',
  'annually',
  'Cover all site activities and update annually',
  ARRAY['Risk Assessment'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Review COSHH assessments',
  'review-coshh-assessments-20',
  'Ensure chemical safety data sheets are current',
  'h_and_s',
  'Risk Assessment',
  'annually',
  'Ensure chemical safety data sheets are current',
  ARRAY['COSHH Register'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Assess manual handling tasks',
  'assess-manual-handling-tasks-21',
  'Evaluate lifting tasks and provide training',
  'h_and_s',
  'Risk Assessment',
  'annually',
  'Evaluate lifting tasks and provide training',
  ARRAY['Manual Handling RA'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Conduct fire risk assessment',
  'conduct-fire-risk-assessment-22',
  'Review annually or when layout changes',
  'h_and_s',
  'Fire Safety',
  'annually',
  'Review annually or when layout changes',
  ARRAY['Fire RA'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Test fire alarms and emergency lighting',
  'test-fire-alarms-and-emergency-lighting-23',
  'Weekly tests with log record',
  'h_and_s',
  'Fire Safety',
  'weekly',
  'Weekly tests with log record',
  ARRAY['Fire Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Inspect fire extinguishers',
  'inspect-fire-extinguishers-24',
  'Visual check monthly; annual service by contractor',
  'h_and_s',
  'Fire Safety',
  'monthly',
  'Visual check monthly; annual service by contractor',
  ARRAY['Fire Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Conduct fire drill',
  'conduct-fire-drill-25',
  'Documented drill at least twice per year',
  'h_and_s',
  'Fire Safety',
  'quarterly',
  'Documented drill at least twice per year',
  ARRAY['Drill Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'PAT test electrical equipment',
  'pat-test-electrical-equipment-26',
  'All portable items tested annually',
  'h_and_s',
  'Equipment & Maintenance',
  'annually',
  'All portable items tested annually',
  ARRAY['PAT Certificates'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Service extraction and ventilation systems',
  'service-extraction-and-ventilation-systems-27',
  'Per manufacturer or biannually minimum',
  'h_and_s',
  'Equipment & Maintenance',
  'quarterly',
  'Per manufacturer or biannually minimum',
  ARRAY['Service Certificates'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Inspect flooring for slip hazards',
  'inspect-flooring-for-slip-hazards-28',
  'Repair or report damage immediately',
  'h_and_s',
  'Equipment & Maintenance',
  'weekly',
  'Repair or report damage immediately',
  ARRAY['Inspection Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Ensure lighting is operational',
  'ensure-lighting-is-operational-29',
  'Replace faulty bulbs promptly',
  'h_and_s',
  'Equipment & Maintenance',
  'weekly',
  'Replace faulty bulbs promptly',
  ARRAY[]::TEXT[],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Check first aid box contents',
  'check-first-aid-box-contents-30',
  'Restock after use, ensure supplies in date',
  'h_and_s',
  'Welfare & First Aid',
  'weekly',
  'Restock after use, ensure supplies in date',
  ARRAY['FA Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Display emergency contact list',
  'display-emergency-contact-list-31',
  'Include first aiders and emergency numbers',
  'h_and_s',
  'Welfare & First Aid',
  'quarterly',
  'Include first aiders and emergency numbers',
  ARRAY[]::TEXT[],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Record all staff safety training',
  'record-all-staff-safety-training-32',
  'Keep evidence of attendance and competence',
  'h_and_s',
  'Training & Monitoring',
  'daily',
  'Keep evidence of attendance and competence',
  ARRAY['Training Matrix'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Conduct workplace inspection',
  'conduct-workplace-inspection-33',
  'Formal walkaround using checklist',
  'h_and_s',
  'Training & Monitoring',
  'monthly',
  'Formal walkaround using checklist',
  ARRAY['Inspection Log'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);

INSERT INTO public.task_templates (
  company_id, name, slug, description, category, audit_category, frequency, 
  instructions, evidence_types, is_critical, is_active, is_template_library, created_at, updated_at
) VALUES (
  'f99510bc-b290-47c6-8f12-282bea67bd91'::UUID,
  'Report and record all incidents/near misses',
  'report-and-record-all-incidents-near-misses-34',
  'Complete incident form, investigate cause',
  'h_and_s',
  'Training & Monitoring',
  'triggered',
  'Complete incident form, investigate cause',
  ARRAY['Accident Book'],
  FALSE, TRUE, TRUE, NOW(), NOW()
);
