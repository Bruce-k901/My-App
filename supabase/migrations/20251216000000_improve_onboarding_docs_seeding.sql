-- ============================================================================
-- Migration: 20251216000000_improve_onboarding_docs_seeding.sql
-- Description:
--   Improves the onboarding document seeding system:
--   1. Better categorization aligned with UI categories
--   2. More descriptive document names and notes
--   3. Clearer guidance on what users should upload
--   4. Reduced placeholder clutter - only essential docs
--   5. Better organized onboarding packs
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

  -- Ensure helper function exists (for adding documents to packs)
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
    -- Find the document by doc_key
    SELECT id INTO v_doc_id
    FROM public.global_documents
    WHERE company_id = p_company_id
      AND doc_key = p_doc_key
    LIMIT 1;

    -- If document doesn't exist, skip
    IF v_doc_id IS NULL THEN
      RETURN v_counter;
    END IF;

    -- Check if already in pack
    IF EXISTS (
      SELECT 1
      FROM public.company_onboarding_pack_documents d
      WHERE d.pack_id = p_pack_id
        AND d.global_document_id = v_doc_id
      LIMIT 1
    ) THEN
      RETURN v_counter;
    END IF;

    -- Add to pack
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
    );

    RETURN v_counter + 1;
  END;
  $helper$;

  GRANT EXECUTE ON FUNCTION public._seed_pack_doc(UUID, UUID, TEXT, INT, BOOLEAN, INT) TO authenticated;
  REVOKE EXECUTE ON FUNCTION public._seed_pack_doc(UUID, UUID, TEXT, INT, BOOLEAN, INT) FROM PUBLIC;

  -- Drop the old seed function and create an improved version
  DROP FUNCTION IF EXISTS public.seed_company_wfm_starter_kit(UUID);

  -- Recreate with improved document structure
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
    -- Auth check
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

    -- ========================================================================
    -- SEED IMPROVED PLACEHOLDER DOCUMENTS
    -- Organized by category with better descriptions and guidance
    -- ========================================================================
    FOR r IN (
      SELECT * FROM (
        VALUES
          -- Essential Policy Documents (Compliance)
          ('company_handbook', 'Compliance', 'Company Handbook', 'Your company handbook covering policies, procedures, and employee expectations. Upload your branded handbook here.'),
          ('code_of_conduct', 'Compliance', 'Code of Conduct & Ethics', 'Expected standards of behavior, professionalism, and ethical conduct. This should reflect your company culture and values.'),
          ('disciplinary_procedure', 'Compliance', 'Disciplinary & Grievance Procedures', 'How disciplinary matters and employee grievances are handled in your organization.'),
          ('equal_opportunities', 'Compliance', 'Equality, Diversity & Inclusion Policy', 'Your commitment to equality, diversity, and inclusion in the workplace.'),
          ('data_protection', 'Compliance', 'Data Protection & Privacy Policy (GDPR)', 'How you handle personal data, employee rights, and GDPR compliance.'),
          
          -- Health & Safety (Required by law)
          ('health_safety_policy', 'Health & Safety', 'Health & Safety Policy Statement', 'Your organization''s H&S policy signed by senior management. Required by law if you have 5+ employees.'),
          ('fire_safety_procedures', 'Fire & Premises', 'Fire Safety & Evacuation Procedures', 'Fire alarm procedures, evacuation routes, assembly points, and fire warden contacts.'),
          ('first_aid_guidance', 'Health & Safety', 'First Aid Arrangements', 'Location of first aid kits, names of first aiders, and accident reporting procedures.'),
          ('accident_reporting', 'Health & Safety', 'Accident & Incident Reporting', 'How to report accidents, near misses, and incidents. Include RIDDOR requirements if applicable.'),
          
          -- Training & Competency
          ('induction_checklist', 'Training & Competency', 'New Starter Induction Checklist', 'Day 1/Week 1 checklist: IT setup, uniform, locker, site tour, key contacts, and initial training.'),
          ('training_matrix', 'Training & Competency', 'Role-Specific Training Requirements', 'Mandatory training by role (e.g., Food Safety Level 2, Health & Safety, allergen awareness).'),
          
          -- Employment Basics
          ('employment_contract_template', 'Compliance', 'Employment Contract (Template)', 'Your standard employment contract template. You can create role-specific versions (FOH/BOH, hourly/salaried).'),
          ('probation_policy', 'Compliance', 'Probation Policy', 'Probation period length, review process, and confirmation of employment procedure.'),
          
          -- Pay & Benefits
          ('payroll_guide', 'Compliance', 'How You Get Paid', 'Payroll information: pay dates, how to access payslips, pension scheme, and tax/NI deductions.'),
          ('holiday_policy', 'Compliance', 'Holiday & Leave Policy', 'Annual leave entitlement, how to book holidays, notice periods, and carry-over rules.'),
          ('sickness_absence', 'Compliance', 'Sickness & Absence Policy', 'How to report sickness, fit note requirements, return-to-work interviews, and SSP.'),
          
          -- Role-Specific (Food Safety & Hygiene)
          ('food_safety_policy', 'Food Safety & Hygiene', 'Food Safety Policy (BOH)', 'Food safety standards, allergen procedures, and cross-contamination prevention for kitchen staff.'),
          ('allergen_guidance', 'Food Safety & Hygiene', 'Allergen Information & Procedures', 'The 14 allergens, how to handle allergen queries, and where to find allergen information.'),
          ('uniform_hygiene', 'Food Safety & Hygiene', 'Uniform & Personal Hygiene Standards', 'Uniform requirements, appearance standards, and personal hygiene rules for food handlers.'),
          
          -- Role-Specific (FOH)
          ('service_standards', 'Training & Competency', 'Service Standards & Guest Experience (FOH)', 'Steps of service, greeting standards, handling complaints, and table etiquette for front-of-house staff.'),
          
          -- Role-Specific (BOH)
          ('kitchen_procedures', 'Training & Competency', 'Kitchen Procedures & Standards (BOH)', 'Kitchen organization, cleaning schedules, opening/closing procedures, and equipment usage.')
          
      ) AS t(doc_key, category, name, notes)
    ) LOOP
      -- Skip if document already exists
      IF EXISTS (
        SELECT 1
        FROM public.global_documents gd
        WHERE gd.company_id = p_company_id
          AND gd.doc_key = r.doc_key
        LIMIT 1
      ) THEN
        CONTINUE;
      END IF;

      -- Category fallback to handle CHECK constraints
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
            NULL; -- Try next category
          WHEN undefined_column THEN
            RAISE; -- Stop if schema is too old
        END;
      END LOOP;

      IF NOT v_inserted THEN
        RAISE EXCEPTION 'Could not insert doc_key=% - all category fallbacks failed', r.doc_key;
      END IF;
    END LOOP;

    -- ========================================================================
    -- SEED IMPROVED ONBOARDING PACKS
    -- More focused packs with relevant documents only
    -- ========================================================================
    FOR pr IN (
      SELECT * FROM (
        VALUES
          ('FOH', 'hourly',   'Front of House - Hourly', 'Essential onboarding for hourly-paid front-of-house team members (servers, hosts, bartenders).'),
          ('FOH', 'salaried', 'Front of House - Salaried', 'Onboarding for salaried FOH managers and supervisors.'),
          ('BOH', 'hourly',   'Back of House - Hourly', 'Essential onboarding for hourly-paid kitchen team members (chefs, kitchen assistants).'),
          ('BOH', 'salaried', 'Back of House - Salaried', 'Onboarding for salaried BOH managers (head chef, sous chef, kitchen manager).')
      ) AS p(boh_foh, pay_type, name, description)
    ) LOOP
      -- Check if pack already exists
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
          -- Try modern schema first
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
            pr.description,
            pr.boh_foh::TEXT,
            pr.pay_type::TEXT,
            false,
            true
          )
          RETURNING id INTO v_pack_id;

        EXCEPTION
          WHEN undefined_column THEN
            -- Fallback for older schema
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

      -- ======================================================================
      -- ADD DOCUMENTS TO PACKS (Common to all roles)
      -- ======================================================================
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'company_handbook', 10, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'code_of_conduct', 20, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'equal_opportunities', 30, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'data_protection', 40, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'health_safety_policy', 50, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'fire_safety_procedures', 60, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'first_aid_guidance', 70, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'employment_contract_template', 80, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'payroll_guide', 90, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'holiday_policy', 100, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'sickness_absence', 110, true, v_packdocs_inserted);
      v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'induction_checklist', 120, true, v_packdocs_inserted);

      -- Role-specific documents
      IF pr.boh_foh::TEXT = 'FOH' THEN
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'service_standards', 130, true, v_packdocs_inserted);
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'allergen_guidance', 140, true, v_packdocs_inserted);
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'uniform_hygiene', 150, false, v_packdocs_inserted);
      END IF;

      IF pr.boh_foh::TEXT = 'BOH' THEN
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'kitchen_procedures', 130, true, v_packdocs_inserted);
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'food_safety_policy', 140, true, v_packdocs_inserted);
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'allergen_guidance', 150, true, v_packdocs_inserted);
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'uniform_hygiene', 160, true, v_packdocs_inserted);
      END IF;

      -- Salaried-specific documents
      IF pr.pay_type::TEXT = 'salaried' THEN
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'disciplinary_procedure', 170, false, v_packdocs_inserted);
        v_packdocs_inserted := public._seed_pack_doc(v_pack_id, p_company_id, 'probation_policy', 180, false, v_packdocs_inserted);
      END IF;

    END LOOP;

    RETURN json_build_object(
      'ok', true,
      'company_id', p_company_id,
      'docs_inserted', v_docs_inserted,
      'packs_inserted', v_packs_inserted,
      'pack_docs_inserted', v_packdocs_inserted,
      'message', 'Improved onboarding starter kit created successfully'
    );
  END;
  $func$;

  GRANT EXECUTE ON FUNCTION public.seed_company_wfm_starter_kit(UUID) TO authenticated;

  RAISE NOTICE '✅ Improved onboarding document seeding system created';
END $do$;
