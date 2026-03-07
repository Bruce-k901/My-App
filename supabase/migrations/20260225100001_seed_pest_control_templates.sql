-- ============================================================================
-- Migration: Pest Control Compliance Task Templates
-- Description: Seeds monthly visit log, quarterly review, and annual
--              contract/IPM review templates for SALSA compliance
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Clean up any existing pest control review templates
    DELETE FROM public.template_fields
    WHERE template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id IS NULL AND slug IN (
        'monthly_pest_control_visit',
        'quarterly_pest_control_review',
        'annual_pest_control_contract_review'
      )
    );

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM public.template_repeatable_labels
      WHERE template_id IN (
        SELECT id FROM public.task_templates
        WHERE company_id IS NULL AND slug IN (
          'monthly_pest_control_visit',
          'quarterly_pest_control_review',
          'annual_pest_control_contract_review'
        )
      );
    END IF;

    DELETE FROM public.task_templates
    WHERE company_id IS NULL AND slug IN (
      'monthly_pest_control_visit',
      'quarterly_pest_control_review',
      'annual_pest_control_contract_review'
    );

    -- ========================================================================
    -- Template 1: Monthly Pest Control Contractor Visit Log
    -- ========================================================================

    INSERT INTO public.task_templates (
      company_id, name, slug, description, category, audit_category,
      frequency, time_of_day, dayparts,
      recurrence_pattern,
      assigned_to_role, compliance_standard, is_critical,
      is_template_library, is_active,
      evidence_types, instructions,
      requires_sop, triggers_contractor_on_failure, contractor_type
    ) VALUES (
      NULL,
      'Monthly Pest Control Contractor Visit',
      'monthly_pest_control_visit',
      'Log details from the monthly pest control contractor visit. Record findings, treatments applied, chemicals used, and any recommendations. Upload the service report.',
      'food_safety',
      'pest_control',
      'monthly',
      '10:00',
      ARRAY['morning'],
      jsonb_build_object(
        'daypart_times', jsonb_build_object('morning', '10:00'),
        'default_checklist_items', jsonb_build_array(
          'All bait stations checked',
          'Fly killers serviced',
          'No evidence of pest activity',
          'Service report received from contractor',
          'Proofing recommendations noted',
          'Chemical records updated'
        )
      ),
      'manager',
      'SALSA, Food Safety Act 1990, Food Hygiene Regulations',
      TRUE,
      TRUE,
      TRUE,
      ARRAY['yes_no_checklist', 'photo', 'document_upload'],
      'After the pest control contractor visit: 1) Review the service report with the technician. 2) Check all bait stations and fly killers were inspected. 3) Note any evidence found and treatments applied. 4) Record chemical usage for COSHH compliance. 5) Document any proofing recommendations. 6) Upload the service report. 7) Sign off the visit.',
      FALSE,
      FALSE,
      'pest_control'
    );

    -- Monthly visit template fields
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'contractor_name', 'text', 'Contractor / Technician', TRUE, 1,
      'Name of the pest control contractor and/or technician who visited.',
      'e.g., ABC Pest Control - John Smith'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'monthly_pest_control_visit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'visit_date', 'date', 'Visit Date', TRUE, 2,
      'Date the pest control contractor visited the site.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'monthly_pest_control_visit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'evidence_found', 'pass_fail', 'No Evidence of Pest Activity', TRUE, 3,
      'PASS: No evidence of pest activity found. FAIL: Evidence was found — document details below.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'monthly_pest_control_visit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'treatments_applied', 'text', 'Treatments Applied', FALSE, 4,
      'List any treatments applied during the visit.',
      'e.g., Bait replenished in stations M01-M06, fly killer tubes replaced'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'monthly_pest_control_visit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'chemicals_used', 'text', 'Chemicals Used (for COSHH)', FALSE, 5,
      'Record any chemicals/pesticides used. Cross-reference with COSHH data sheets.',
      'e.g., Brodifacoum blocks (COSHH ref: PC-001), Alpha-cypermethrin spray'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'monthly_pest_control_visit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'proofing_recommendations', 'text', 'Proofing Recommendations', FALSE, 6,
      'Note any proofing or hygiene recommendations from the contractor.',
      'e.g., Seal gap under rear door, replace bristle strip on loading bay door'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'monthly_pest_control_visit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'service_report_upload', 'photo', 'Service Report Upload', FALSE, 7,
      'Upload the contractor''s service report (PDF or photo).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'monthly_pest_control_visit';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'manager_sign_off', 'pass_fail', 'Manager Sign-off', TRUE, 8,
      'Confirm you have reviewed the visit report and are satisfied with the service provided.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'monthly_pest_control_visit';


    -- ========================================================================
    -- Template 2: Quarterly Pest Control Review
    -- ========================================================================

    INSERT INTO public.task_templates (
      company_id, name, slug, description, category, audit_category,
      frequency, time_of_day,
      recurrence_pattern,
      assigned_to_role, compliance_standard, is_critical,
      is_template_library, is_active,
      evidence_types, instructions
    ) VALUES (
      NULL,
      'Quarterly Pest Control Review',
      'quarterly_pest_control_review',
      'Quarterly review of pest control programme effectiveness. Check device register, site plan, sighting trends, proofing measures, and contractor performance.',
      'food_safety',
      'pest_control',
      'quarterly',
      '09:00',
      jsonb_build_object(
        'default_checklist_items', jsonb_build_array(
          'Device register reviewed and up to date',
          'Site plan matches physical device locations',
          'Pest sighting trends analysed',
          'Proofing measures adequate and maintained',
          'Contractor SLA met (visit frequency, response times)',
          'Chemical records and COSHH data up to date'
        )
      ),
      'manager',
      'SALSA',
      TRUE,
      TRUE,
      TRUE,
      ARRAY['checklist', 'photo', 'document_upload'],
      'Conduct a thorough quarterly review: 1) Walk the site and verify all devices match the register. 2) Review sighting log for trends. 3) Check proofing measures are maintained. 4) Review contractor visit frequency against SLA. 5) Ensure chemical records are COSHH-compliant. 6) Note any actions required.'
    );

    -- Quarterly review template fields
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'device_register_current', 'pass_fail', 'Device Register Up to Date', TRUE, 1,
      'PASS: All devices on register are present and correctly listed. FAIL: Discrepancies found.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'quarterly_pest_control_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'site_plan_accurate', 'pass_fail', 'Site Plan Matches Physical Devices', TRUE, 2,
      'PASS: Site plan accurately shows all device locations. FAIL: Plan needs updating.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'quarterly_pest_control_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'sighting_trends_reviewed', 'pass_fail', 'Sighting Trends Reviewed', TRUE, 3,
      'PASS: Sighting data analysed and no concerning trends. FAIL: Trends require attention.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'quarterly_pest_control_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'proofing_adequate', 'pass_fail', 'Proofing Measures Adequate', TRUE, 4,
      'PASS: All proofing measures maintained and effective. FAIL: Proofing needs attention.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'quarterly_pest_control_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'contractor_sla_met', 'pass_fail', 'Contractor SLA Met', TRUE, 5,
      'PASS: Contractor meeting agreed service levels. FAIL: SLA breaches identified.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'quarterly_pest_control_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'actions_required', 'text', 'Actions Required', FALSE, 6,
      'Note any corrective actions needed following this review.',
      'e.g., Update site plan, schedule additional proofing work, raise SLA concern with contractor'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'quarterly_pest_control_review';


    -- ========================================================================
    -- Template 3: Annual Pest Control Contract & IPM Review
    -- ========================================================================

    INSERT INTO public.task_templates (
      company_id, name, slug, description, category, audit_category,
      frequency, time_of_day,
      recurrence_pattern,
      assigned_to_role, compliance_standard, is_critical,
      is_template_library, is_active,
      evidence_types, instructions
    ) VALUES (
      NULL,
      'Annual Pest Control Contract & IPM Review',
      'annual_pest_control_contract_review',
      'Annual review of the pest control contract, contractor performance, IPM programme effectiveness, and SALSA compliance. Includes site plan sign-off with the contractor.',
      'food_safety',
      'pest_control',
      'yearly',
      '14:00',
      jsonb_build_object(
        'default_checklist_items', jsonb_build_array(
          'Contract terms reviewed and still appropriate',
          'Annual spend analysed against contract value',
          'Contractor BPCA/BASIS certification verified',
          'Public liability insurance valid and adequate',
          'Site plan walked and physically verified with contractor',
          'Site plan signed by both responsible person and pest controller',
          'IPM programme effectiveness assessed',
          'Chemical usage reviewed and COSHH-compliant',
          'All 12 monthly service reports on file',
          'Contract renewal decision made'
        )
      ),
      'admin',
      'SALSA Issue 6, Food Safety Act 1990',
      TRUE,
      TRUE,
      TRUE,
      ARRAY['checklist', 'document_upload'],
      'Annual review with the pest control contractor: 1) Review contract terms and value. 2) Verify contractor certifications and insurance. 3) Walk the site together, verify all devices. 4) Both parties sign the updated site plan. 5) Assess IPM programme effectiveness. 6) Review chemical records for COSHH compliance. 7) Confirm all service reports are on file. 8) Make contract renewal decision.'
    );

    -- Annual review template fields
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'contract_value_assessment', 'text', 'Contract Value Assessment', FALSE, 1,
      'Compare annual spend vs contract value. Note any discrepancies or renegotiation needed.',
      'e.g., Contract value £1,200/yr, actual spend £1,350 (3 reactive callouts). Renegotiate to include 2 reactives.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'annual_pest_control_contract_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'certifications_valid', 'pass_fail', 'Contractor Certifications Valid', TRUE, 2,
      'PASS: BPCA/BASIS and other certifications are current. FAIL: Certifications expired or missing.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'annual_pest_control_contract_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'insurance_valid', 'pass_fail', 'Insurance In Date', TRUE, 3,
      'PASS: Public liability insurance is valid. FAIL: Insurance expired or inadequate.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'annual_pest_control_contract_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'site_plan_signed_contractor', 'pass_fail', 'Site Plan Signed by Contractor', TRUE, 4,
      'PASS: Contractor has signed the updated site plan. FAIL: Signature pending.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'annual_pest_control_contract_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'site_plan_signed_manager', 'pass_fail', 'Site Plan Signed by Responsible Person', TRUE, 5,
      'PASS: Site manager/responsible person has signed the updated site plan. FAIL: Signature pending.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'annual_pest_control_contract_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'ipm_effectiveness', 'text', 'IPM Programme Effectiveness', FALSE, 6,
      'Assess the overall effectiveness of the Integrated Pest Management programme.',
      'e.g., Effective — sightings reduced 40% year-on-year, proofing measures reducing ingress'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'annual_pest_control_contract_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
    SELECT id, 'renewal_decision', 'select', 'Contract Renewal Decision', TRUE, 7,
      'Decision on whether to renew, renegotiate, or retender the pest control contract.',
      jsonb_build_array(
        jsonb_build_object('value', 'renew', 'label', 'Renew on existing terms'),
        jsonb_build_object('value', 'renegotiate', 'label', 'Renegotiate terms'),
        jsonb_build_object('value', 'retender', 'label', 'Go out to tender')
      )
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'annual_pest_control_contract_review';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'signed_site_plan_upload', 'photo', 'Signed Site Plan Upload', FALSE, 8,
      'Upload the signed site plan document (PDF or photo of signed plan).'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'annual_pest_control_contract_review';

    RAISE NOTICE 'Seeded 3 pest control compliance templates: monthly visit, quarterly review, annual contract review';

  ELSE
    RAISE NOTICE 'Required tables do not exist yet — skipping pest control template seeds';
  END IF;
END $$;
