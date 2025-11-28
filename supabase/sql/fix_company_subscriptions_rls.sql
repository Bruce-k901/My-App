-- Fix company_subscriptions RLS policies
-- This table stores subscription information for companies

-- Enable RLS if not already enabled
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their company subscriptions" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Users can create subscriptions for their company" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Users can update their company subscriptions" ON public.company_subscriptions;

-- SELECT: Users can view subscriptions for their company
CREATE POLICY "Users can view their company subscriptions"
  ON public.company_subscriptions
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- INSERT: Users can create subscriptions for their company (typically done by system/admin)
CREATE POLICY "Users can create subscriptions for their company"
  ON public.company_subscriptions
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND LOWER(app_role::text) IN ('admin', 'owner')
    )
  );

-- UPDATE: Only admins can update subscriptions
CREATE POLICY "Users can update their company subscriptions"
  ON public.company_subscriptions
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND LOWER(app_role::text) IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND LOWER(app_role::text) IN ('admin', 'owner')
    )
  );

