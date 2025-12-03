-- ============================================================================
-- Fix Site Save Errors
-- ============================================================================
-- This script fixes RLS policies for company_subscriptions and ensures
-- the security definer functions exist for proper access control.
-- ============================================================================

-- Ensure the security definer functions exist (from fix_profiles_rls_company_access.sql)
-- These functions are required by the company_subscriptions RLS policies

-- Get user's company_id (bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT company_id INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Fix company_subscriptions RLS policies
-- Enable RLS if not already enabled
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their company subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Users can create subscriptions for their company" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Users can update their company subscriptions" ON public.company_subscriptions;

-- SELECT: Users can view subscriptions for their company
-- Use security definer function to avoid infinite recursion
CREATE POLICY "Users can view their company subscriptions"
  ON public.company_subscriptions
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

-- INSERT: Users can create subscriptions for their company
-- Use security definer function to avoid infinite recursion
CREATE POLICY "Users can create subscriptions for their company"
  ON public.company_subscriptions
  FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
  );

-- UPDATE: Users can update subscriptions for their company
-- Use security definer function to avoid infinite recursion
CREATE POLICY "Users can update their company subscriptions"
  ON public.company_subscriptions
  FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
  );

-- Verify the policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'company_subscriptions'
    AND policyname IN (
      'Users can view their company subscriptions',
      'Users can create subscriptions for their company',
      'Users can update their company subscriptions'
    );
  
  IF policy_count = 3 THEN
    RAISE NOTICE '✅ All 3 company_subscriptions RLS policies created successfully';
  ELSE
    RAISE WARNING '⚠️  Expected 3 policies, found %', policy_count;
  END IF;
END $$;

