-- ============================================================================
-- Migration: Fix global_documents_audit missing user_id column
-- Description: The audit trigger on global_documents references a user_id column
--              in global_documents_audit that doesn't exist, causing error 42703
--              when updating documents (e.g., expiry date changes).
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'global_documents_audit'
  ) THEN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'global_documents_audit'
        AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.global_documents_audit
        ADD COLUMN user_id UUID REFERENCES auth.users(id);

      RAISE NOTICE 'Added user_id column to global_documents_audit';
    ELSE
      RAISE NOTICE 'user_id column already exists in global_documents_audit';
    END IF;
  ELSE
    RAISE NOTICE 'global_documents_audit table does not exist - skipping';
  END IF;
END $$;
