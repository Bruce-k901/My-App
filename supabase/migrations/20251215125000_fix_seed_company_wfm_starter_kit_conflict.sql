-- ============================================================================
-- Migration: 20251215125000_fix_seed_company_wfm_starter_kit_conflict.sql
-- Description:
--   Hotfix: make seed_company_wfm_starter_kit resilient when unique constraints
--   are missing (avoids 42P10 from ON CONFLICT).
-- ============================================================================

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_onboarding_pack_documents'
  ) THEN
    RAISE NOTICE '⚠️ company_onboarding_pack_documents table does not exist - skipping';
    RETURN;
  END IF;

  -- Recreate helper function to avoid ON CONFLICT reliance
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
    );

    v_counter := v_counter + 1;
    RETURN v_counter;
  END;
  $helper$;

  -- Keep helper private
  REVOKE EXECUTE ON FUNCTION public._seed_pack_doc(UUID, UUID, TEXT, INT, BOOLEAN, INT) FROM PUBLIC;

  RAISE NOTICE 'Updated helper function public._seed_pack_doc to avoid ON CONFLICT';
END $do$;



