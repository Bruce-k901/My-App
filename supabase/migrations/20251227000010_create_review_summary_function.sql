-- Create a SECURITY DEFINER function to handle employee_review_summary inserts/updates
-- This bypasses RLS and allows automatic summary creation when reviews are created
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
    
    -- Create or replace function to upsert review summary
    -- This function will be called by triggers or application code
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

    -- Grant execute permission to authenticated users
    GRANT EXECUTE ON FUNCTION upsert_employee_review_summary(UUID, UUID) TO authenticated;

    RAISE NOTICE 'Created upsert_employee_review_summary function for table %', v_table_name;
  ELSE
    RAISE NOTICE 'employee_review_summary/employee_review_summaries table does not exist - skipping function creation';
  END IF;
END $$;

