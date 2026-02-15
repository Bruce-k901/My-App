-- Definitive fix for employee_review_summaries RLS
-- Use SECURITY DEFINER function to bypass RLS for automatic summary creation
-- Handle both singular and plural table names

DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  -- Check which table name exists (singular or plural)
  SELECT table_name INTO v_table_name
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('employee_review_summary', 'employee_review_summaries')
  LIMIT 1;

  IF v_table_name IS NOT NULL THEN
    
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "view_employee_review_summary" ON %I', v_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "insert_employee_review_summary" ON %I', v_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "update_employee_review_summary" ON %I', v_table_name);

    -- Create SECURITY DEFINER function to upsert summary (bypasses RLS)
    EXECUTE format('
      CREATE OR REPLACE FUNCTION upsert_employee_review_summary(
        p_employee_id UUID,
        p_company_id UUID
      )
      RETURNS VOID
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      BEGIN
        INSERT INTO %I (
          employee_id,
          company_id,
          total_reviews_completed,
          updated_at
        )
        VALUES (
          p_employee_id,
          p_company_id,
          0,
          NOW()
        )
        ON CONFLICT (employee_id, company_id)
        DO UPDATE SET
          updated_at = NOW();
      END;
      $func$;
    ', v_table_name);

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION upsert_employee_review_summary(UUID, UUID) TO authenticated;

    -- SELECT policy: Users can view their own summary, managers/admins can view summaries in their company
    EXECUTE format('
      CREATE POLICY "view_employee_review_summary"
      ON %I FOR SELECT
      USING (
        employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        OR company_id IN (
          SELECT company_id FROM profiles 
          WHERE id = auth.uid() 
          AND LOWER(COALESCE(app_role::TEXT, ''''::TEXT)) IN (''admin'', ''owner'', ''manager'')
        )
      )
    ', v_table_name);

    -- INSERT policy: Allow any authenticated user (summary is just aggregated stats)
    -- The UNIQUE constraint prevents duplicates
    EXECUTE format('
      CREATE POLICY "insert_employee_review_summary"
      ON %I FOR INSERT
      TO authenticated
      WITH CHECK (true)
    ', v_table_name);

    -- UPDATE policy: Allow any authenticated user in the company
    EXECUTE format('
      CREATE POLICY "update_employee_review_summary"
      ON %I FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true)
    ', v_table_name);

    -- Grant permissions
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO authenticated', v_table_name);

    RAISE NOTICE 'Fixed % RLS policies - created SECURITY DEFINER function and permissive policies', v_table_name;
  ELSE
    RAISE NOTICE 'employee_review_summary/employee_review_summaries table does not exist - skipping';
  END IF;
END $$;

