-- Fix profiles RLS to allow managers to see profiles in their company
-- This is needed because leave_balances_enhanced_view joins profiles table
-- If profiles RLS blocks the join, managers can't see other employees' balances

-- Check existing policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Drop restrictive policies that might block managers from seeing company profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON profiles;

-- Create policy: Users can view their own profile
CREATE POLICY IF NOT EXISTS "profiles_select_own"
ON profiles FOR SELECT
USING (
  id = auth.uid() 
  OR auth_user_id = auth.uid()
);

-- Create policy: Managers/Admins/Owners can view profiles in their company
CREATE POLICY IF NOT EXISTS "profiles_select_company"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
      AND p.company_id = profiles.company_id
      AND LOWER(COALESCE(p.app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
);

