-- Check if offer letters exist for a specific application
-- Replace the application_id with the actual ID you're checking

-- Check all offer letters for an application
SELECT 
  ol.*,
  a.id as application_id,
  a.status as application_status,
  c.full_name as candidate_name,
  j.title as job_title
FROM public.offer_letters ol
JOIN public.applications a ON a.id = ol.application_id
JOIN public.candidates c ON c.id = ol.candidate_id
JOIN public.jobs j ON j.id = ol.job_id
WHERE ol.application_id = '8c632887-39c5-46a4-ba25-873b40daeb0b'  -- Replace with your application ID
ORDER BY ol.created_at DESC;

-- Check if RLS is blocking the query
-- This will show what the user can see
SELECT 
  ol.id,
  ol.application_id,
  ol.status,
  ol.created_at,
  ol.company_id,
  p.id as profile_id,
  p.company_id as profile_company_id,
  p.app_role
FROM public.offer_letters ol
LEFT JOIN public.profiles p ON p.id = auth.uid()
WHERE ol.application_id = '8c632887-39c5-46a4-ba25-873b40daeb0b';

-- Check all offer letters in the system (admin view)
SELECT 
  ol.id,
  ol.application_id,
  ol.candidate_id,
  ol.company_id,
  ol.status,
  ol.created_at,
  a.status as application_status
FROM public.offer_letters ol
LEFT JOIN public.applications a ON a.id = ol.application_id
ORDER BY ol.created_at DESC
LIMIT 20;
