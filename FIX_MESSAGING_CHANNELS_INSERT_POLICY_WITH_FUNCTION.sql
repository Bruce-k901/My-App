-- Fix: Add INSERT policy using security definer function to avoid RLS recursion
-- This is the same pattern used in the original messaging system migration

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

-- Drop all existing INSERT policies
DROP POLICY IF EXISTS "Admins can create channels" ON messaging_channels;
DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "Users can insert channels" ON messaging_channels;
DROP POLICY IF EXISTS "Allow all authenticated inserts" ON messaging_channels;

-- Ensure the check_user_company_match function exists (from original migration)
-- This function bypasses RLS to check company membership
CREATE OR REPLACE FUNCTION public.check_user_company_match(user_uuid UUID, comp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- If company_id is NULL, allow
  IF comp_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's company_id (bypasses RLS due to SECURITY DEFINER)
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Allow if company matches or user has no company set
  RETURN (user_company_id IS NULL OR user_company_id = comp_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_user_company_match(UUID, UUID) TO authenticated;

-- Create INSERT policy using the security definer function
-- This avoids RLS recursion issues when checking profiles table
CREATE POLICY "Users can create channels in their company" ON messaging_channels
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND public.check_user_company_match(auth.uid(), company_id)
);

-- Grant necessary permissions
GRANT INSERT ON messaging_channels TO authenticated;
GRANT SELECT ON messaging_channels TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification: Check that policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channels'
AND cmd = 'INSERT';

-- Test the function (replace with your actual user ID)
-- SELECT public.check_user_company_match(
--   auth.uid(),
--   'fae1b377-859d-4ba6-bce2-d8aaf0044517'::uuid
-- );

