-- Fix RLS policy for tasks table to allow authenticated users to insert tasks
-- The current policy blocks all inserts from authenticated users
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if tasks table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN

    -- Drop the blocking policy
    DROP POLICY IF EXISTS tasks_insert_service_only ON public.tasks;

    -- Drop existing policy if it exists (to allow recreation)
    DROP POLICY IF EXISTS tasks_insert_company ON public.tasks;

    -- Create a new policy that allows company members to insert tasks
    -- Only if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE POLICY tasks_insert_company
        ON public.tasks
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.company_id = tasks.company_id
          )
        );
    END IF;

    -- Grant INSERT permission to authenticated users
    GRANT INSERT ON public.tasks TO authenticated;

  ELSE
    RAISE NOTICE '⚠️ tasks table does not exist yet - skipping insert policy fix';
  END IF;
END $$;

