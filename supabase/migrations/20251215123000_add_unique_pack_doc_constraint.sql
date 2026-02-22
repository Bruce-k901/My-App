-- ============================================================================
-- Migration: 20251215123000_add_unique_pack_doc_constraint.sql
-- Description:
--   Ensure company_onboarding_pack_documents supports idempotent inserts
--   by enforcing uniqueness of (pack_id, global_document_id).
-- ============================================================================

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_onboarding_pack_documents'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_company_onboarding_pack_documents_pack_doc
      ON public.company_onboarding_pack_documents(pack_id, global_document_id);

    RAISE NOTICE 'Added unique index uq_company_onboarding_pack_documents_pack_doc';
  ELSE
    RAISE NOTICE '⚠️ company_onboarding_pack_documents table does not exist - skipping';
  END IF;
END $do$;



