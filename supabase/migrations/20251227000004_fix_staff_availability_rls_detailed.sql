-- Fix RLS policies for staff_availability_patterns and staff_availability_overrides
-- This migration ensures staff can save their availability patterns

DO $$
DECLARE
  r RECORD;
BEGIN
  -- =====================================================
  -- STAFF AVAILABILITY PATTERNS
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_availability_patterns') THEN
    
    -- Ensure RLS is enabled
    ALTER TABLE staff_availability_patterns ENABLE ROW LEVEL SECURITY;

    -- Drop ALL existing policies (using a more aggressive approach)
    FOR r IN (
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'staff_availability_patterns'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON staff_availability_patterns', r.policyname);
    END LOOP;

    -- Staff can view their own patterns
    CREATE POLICY "staff_view_own_patterns"
    ON staff_availability_patterns FOR SELECT
    USING (
      profile_id = auth.uid()
    );

    -- Staff can insert their own patterns
    CREATE POLICY "staff_insert_own_patterns"
    ON staff_availability_patterns FOR INSERT
    WITH CHECK (
      profile_id = auth.uid()
      AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    -- Staff can update their own patterns
    CREATE POLICY "staff_update_own_patterns"
    ON staff_availability_patterns FOR UPDATE
    USING (
      profile_id = auth.uid()
    )
    WITH CHECK (
      profile_id = auth.uid()
      AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    -- Staff can delete their own patterns (via soft delete with is_active)
    CREATE POLICY "staff_delete_own_patterns"
    ON staff_availability_patterns FOR DELETE
    USING (
      profile_id = auth.uid()
    );

    -- Managers can view all patterns in their company
    CREATE POLICY "managers_view_all_patterns"
    ON staff_availability_patterns FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON staff_availability_patterns TO authenticated;

    RAISE NOTICE '✅ Fixed staff_availability_patterns RLS policies';
  ELSE
    RAISE NOTICE '⚠️ staff_availability_patterns table does not exist';
  END IF;

  -- =====================================================
  -- STAFF AVAILABILITY OVERRIDES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_availability_overrides') THEN
    
    -- Ensure RLS is enabled
    ALTER TABLE staff_availability_overrides ENABLE ROW LEVEL SECURITY;

    -- Drop ALL existing policies
    FOR r IN (
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'staff_availability_overrides'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON staff_availability_overrides', r.policyname);
    END LOOP;

    -- Staff can view their own overrides
    CREATE POLICY "staff_view_own_overrides"
    ON staff_availability_overrides FOR SELECT
    USING (
      profile_id = auth.uid()
    );

    -- Staff can insert their own overrides
    CREATE POLICY "staff_insert_own_overrides"
    ON staff_availability_overrides FOR INSERT
    WITH CHECK (
      profile_id = auth.uid()
      AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    -- Staff can update their own overrides
    CREATE POLICY "staff_update_own_overrides"
    ON staff_availability_overrides FOR UPDATE
    USING (
      profile_id = auth.uid()
    )
    WITH CHECK (
      profile_id = auth.uid()
      AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

    -- Staff can delete their own overrides
    CREATE POLICY "staff_delete_own_overrides"
    ON staff_availability_overrides FOR DELETE
    USING (
      profile_id = auth.uid()
    );

    -- Managers can view all overrides in their company
    CREATE POLICY "managers_view_all_overrides"
    ON staff_availability_overrides FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    -- Managers can update overrides (e.g., approve/reject requests)
    CREATE POLICY "managers_update_overrides"
    ON staff_availability_overrides FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON staff_availability_overrides TO authenticated;

    RAISE NOTICE '✅ Fixed staff_availability_overrides RLS policies';
  ELSE
    RAISE NOTICE '⚠️ staff_availability_overrides table does not exist';
  END IF;

END $$;

-- Query to verify policies (run this separately to check)
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename IN ('staff_availability_patterns', 'staff_availability_overrides')
-- ORDER BY tablename, policyname;

