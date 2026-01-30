-- ============================================================================
-- Migration: 20251215121500_seed_wfm_onboarding_starter_kit.sql
-- Description:
--   Adds enterprise-friendly onboarding “starter kit” seeding:
--   - Allows placeholder global docs (no file uploaded yet)
--   - Adds an idempotent RPC to seed recommended WFM onboarding docs + packs
-- ============================================================================

DO $do$
BEGIN
  -- Only proceed if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'global_documents'
  ) THEN
    RAISE NOTICE '⚠️ global_documents table does not exist yet - skipping starter kit seed migration';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping starter kit seed migration';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_onboarding_packs'
  ) THEN
    RAISE NOTICE '⚠️ company_onboarding_packs table does not exist yet - skipping starter kit seed migration';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_onboarding_pack_documents'
  ) THEN
    RAISE NOTICE '⚠️ company_onboarding_pack_documents table does not exist yet - skipping starter kit seed migration';
    RETURN;
  END IF;

  -- Ensure idempotent seeding is possible (pack_id + global_document_id should be unique)
  CREATE UNIQUE INDEX IF NOT EXISTS uq_company_onboarding_pack_documents_pack_doc
    ON public.company_onboarding_pack_documents(pack_id, global_document_id);

  -- --------------------------------------------------------------------------
  -- 1) Allow placeholder docs
  -- --------------------------------------------------------------------------
  -- Add is_placeholder flag (safe for existing companies)
  ALTER TABLE public.global_documents
    ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT false;

  -- Add an internal stable key to make seeding idempotent
  ALTER TABLE public.global_documents
    ADD COLUMN IF NOT EXISTS doc_key TEXT NULL;

  -- Ensure an is_active flag exists for document filtering (used elsewhere in the app)
  ALTER TABLE public.global_documents
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

  -- Make file_path nullable so placeholders can exist without a file
  -- (Guard: only drop NOT NULL if it exists)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'global_documents'
      AND column_name = 'file_path'
      AND is_nullable = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE public.global_documents ALTER COLUMN file_path DROP NOT NULL';
  END IF;

  -- Prevent duplicates for seeded docs
  CREATE UNIQUE INDEX IF NOT EXISTS uq_global_documents_company_doc_key
    ON public.global_documents(company_id, doc_key)
    WHERE doc_key IS NOT NULL;

  -- --------------------------------------------------------------------------
  -- 2) Seed RPC (idempotent)
  -- --------------------------------------------------------------------------
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
    v_doc_id UUID;

    r RECORD;
    pr RECORD;
  BEGIN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Resolve company + role for current user (avoid depending on helper RPCs)
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

    -- ----------------------------------------------------------------------
    -- A) Seed placeholder global documents (enterprise WFM baseline)
    -- ----------------------------------------------------------------------
    FOR r IN (
      SELECT * FROM (
        VALUES
          -- Base / all staff (use allowed global_documents categories)
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

          -- Contracts / offers (placeholders until template editor is added)
          ('offer_letter_template', 'Other', 'Offer Letter (Template)', 'Placeholder: upload your offer letter template or use a generated template.'),
          ('employment_contract_template', 'Other', 'Employment Contract (Template)', 'Placeholder: upload your contract template (hourly/salaried variants as needed).'),
          ('job_description', 'Other', 'Job Description / Role Profile', 'Role responsibilities, reporting line, KPIs.'),

          -- Pay / payroll
          ('payroll_info', 'Other', 'Payroll Information (How we pay you)', 'Pay dates, payslips, deductions, pension info.'),
          ('tronc_policy', 'Other', 'TRONC / Tips Policy', 'If applicable: distribution method, troncmaster, timing, appeals.'),
          ('expenses_policy', 'Other', 'Expenses Policy', 'What is claimable and how to claim.'),

          -- Data & IT
          ('data_protection', 'Compliance', 'Data Protection / GDPR Policy', 'How personal data is handled.'),
          ('it_acceptable_use', 'Compliance', 'IT / Device Acceptable Use Policy', 'Passwords, device use, social media guidance.'),
          ('cctv_policy', 'Compliance', 'CCTV Policy (if applicable)', 'Purpose, retention, access rights.'),

          -- Health & safety (generic)
          ('health_safety_policy', 'Health & Safety', 'Health & Safety Policy', 'General H&S policy and responsibilities.'),
          ('fire_safety', 'Fire & Premises', 'Fire Safety & Evacuation', 'Evacuation routes, alarms, assembly point.'),
          ('first_aid', 'Health & Safety', 'First Aid Guidance', 'First aiders, kits, reporting.'),
          ('accident_reporting', 'Health & Safety', 'Accident / Incident Reporting', 'How to report and escalation.'),

          -- Training
          ('training_matrix', 'Training & Competency', 'Training Matrix / Mandatory Training', 'What training is required by role and how to complete it.'),
          ('induction_checklist', 'Training & Competency', 'Induction Checklist', 'Checklist for day 1/week 1 onboarding steps.'),

          -- Operational / standards
          ('uniform_policy', 'Compliance', 'Uniform / Appearance Standards', 'FOH/BOH appearance rules, PPE requirements.'),
          ('food_safety_allergens', 'Food Safety & Hygiene', 'Food Safety & Allergen Policy (if applicable)', 'Allergen procedures, cross contamination.'),
          ('service_standards', 'Other', 'Service Standards (FOH)', 'Steps of service, guest experience standards.'),
          ('kitchen_standards', 'Other', 'Kitchen Standards (BOH)', 'Kitchen hygiene, checks, closing procedures.')
      ) AS t(doc_key, category, name, notes)
    ) LOOP
      -- Use a deterministic placeholder file path. This avoids NOT NULL constraint issues
      -- in environments where file_path cannot be null yet. UI will treat this as “missing”.
      -- NOTE: No file is actually uploaded to this path.
      -- Example: <company_id>/_onboarding_placeholders/staff_handbook.placeholder
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
        r.category,
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
      )
      ON CONFLICT (company_id, doc_key) DO NOTHING;

      IF FOUND THEN
        v_docs_inserted := v_docs_inserted + 1;
      END IF;
    END LOOP;

    -- ----------------------------------------------------------------------
    -- B) Seed default onboarding packs (FOH/BOH x hourly/salaried)
    -- ----------------------------------------------------------------------
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
        AND deleted_at IS NULL
      LIMIT 1;

      IF v_pack_id IS NULL THEN
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

        v_packs_inserted := v_packs_inserted + 1;
      END IF;

      -- Insert pack docs with stable sort order
      -- Base docs (common)
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'staff_handbook', 10, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'code_of_conduct', 20, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'equal_opportunities', 30, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'anti_harassment', 40, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'whistleblowing', 50, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'disciplinary', 60, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'grievance', 70, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'absence', 80, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'annual_leave', 90, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'probation', 100, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'timekeeping', 110, true, v_packdocs_inserted);

      -- Contract/offer (required but placeholder until template system)
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'offer_letter_template', 120, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'employment_contract_template', 130, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'job_description', 140, false, v_packdocs_inserted);

      -- Pay/IT
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'payroll_info', 150, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'tronc_policy', 160, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'expenses_policy', 170, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'data_protection', 180, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'it_acceptable_use', 190, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'cctv_policy', 200, false, v_packdocs_inserted);

      -- H&S + training
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'health_safety_policy', 210, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'fire_safety', 220, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'first_aid', 230, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'accident_reporting', 240, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'training_matrix', 250, false, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'induction_checklist', 260, true, v_packdocs_inserted);

      -- Ops: uniform always, then FOH/BOH specifics
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

  -- Helper function for seeding pack docs (kept private)
  -- We create it as SECURITY DEFINER so it can insert even when called from the main RPC.
  CREATE OR REPLACE FUNCTION public._seed_pack_doc(
    p_pack_id UUID,
    p_company_id UUID,
    p_doc_key TEXT,
    p_sort_order INT,
    p_required BOOLEAN,
    p_counter INT
  )
  RETURNS INT
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $helper$
  DECLARE
    v_doc_id UUID;
    v_counter INT := p_counter;
  BEGIN
    SELECT id INTO v_doc_id
    FROM public.global_documents
    WHERE company_id = p_company_id
      AND doc_key = p_doc_key
    LIMIT 1;

    IF v_doc_id IS NULL THEN
      RETURN v_counter;
    END IF;

    -- If a unique constraint doesn't exist yet, ON CONFLICT will fail (42P10).
    -- So we guard with an existence check to keep seeding idempotent in all environments.
    IF EXISTS (
      SELECT 1
      FROM public.company_onboarding_pack_documents d
      WHERE d.pack_id = p_pack_id
        AND d.global_document_id = v_doc_id
      LIMIT 1
    ) THEN
      RETURN v_counter;
    END IF;

    INSERT INTO public.company_onboarding_pack_documents (
      pack_id,
      global_document_id,
      sort_order,
      required
    )
    VALUES (
      p_pack_id,
      v_doc_id,
      p_sort_order,
      p_required
    )
    ;

    IF FOUND THEN
      v_counter := v_counter + 1;
    END IF;

    RETURN v_counter;
  END;
  $helper$;

  -- Keep helper private (do not allow direct calling)
  REVOKE EXECUTE ON FUNCTION public._seed_pack_doc(UUID, UUID, TEXT, INT, BOOLEAN, INT) FROM PUBLIC;

  GRANT EXECUTE ON FUNCTION public.seed_company_wfm_starter_kit(UUID) TO authenticated;

  RAISE NOTICE 'WFM starter kit seed RPC installed';
END $do$;



