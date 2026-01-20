-- ============================================================================
-- Migration: 20251215135000_fix_seed_company_wfm_starter_kit_pack_columns.sql
-- Description:
--   Hotfix: some environments have older company_onboarding_packs schema
--   missing columns like description/is_base/is_active.
--
--   Recreate seed_company_wfm_starter_kit to insert packs with schema fallback.
-- ============================================================================

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE '⚠️ profiles table missing - skipping';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'global_documents'
  ) THEN
    RAISE NOTICE '⚠️ global_documents table missing - skipping';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_onboarding_packs'
  ) THEN
    RAISE NOTICE '⚠️ company_onboarding_packs table missing - skipping';
    RETURN;
  END IF;

  -- Recreate the seed function with category fallback + pack column fallback.
  CREATE OR REPLACE FUNCTION public.seed_company_wfm_starter_kit(p_company_id UUID)
  RETURNS JSON
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $func$
  DECLARE
    v_company_id UUID;
    v_role TEXT;
    v_docs_inserted INT := 0;
    v_packs_inserted INT := 0;
    v_packdocs_inserted INT := 0;

    v_pack_id UUID;

    r RECORD;
    pr RECORD;

    v_cat TEXT;
    v_inserted BOOLEAN;
    v_candidates TEXT[];
  BEGIN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT p.company_id, p.app_role::TEXT
    INTO v_company_id, v_role
    FROM public.profiles p
    WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
    LIMIT 1;

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'No company context for current user';
    END IF;

    IF p_company_id IS NULL OR p_company_id <> v_company_id THEN
      RAISE EXCEPTION 'Cannot seed starter kit for a different company';
    END IF;

    IF v_role NOT IN (
      'Admin', 'Manager', 'General Manager', 'Owner', 'Super Admin',
      'admin', 'manager', 'general_manager', 'owner', 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to seed starter kit';
    END IF;

    -- Seed placeholder global documents (category fallback)
    FOR r IN (
      SELECT * FROM (
        VALUES
          ('staff_handbook', 'Compliance', 'Staff Handbook', 'Core handbook: culture, values, conduct, benefits, key processes.'),
          ('code_of_conduct', 'Compliance', 'Code of Conduct', 'Expected behaviours, professionalism, conflict of interest.'),
          ('equal_opportunities', 'Compliance', 'Equal Opportunities Policy', 'Equality, diversity, inclusion.'),
          ('anti_harassment', 'Compliance', 'Anti-Harassment & Bullying Policy', 'Zero tolerance policy and reporting routes.'),
          ('whistleblowing', 'Compliance', 'Whistleblowing Policy', 'How to raise concerns safely.'),
          ('disciplinary', 'Compliance', 'Disciplinary Policy', 'Disciplinary procedure and examples.'),
          ('grievance', 'Compliance', 'Grievance Policy', 'How employees raise issues and timelines.'),
          ('absence', 'Compliance', 'Absence / Sickness Policy', 'Reporting sickness, fit notes, SSP, return to work.'),
          ('annual_leave', 'Compliance', 'Annual Leave / Holiday Policy', 'Request process, approvals, carry-over.'),
          ('probation', 'Compliance', 'Probation Policy', 'Probation length, reviews, confirmation.'),
          ('timekeeping', 'Compliance', 'Timekeeping & Attendance Policy', 'Clock-in/out rules, punctuality, breaks, overtime.'),

          ('offer_letter_template', 'Other', 'Offer Letter (Template)', 'Placeholder: upload your offer letter template or use a generated template.'),
          ('employment_contract_template', 'Other', 'Employment Contract (Template)', 'Placeholder: upload your contract template (hourly/salaried variants as needed).'),
          ('job_description', 'Other', 'Job Description / Role Profile', 'Role responsibilities, reporting line, KPIs.'),

          ('payroll_info', 'Other', 'Payroll Information (How we pay you)', 'Pay dates, payslips, deductions, pension info.'),
          ('tronc_policy', 'Other', 'TRONC / Tips Policy', 'If applicable: distribution method, troncmaster, timing, appeals.'),
          ('expenses_policy', 'Other', 'Expenses Policy', 'What is claimable and how to claim.'),

          ('data_protection', 'Compliance', 'Data Protection / GDPR Policy', 'How personal data is handled.'),
          ('it_acceptable_use', 'Compliance', 'IT / Device Acceptable Use Policy', 'Passwords, device use, social media guidance.'),
          ('cctv_policy', 'Compliance', 'CCTV Policy (if applicable)', 'Purpose, retention, access rights.'),

          ('health_safety_policy', 'Health & Safety', 'Health & Safety Policy', 'General H&S policy and responsibilities.'),
          ('fire_safety', 'Fire & Premises', 'Fire Safety & Evacuation', 'Evacuation routes, alarms, assembly point.'),
          ('first_aid', 'Health & Safety', 'First Aid Guidance', 'First aiders, kits, reporting.'),
          ('accident_reporting', 'Health & Safety', 'Accident / Incident Reporting', 'How to report and escalation.'),

          ('training_matrix', 'Training & Competency', 'Training Matrix / Mandatory Training', 'What training is required by role and how to complete it.'),
          ('induction_checklist', 'Training & Competency', 'Induction Checklist', 'Checklist for day 1/week 1 onboarding steps.'),

          ('uniform_policy', 'Compliance', 'Uniform / Appearance Standards', 'FOH/BOH appearance rules, PPE requirements.'),
          ('food_safety_allergens', 'Food Safety & Hygiene', 'Food Safety & Allergen Policy (if applicable)', 'Allergen procedures, cross contamination.'),
          ('service_standards', 'Other', 'Service Standards (FOH)', 'Steps of service, guest experience standards.'),
          ('kitchen_standards', 'Other', 'Kitchen Standards (BOH)', 'Kitchen hygiene, checks, closing procedures.')
      ) AS t(doc_key, category, name, notes)
    ) LOOP
      IF EXISTS (
        SELECT 1
        FROM public.global_documents gd
        WHERE gd.company_id = p_company_id
          AND gd.doc_key = r.doc_key
        LIMIT 1
      ) THEN
        CONTINUE;
      END IF;

      v_candidates := ARRAY[
        r.category::TEXT,
        'Other',
        'Compliance',
        'Health & Safety',
        'Fire & Premises',
        'Training & Competency',
        'Food Safety & Hygiene',
        'Legal & Certificates',
        'Environmental & Waste',
        'Cleaning & Hygiene'
      ];

      v_inserted := FALSE;

      FOREACH v_cat IN ARRAY v_candidates LOOP
        BEGIN
          INSERT INTO public.global_documents (
            company_id,
            doc_key,
            category,
            name,
            notes,
            is_active,
            uploaded_by,
            uploaded_at,
            updated_at,
            version,
            expiry_date,
            file_path,
            is_placeholder
          )
          VALUES (
            p_company_id,
            r.doc_key,
            v_cat,
            r.name,
            r.notes,
            true,
            auth.uid(),
            now(),
            now(),
            NULL,
            NULL,
            (p_company_id::text || '/_onboarding_placeholders/' || r.doc_key || '.placeholder'),
            true
          );

          v_docs_inserted := v_docs_inserted + 1;
          v_inserted := TRUE;
          EXIT;

        EXCEPTION
          WHEN check_violation THEN
            NULL;
          WHEN undefined_column THEN
            -- Older global_documents schema; if this happens, stop and surface.
            RAISE;
        END;
      END LOOP;

      IF NOT v_inserted THEN
        RAISE EXCEPTION 'Could not insert doc_key=% because all category fallbacks violated constraints', r.doc_key;
      END IF;
    END LOOP;

    -- Packs (schema fallback for missing columns)
    FOR pr IN (
      SELECT * FROM (
        VALUES
          ('FOH', 'hourly',   'Starter Pack - FOH (Hourly)'),
          ('FOH', 'salaried', 'Starter Pack - FOH (Salaried)'),
          ('BOH', 'hourly',   'Starter Pack - BOH (Hourly)'),
          ('BOH', 'salaried', 'Starter Pack - BOH (Salaried)')
      ) AS p(boh_foh, pay_type, name)
    ) LOOP
      SELECT id INTO v_pack_id
      FROM public.company_onboarding_packs
      WHERE company_id = p_company_id
        AND name = pr.name
        AND boh_foh = pr.boh_foh::TEXT
        AND pay_type = pr.pay_type::TEXT
        AND (deleted_at IS NULL OR TRUE)
      LIMIT 1;

      IF v_pack_id IS NULL THEN
        BEGIN
          INSERT INTO public.company_onboarding_packs (
            company_id,
            name,
            description,
            boh_foh,
            pay_type,
            is_base,
            is_active
          )
          VALUES (
            p_company_id,
            pr.name,
            'Recommended baseline onboarding documents. Replace placeholders with your company documents.',
            pr.boh_foh::TEXT,
            pr.pay_type::TEXT,
            false,
            true
          )
          RETURNING id INTO v_pack_id;

        EXCEPTION
          WHEN undefined_column THEN
            BEGIN
              INSERT INTO public.company_onboarding_packs (
                company_id,
                name,
                boh_foh,
                pay_type
              )
              VALUES (
                p_company_id,
                pr.name,
                pr.boh_foh::TEXT,
                pr.pay_type::TEXT
              )
              RETURNING id INTO v_pack_id;
            END;
        END;

        v_packs_inserted := v_packs_inserted + 1;
      END IF;

      -- Pack docs (helper must exist)
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'staff_handbook', 10, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'code_of_conduct', 20, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'equal_opportunities', 30, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'anti_harassment', 40, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'absence', 80, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'annual_leave', 90, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'timekeeping', 110, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'employment_contract_template', 130, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'payroll_info', 150, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'data_protection', 180, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'health_safety_policy', 210, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'fire_safety', 220, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'induction_checklist', 260, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'uniform_policy', 270, true, v_packdocs_inserted);

      IF pr.boh_foh::TEXT = 'FOH' THEN
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'service_standards', 280, false, v_packdocs_inserted);
      END IF;

      IF pr.boh_foh::TEXT = 'BOH' THEN
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'kitchen_standards', 280, false, v_packdocs_inserted);
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'food_safety_allergens', 290, false, v_packdocs_inserted);
      END IF;

    END LOOP;

    RETURN json_build_object(
      'ok', true,
      'company_id', p_company_id,
      'docs_inserted', v_docs_inserted,
      'packs_inserted', v_packs_inserted,
      'pack_docs_inserted', v_packdocs_inserted
    );
  END;
  $func$;

  GRANT EXECUTE ON FUNCTION public.seed_company_wfm_starter_kit(UUID) TO authenticated;

  RAISE NOTICE 'Updated seed_company_wfm_starter_kit to handle older company_onboarding_packs schema';
END $do$;



