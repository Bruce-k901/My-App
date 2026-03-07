-- Fix leave_balances RLS policies to work with staff profiles (id = auth.uid())
-- Also allow automatic balance creation via triggers

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances') THEN
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "view_own_balances" ON leave_balances;
    DROP POLICY IF EXISTS "managers_view_balances" ON leave_balances;
    DROP POLICY IF EXISTS "admins_manage_balances" ON leave_balances;
    DROP POLICY IF EXISTS "managers_insert_balances" ON leave_balances;
    DROP POLICY IF EXISTS "system_create_balances" ON leave_balances;

    -- Policy 1: Users can view their own balances
    CREATE POLICY "view_own_balances"
    ON leave_balances FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    );

    -- Policy 2: Managers/Admins can view all balances in their company
    CREATE POLICY "managers_view_balances"
    ON leave_balances FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    -- Policy 3: Allow balance creation for leave requests
    -- This allows the initialize_leave_balance function to work when staff create leave requests
    CREATE POLICY "system_create_balances"
    ON leave_balances FOR INSERT
    WITH CHECK (
      -- Allow if profile_id matches current user (staff creating their own balance)
      profile_id IN (SELECT id FROM profiles WHERE id = auth.uid())
      -- OR if user is manager/admin creating for someone in their company
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );
    
    -- Also update the initialize_leave_balance function to be SECURITY DEFINER
    -- This allows it to bypass RLS when creating balances via triggers
    CREATE OR REPLACE FUNCTION initialize_leave_balance(
      p_profile_id UUID,
      p_leave_type_id UUID,
      p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
    )
    RETURNS UUID
    SECURITY DEFINER -- Allow function to bypass RLS
    AS $function$
    DECLARE
      v_balance_id UUID;
      v_company_id UUID;
      v_entitlement DECIMAL;
      v_deducts BOOLEAN;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances') THEN
        SELECT p.company_id, lt.deducts_from_allowance
        INTO v_company_id, v_deducts
        FROM profiles p
        JOIN leave_types lt ON lt.id = p_leave_type_id
        WHERE p.id = p_profile_id;
        
        IF v_deducts THEN
          SELECT COALESCE(annual_leave_allowance, 28)
          INTO v_entitlement
          FROM profiles WHERE id = p_profile_id;
        ELSE
          v_entitlement := 0;
        END IF;
        
        INSERT INTO leave_balances (company_id, profile_id, leave_type_id, year, entitled_days)
        VALUES (v_company_id, p_profile_id, p_leave_type_id, p_year, v_entitlement)
        ON CONFLICT (profile_id, leave_type_id, year) 
        DO UPDATE SET updated_at = now()
        RETURNING id INTO v_balance_id;
      END IF;
      
      RETURN v_balance_id;
    END;
    $function$ LANGUAGE plpgsql;

    -- Policy 4: Admins/Owners can manage all balances
    CREATE POLICY "admins_manage_balances"
    ON leave_balances FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    );

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE ON leave_balances TO authenticated;

    RAISE NOTICE 'Fixed leave_balances RLS policies - staff can now view their own balances and system can create balances';
  ELSE
    RAISE NOTICE 'leave_balances table does not exist - skipping policy fix';
  END IF;
END $$;

