-- ============================================================================
-- Migration: 20250207000001_add_training_records_rls.sql
-- Description: Enable RLS and add company-scoped policies for training_records
-- Note: This migration will be skipped if training_records or profiles tables don't exist yet
-- ============================================================================

-- Enable RLS on training_records table (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records') THEN
    ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;

    -- Clean up existing policies if they exist (safe to run multiple times)
    DROP POLICY IF EXISTS training_records_select ON public.training_records;
    DROP POLICY IF EXISTS training_records_insert ON public.training_records;
    DROP POLICY IF EXISTS training_records_update ON public.training_records;
    DROP POLICY IF EXISTS training_records_delete ON public.training_records;

    -- Helper predicate: actor and target profiles share the same company
    -- We re-use the predicate inline in each policy to keep things simple.
    -- Only create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE POLICY training_records_select
        ON public.training_records
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_records.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = target.company_id
          )
        );

      CREATE POLICY training_records_insert
        ON public.training_records
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_records.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = target.company_id
          )
        );

      CREATE POLICY training_records_update
        ON public.training_records
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_records.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = target.company_id
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_records.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = target.company_id
          )
        );

      CREATE POLICY training_records_delete
        ON public.training_records
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles target
            JOIN public.profiles actor ON actor.id = auth.uid()
            WHERE target.id = training_records.user_id
              AND actor.company_id IS NOT NULL
              AND actor.company_id = target.company_id
          )
        );
    ELSE
      RAISE NOTICE '⚠️ profiles table does not exist yet - skipping RLS policy creation';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ training_records table does not exist yet - skipping RLS migration';
  END IF;
END $$;









