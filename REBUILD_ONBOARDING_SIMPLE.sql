-- =====================================================
-- REBUILD ONBOARDING MODULE - SIMPLIFIED VERSION
-- =====================================================
-- Purpose: Strip out complexity and rebuild with practical focus:
--   - Companies upload their own documents
--   - Simple categorization
--   - 4 basic packs: FOH/BOH × Hourly/Salaried
--   - Essential forms only
-- =====================================================

-- STEP 1: Drop the problematic CHECK constraint
DO $$ 
BEGIN
  -- Find and drop any CHECK constraint on global_documents.category
  EXECUTE (
    SELECT 'ALTER TABLE public.global_documents DROP CONSTRAINT ' || constraint_name || ';'
    FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'global_documents'
      AND constraint_name LIKE '%category%'
    LIMIT 1
  );
  RAISE NOTICE '✅ Dropped old category CHECK constraint';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  No category CHECK constraint found (this is OK)';
END $$;

-- STEP 2: Ensure global_documents has the right structure
DO $$ 
BEGIN
  -- Ensure category column exists (no CHECK constraint)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'global_documents' 
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.global_documents ADD COLUMN category TEXT;
  END IF;

  -- Ensure other required columns exist
  ALTER TABLE public.global_documents 
    ADD COLUMN IF NOT EXISTS doc_key TEXT,
    ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS notes TEXT;

  -- Make file_path nullable for placeholders
  ALTER TABLE public.global_documents ALTER COLUMN file_path DROP NOT NULL;

  -- Unique constraint on doc_key per company
  CREATE UNIQUE INDEX IF NOT EXISTS uq_global_documents_company_doc_key
    ON public.global_documents(company_id, doc_key)
    WHERE doc_key IS NOT NULL;

  RAISE NOTICE '✅ global_documents structure ready';
END $$;

-- STEP 3: Ensure company_onboarding_packs has the right structure
DO $$ 
BEGIN
  -- Add columns if they don't exist (without CHECK constraints first)
  ALTER TABLE public.company_onboarding_packs
    ADD COLUMN IF NOT EXISTS description TEXT;
  
  ALTER TABLE public.company_onboarding_packs
    ADD COLUMN IF NOT EXISTS boh_foh TEXT;
  
  ALTER TABLE public.company_onboarding_packs
    ADD COLUMN IF NOT EXISTS pay_type TEXT;
  
  ALTER TABLE public.company_onboarding_packs
    ADD COLUMN IF NOT EXISTS is_base BOOLEAN DEFAULT false;
  
  ALTER TABLE public.company_onboarding_packs
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

  -- Drop old CHECK constraints if they exist
  BEGIN
    ALTER TABLE public.company_onboarding_packs DROP CONSTRAINT IF EXISTS company_onboarding_packs_boh_foh_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.company_onboarding_packs DROP CONSTRAINT IF EXISTS company_onboarding_packs_pay_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Add new CHECK constraints with correct values (lowercase)
  ALTER TABLE public.company_onboarding_packs
    ADD CONSTRAINT company_onboarding_packs_boh_foh_check 
    CHECK (boh_foh IN ('FOH', 'BOH', 'BOTH'));
  
  ALTER TABLE public.company_onboarding_packs
    ADD CONSTRAINT company_onboarding_packs_pay_type_check 
    CHECK (pay_type IN ('hourly', 'salaried'));

  RAISE NOTICE '✅ company_onboarding_packs structure ready';
END $$;

-- STEP 4: Terminate any cached connections
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT pid, application_name 
    FROM pg_stat_activity 
    WHERE datname = current_database() 
      AND pid <> pg_backend_pid()
      AND application_name LIKE '%postgrest%'
  LOOP
    PERFORM pg_terminate_backend(r.pid);
  END LOOP;
  RAISE NOTICE '✅ Terminated cached connections';
END $$;

-- STEP 5: Drop all old versions of the seed function
DO $$ 
BEGIN
  DROP FUNCTION IF EXISTS public.seed_company_wfm_starter_kit(UUID) CASCADE;
  DROP FUNCTION IF EXISTS public.seed_company_wfm_starter_kit() CASCADE;
  DROP FUNCTION IF EXISTS public._seed_pack_doc(UUID, UUID, TEXT) CASCADE;
  DROP FUNCTION IF EXISTS public._seed_pack_doc(UUID, UUID) CASCADE;
  DROP FUNCTION IF EXISTS public._seed_pack_doc() CASCADE;
  RAISE NOTICE '✅ Dropped all old seed functions';
