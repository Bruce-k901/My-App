-- Verify RLS policies for offer_letters table
-- Run this to check if policies are set up correctly

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'offer_letters';

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'offer_letters'
ORDER BY policyname;

-- Test query as current user (should work if RLS is correct)
-- Replace 'YOUR_APPLICATION_ID' with an actual application_id
SELECT 
  ol.*,
  a.id as application_id,
  a.status as application_status
FROM public.offer_letters ol
JOIN public.applications a ON a.id = ol.application_id
WHERE ol.application_id IN (
  SELECT id FROM public.applications 
  WHERE candidate_id IN (
    SELECT id FROM public.candidates 
    WHERE company_id = (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
)
ORDER BY ol.created_at DESC
LIMIT 10;

-- Check if user has a profile with company_id
SELECT 
  id,
  company_id,
  app_role,
  full_name
FROM public.profiles 
WHERE id = auth.uid();
