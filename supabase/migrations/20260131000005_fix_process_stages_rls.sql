-- Fix RLS policy for planly_process_stages to handle NULL site_id
-- The ALL policy was missing the NULL check that the SELECT policy has
-- This caused INSERT/UPDATE to fail silently for templates with NULL site_id

DO $$
BEGIN
  -- Only proceed if the table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'planly_process_stages'
  ) THEN
    -- Drop the existing broken policy
    DROP POLICY IF EXISTS "Users can manage process stages for their sites" ON planly_process_stages;

    -- Recreate with the NULL check matching the SELECT policy
    CREATE POLICY "Users can manage process stages for their sites"
      ON planly_process_stages FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM planly_process_templates pt
          WHERE pt.id = planly_process_stages.template_id
            AND (pt.site_id IS NULL OR has_planly_site_access(pt.site_id))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planly_process_templates pt
          WHERE pt.id = planly_process_stages.template_id
            AND (pt.site_id IS NULL OR has_planly_site_access(pt.site_id))
        )
      );

    RAISE NOTICE 'Fixed RLS policy for planly_process_stages to handle NULL site_id';
  ELSE
    RAISE NOTICE 'planly_process_stages table does not exist - skipping';
  END IF;
END $$;
