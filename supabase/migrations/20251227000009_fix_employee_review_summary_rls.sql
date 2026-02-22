-- Fix employee_review_summary RLS policies to allow INSERT and UPDATE
-- This table is used to track review statistics and should be updatable when reviews are created
-- Handle both singular and plural table names (employee_review_summary vs employee_review_summaries)

DO $$
DECLARE
  v_table_name TEXT;
  v_sql TEXT;
  v_empty_string TEXT := '';
BEGIN
  -- Check which table name exists (singular or plural)
  SELECT table_name INTO v_table_name
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('employee_review_summary', 'employee_review_summaries')
  LIMIT 1;

  IF v_table_name IS NOT NULL THEN
    
    -- Drop existing policies if they exist
    EXECUTE format('DROP POLICY IF EXISTS "view_employee_review_summary" ON %I', v_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "insert_employee_review_summary" ON %I', v_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "update_employee_review_summary" ON %I', v_table_name);

    -- SELECT policy: Users can view their own summary, managers/admins can view summaries in their company
    v_sql := format('
      CREATE POLICY "view_employee_review_summary"
      ON %I FOR SELECT
      USING (
        employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        OR company_id IN (
          SELECT company_id FROM profiles 
          WHERE id = auth.uid() 
          AND LOWER(COALESCE(app_role::TEXT, %L)) IN (''admin'', ''owner'', ''manager'')
        )
      )
    ', v_table_name, v_empty_string);
    EXECUTE v_sql;

    -- INSERT policy: Allow inserts for any authenticated user
    -- This is needed for automatic summary creation via triggers/functions when reviews are created
    -- The policy is permissive because summary records are just aggregated statistics
    -- The UNIQUE constraint on (employee_id, company_id) prevents duplicates anyway
    v_sql := format('
      CREATE POLICY "insert_employee_review_summary"
      ON %I FOR INSERT
      TO authenticated
      WITH CHECK (true)
    ', v_table_name);
    EXECUTE v_sql;

    -- UPDATE policy: Managers/admins can update summaries in their company
    v_sql := format('
      CREATE POLICY "update_employee_review_summary"
      ON %I FOR UPDATE
      USING (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE id = auth.uid() 
          AND LOWER(COALESCE(app_role::TEXT, %L)) IN (''admin'', ''owner'', ''manager'')
        )
      )
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE id = auth.uid() 
          AND LOWER(COALESCE(app_role::TEXT, %L)) IN (''admin'', ''owner'', ''manager'')
        )
      )
    ', v_table_name, v_empty_string, v_empty_string);
    EXECUTE v_sql;

    -- Grant permissions
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON %I TO authenticated', v_table_name);

    RAISE NOTICE 'Fixed % RLS policies - added INSERT and UPDATE policies', v_table_name;
  ELSE
    RAISE NOTICE 'employee_review_summary/employee_review_summaries table does not exist - skipping policy fix';
  END IF;
END $$;
