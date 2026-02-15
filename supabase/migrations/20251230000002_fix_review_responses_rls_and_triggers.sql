-- Fix review_responses RLS policies and check for triggers/functions
-- that might reference the wrong column name

DO $$
BEGIN
  -- Check if review_responses table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_responses') THEN
    
    -- Drop and recreate RLS policies to ensure they don't reference wrong columns
    DROP POLICY IF EXISTS "view_review_responses" ON review_responses;
    DROP POLICY IF EXISTS "manage_review_responses" ON review_responses;
    DROP POLICY IF EXISTS "view_own_responses" ON review_responses;
    DROP POLICY IF EXISTS "manage_responses" ON review_responses;
    
    -- Recreate the correct RLS policies
    CREATE POLICY "view_review_responses" ON review_responses FOR SELECT
      USING (
        review_id IN (
          SELECT id FROM reviews 
          WHERE employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
          OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        )
      );

    CREATE POLICY "manage_review_responses" ON review_responses FOR ALL
      USING (
        review_id IN (
          SELECT id FROM reviews 
          WHERE employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
          OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        )
      )
      WITH CHECK (
        review_id IN (
          SELECT id FROM reviews 
          WHERE employee_id IN (SELECT id FROM profiles WHERE id = auth.uid())
          OR manager_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        )
      );
    
    RAISE NOTICE 'Fixed review_responses RLS policies';
  END IF;
END $$;

-- Check for and drop any triggers that might reference wrong columns
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN 
    SELECT trigger_name, event_manipulation, event_object_table
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'review_responses'
  LOOP
    -- Drop the trigger (we'll recreate if needed)
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trigger_rec.trigger_name) || ' ON review_responses';
    RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
  END LOOP;
END $$;

-- Check for and fix any functions that might reference review_responses with wrong column
DO $$
DECLARE
  func_rec RECORD;
BEGIN
  FOR func_rec IN 
    SELECT routine_name, routine_definition
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_definition LIKE '%review_responses%'
    AND routine_definition LIKE '%respondent%'
    AND routine_definition NOT LIKE '%respondent_type%'
    AND routine_definition NOT LIKE '%respondent_id%'
  LOOP
    RAISE NOTICE 'Found function that might reference wrong column: %', func_rec.routine_name;
    -- Note: We can't automatically fix functions, but we can log them
  END LOOP;
END $$;


