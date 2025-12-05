-- Fix RLS policy for task_templates to allow access to global templates
-- Global templates (company_id IS NULL) should be visible to all authenticated users

-- Drop existing policy
DROP POLICY IF EXISTS task_templates_select_company ON public.task_templates;

-- Recreate policy with global template access
CREATE POLICY task_templates_select_company
  ON public.task_templates
  FOR SELECT
  USING (
    -- Global templates (company_id IS NULL) are visible to all authenticated users
    task_templates.company_id IS NULL OR
    -- Company-specific templates are visible to users from that company
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_templates.company_id
    )
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'task_templates' 
    AND policyname = 'task_templates_select_company'
  ) THEN
    RAISE NOTICE '✅ Policy task_templates_select_company created successfully';
  ELSE
    RAISE WARNING '❌ Policy task_templates_select_company was not created';
  END IF;
END $$;




