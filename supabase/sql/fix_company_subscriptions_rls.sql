-- Fix company_subscriptions RLS policies
-- This table stores subscription information for companies

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

