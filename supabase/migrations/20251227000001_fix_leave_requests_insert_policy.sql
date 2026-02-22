-- Fix leave_requests INSERT policy to allow staff/employees to create their own requests
-- The policy should check that:
-- 1. The profile_id matches the current user's profile
-- 2. The company_id matches the user's company
-- This ensures users can only create requests for themselves within their company

DO $$
BEGIN
  -- Only proceed if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
    
    -- Drop the existing policy
    DROP POLICY IF EXISTS "create_own_leave_requests" ON leave_requests;

    -- Create a new policy that allows staff/employees to create their own leave requests
    -- Staff profiles use id = auth.uid() since they don't have auth_user_id set
    -- This matches the pattern used in other policies throughout the codebase
    CREATE POLICY "create_own_leave_requests"
    ON leave_requests FOR INSERT
    WITH CHECK (
      -- The profile_id must belong to the current user
      profile_id IN (
        SELECT id FROM profiles 
        WHERE id = auth.uid()
      )
      -- AND the company_id must match the user's company
      AND company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid()
      )
    );

    -- Ensure INSERT permission is granted to authenticated users
    GRANT INSERT ON leave_requests TO authenticated;
    
    RAISE NOTICE 'Fixed leave_requests INSERT policy - staff can now create their own requests';
  ELSE
    RAISE NOTICE 'leave_requests table does not exist - skipping policy fix';
  END IF;
END $$;
