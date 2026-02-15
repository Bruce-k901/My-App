-- Fix: Add INSERT policy for messaging_channels table (Final Version)
-- This version uses a security definer function to bypass RLS recursion issues

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "Users can insert channels" ON messaging_channels;

-- First, ensure we have a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.check_user_can_create_channel(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_company_id UUID;
BEGIN
  -- Get user's company_id (bypasses RLS due to SECURITY DEFINER)
  SELECT company_id INTO v_user_company_id
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Allow if company matches or user has no company set
  RETURN (v_user_company_id IS NULL OR v_user_company_id = p_company_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_user_can_create_channel(UUID, UUID) TO authenticated;

-- Create INSERT policy using the helper function
CREATE POLICY "Users can create channels in their company" ON messaging_channels
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND public.check_user_can_create_channel(auth.uid(), company_id)
);

-- Grant necessary permissions
GRANT INSERT ON messaging_channels TO authenticated;
GRANT SELECT ON messaging_channels TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification: Check if policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channels'
AND cmd = 'INSERT';

-- Test the function (replace with your actual user ID and company ID)
-- SELECT public.check_user_can_create_channel(
--   'YOUR_USER_ID_HERE'::uuid,
--   'fae1b377-859d-4ba6-bce2-d8aaf0044517'::uuid
-- );

