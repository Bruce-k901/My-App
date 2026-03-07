-- Fix RLS policies for offer_letters table
-- The 406 error suggests the RLS policies are blocking queries
-- This fix uses EXISTS instead of IN subqueries for better performance and NULL handling
--
-- IMPORTANT: Run this SQL in your Supabase SQL Editor to fix the 406 error
-- The original policies used IN subqueries which can fail with NULL values
-- This version uses EXISTS which is more reliable

-- Drop existing policies
DROP POLICY IF EXISTS "company_members_can_view_offers" ON public.offer_letters;
DROP POLICY IF EXISTS "managers_can_manage_offers" ON public.offer_letters;
DROP POLICY IF EXISTS "candidates_can_access_via_token" ON public.offer_letters;
DROP POLICY IF EXISTS "candidates_can_update_via_token" ON public.offer_letters;

-- Recreate policies with better structure
-- Company members can view offer letters for their company
CREATE POLICY "company_members_can_view_offers"
ON public.offer_letters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND company_id IS NOT NULL
    AND company_id = offer_letters.company_id
  )
);

-- Managers can manage offers for their company
CREATE POLICY "managers_can_manage_offers"
ON public.offer_letters FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND company_id IS NOT NULL
    AND company_id = offer_letters.company_id
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND company_id IS NOT NULL
    AND company_id = offer_letters.company_id
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- Candidates can view/update their offers via token (for acceptance)
-- This policy allows access when the offer-token header matches
CREATE POLICY "candidates_can_access_via_token"
ON public.offer_letters FOR SELECT
USING (
  offer_token = current_setting('request.headers', true)::json->>'offer-token'
  AND status IN ('sent', 'viewed')
  AND expires_at > now()
);

-- Also allow candidates to update their offers via token
CREATE POLICY "candidates_can_update_via_token"
ON public.offer_letters FOR UPDATE
USING (
  offer_token = current_setting('request.headers', true)::json->>'offer-token'
  AND status IN ('sent', 'viewed')
  AND expires_at > now()
)
WITH CHECK (
  offer_token = current_setting('request.headers', true)::json->>'offer-token'
);