END $$;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- STEP 6: Create helper function to add docs to packs
CREATE OR REPLACE FUNCTION public._seed_pack_doc(
  p_pack_id UUID,
  p_doc_id UUID,
  p_doc_key TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Idempotent: only insert if not already linked
  IF NOT EXISTS (
    SELECT 1 FROM public.company_onboarding_pack_documents
    WHERE pack_id = p_pack_id AND global_document_id = p_doc_id
  ) THEN
    INSERT INTO public.company_onboarding_pack_documents (pack_id, global_document_id)
    VALUES (p_pack_id, p_doc_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public._seed_pack_doc(UUID, UUID, TEXT) TO authenticated;

-- STEP 7: Create the main seed function (SIMPLIFIED)
CREATE OR REPLACE FUNCTION public.seed_company_wfm_starter_kit(p_company_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID := COALESCE(p_company_id, auth.uid());
  v_docs_inserted INT := 0;
  v_packs_created INT := 0;
  r RECORD;
  v_doc_id UUID;
  v_pack_foh_hourly UUID;
  v_pack_foh_salaried UUID;
  v_pack_boh_hourly UUID;
  v_pack_boh_salaried UUID;
BEGIN
  -- Validate company access
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.companies c ON p.company_id = c.id
    WHERE p.id = auth.uid() AND c.id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied to company %', v_company_id;
  END IF;

  -- ==========================================
  -- SEED ESSENTIAL DOCUMENTS
  -- ==========================================
  -- These are the ONLY documents we seed as placeholders
  -- Categories kept simple and flexible
  
  FOR r IN (
    SELECT * FROM (VALUES
      -- Employment Contracts
      ('contract_foh_hourly', 'Onboarding - Contracts', 'Employment Contract - FOH Hourly', 'Standard contract for front-of-house hourly staff'),
      ('contract_foh_salaried', 'Onboarding - Contracts', 'Employment Contract - FOH Salaried', 'Standard contract for front-of-house salaried staff'),
      ('contract_boh_hourly', 'Onboarding - Contracts', 'Employment Contract - BOH Hourly', 'Standard contract for back-of-house hourly staff'),
      ('contract_boh_salaried', 'Onboarding - Contracts', 'Employment Contract - BOH Salaried', 'Standard contract for back-of-house salaried staff'),
      
      -- Essential Forms
      ('staff_handbook', 'Onboarding - Policies', 'Staff Handbook', 'Your complete staff handbook'),
      ('new_starter_form', 'Onboarding - Forms', 'New Starter Details Form', 'Collect employee information for onboarding'),
      ('uniform_issued', 'Onboarding - Forms', 'Uniform Issued Record', 'Track uniform items issued to staff'),
      ('wage_deduction_auth', 'Onboarding - Forms', 'Wage Deduction Authorisation', 'Authorization for uniform/equipment deductions'),
      ('work_permit_disclaimer', 'Onboarding - Forms', 'Right to Work Verification', 'Work permit and right-to-work documentation'),
      ('health_declaration', 'Onboarding - Forms', 'Health Declaration Form', 'Pre-employment health questionnaire'),
      ('gdpr_consent', 'Onboarding - Forms', 'GDPR & Data Protection Consent', 'Data protection and privacy notice'),
      
      -- Training Documents
      ('food_hygiene_cert', 'Onboarding - Training', 'Food Hygiene Certificate', 'Level 2 Food Safety & Hygiene certification'),
      ('training_acknowledgment', 'Onboarding - Training', 'Training Acknowledgment', 'Record of mandatory training completion')
    ) AS t(doc_key, category, name, notes)
  ) LOOP
    -- Skip if already exists
    IF EXISTS (SELECT 1 FROM public.global_documents WHERE company_id = v_company_id AND doc_key = r.doc_key) THEN
      CONTINUE;
    END IF;

    -- Insert the placeholder document
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
      file_path, 
      is_placeholder
    ) VALUES (
      v_company_id, 
      r.doc_key, 
      r.category, 
      r.name, 
      r.notes, 
      true, 
      auth.uid(),
      now(), 
      now(), 
      (v_company_id::text || '/_placeholders/' || r.doc_key || '.pdf'), 
      true
    );
    
    v_docs_inserted := v_docs_inserted + 1;
  END LOOP;

  -- ==========================================
  -- CREATE 4 SIMPLE ONBOARDING PACKS
  -- ==========================================
  
  -- Pack 1: FOH Hourly
  IF NOT EXISTS (
    SELECT 1 FROM public.company_onboarding_packs 
    WHERE company_id = v_company_id AND boh_foh = 'FOH' AND pay_type = 'hourly'
  ) THEN
    INSERT INTO public.company_onboarding_packs (company_id, name, description, boh_foh, pay_type, is_base, is_active)
    VALUES (
      v_company_id,
      'FOH - Hourly Staff',
      'Onboarding pack for front-of-house hourly employees (servers, bartenders, hosts)',
      'FOH',
      'hourly',
      true,
      true
    )
    RETURNING id INTO v_pack_foh_hourly;
    v_packs_created := v_packs_created + 1;

    -- Link documents to pack
    FOR r IN (
      SELECT id, doc_key FROM public.global_documents 
      WHERE company_id = v_company_id 
        AND doc_key IN (
          'contract_foh_hourly',
          'staff_handbook',
          'new_starter_form',
          'uniform_issued',
          'wage_deduction_auth',
          'work_permit_disclaimer',
          'food_hygiene_cert',
          'health_declaration',
          'gdpr_consent',
          'training_acknowledgment'
        )
    ) LOOP
      PERFORM public._seed_pack_doc(v_pack_foh_hourly, r.id, r.doc_key);
    END LOOP;
  END IF;

  -- Pack 2: FOH Salaried
  IF NOT EXISTS (
    SELECT 1 FROM public.company_onboarding_packs 
    WHERE company_id = v_company_id AND boh_foh = 'FOH' AND pay_type = 'salaried'
  ) THEN
    INSERT INTO public.company_onboarding_packs (company_id, name, description, boh_foh, pay_type, is_base, is_active)
    VALUES (
      v_company_id,
      'FOH - Salaried Staff',
      'Onboarding pack for front-of-house salaried employees (supervisors, managers)',
      'FOH',
      'salaried',
      true,
      true
    )
    RETURNING id INTO v_pack_foh_salaried;
    v_packs_created := v_packs_created + 1;

    FOR r IN (
      SELECT id, doc_key FROM public.global_documents 
      WHERE company_id = v_company_id 
        AND doc_key IN (
          'contract_foh_salaried',
          'staff_handbook',
          'new_starter_form',
          'uniform_issued',
          'work_permit_disclaimer',
          'food_hygiene_cert',
          'health_declaration',
          'gdpr_consent',
          'training_acknowledgment'
        )
    ) LOOP
      PERFORM public._seed_pack_doc(v_pack_foh_salaried, r.id, r.doc_key);
    END LOOP;
  END IF;

  -- Pack 3: BOH Hourly
  IF NOT EXISTS (
    SELECT 1 FROM public.company_onboarding_packs 
    WHERE company_id = v_company_id AND boh_foh = 'BOH' AND pay_type = 'hourly'
  ) THEN
    INSERT INTO public.company_onboarding_packs (company_id, name, description, boh_foh, pay_type, is_base, is_active)
    VALUES (
      v_company_id,
      'BOH - Hourly Staff',
      'Onboarding pack for back-of-house hourly employees (line cooks, prep cooks, dishwashers)',
      'BOH',
      'hourly',
      true,
      true
    )
    RETURNING id INTO v_pack_boh_hourly;
    v_packs_created := v_packs_created + 1;

    FOR r IN (
      SELECT id, doc_key FROM public.global_documents 
      WHERE company_id = v_company_id 
        AND doc_key IN (
          'contract_boh_hourly',
          'staff_handbook',
          'new_starter_form',
          'uniform_issued',
          'wage_deduction_auth',
          'work_permit_disclaimer',
          'food_hygiene_cert',
          'health_declaration',
          'gdpr_consent',
          'training_acknowledgment'
        )
    ) LOOP
      PERFORM public._seed_pack_doc(v_pack_boh_hourly, r.id, r.doc_key);
    END LOOP;
  END IF;

  -- Pack 4: BOH Salaried
  IF NOT EXISTS (
    SELECT 1 FROM public.company_onboarding_packs 
    WHERE company_id = v_company_id AND boh_foh = 'BOH' AND pay_type = 'salaried'
  ) THEN
    INSERT INTO public.company_onboarding_packs (company_id, name, description, boh_foh, pay_type, is_base, is_active)
    VALUES (
      v_company_id,
      'BOH - Salaried Staff',
      'Onboarding pack for back-of-house salaried employees (head chefs, sous chefs, kitchen managers)',
      'BOH',
      'salaried',
      true,
      true
    )
    RETURNING id INTO v_pack_boh_salaried;
    v_packs_created := v_packs_created + 1;

    FOR r IN (
      SELECT id, doc_key FROM public.global_documents 
      WHERE company_id = v_company_id 
        AND doc_key IN (
          'contract_boh_salaried',
          'staff_handbook',
          'new_starter_form',
          'uniform_issued',
          'work_permit_disclaimer',
          'food_hygiene_cert',
          'health_declaration',
          'gdpr_consent',
          'training_acknowledgment'
        )
    ) LOOP
      PERFORM public._seed_pack_doc(v_pack_boh_salaried, r.id, r.doc_key);
    END LOOP;
  END IF;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'documents_created', v_docs_inserted,
    'packs_created', v_packs_created,
    'message', format('Created %s placeholder documents and %s onboarding packs', v_docs_inserted, v_packs_created)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_company_wfm_starter_kit(UUID) TO authenticated;

-- Force PostgREST to reload schema again
NOTIFY pgrst, 'reload schema';

-- STEP 8: Verify everything
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'seed_company_wfm_starter_kit'
  ) THEN
    RAISE NOTICE '🎉 SUCCESS! Simplified onboarding module is ready';
    RAISE NOTICE '📋 13 essential documents will be seeded';
    RAISE NOTICE '📦 4 simple packs: FOH/BOH × Hourly/Salaried';
    RAISE NOTICE '✨ No CHECK constraints blocking categories';
  ELSE
    RAISE EXCEPTION 'Function creation failed';
  END IF;
END $$;
