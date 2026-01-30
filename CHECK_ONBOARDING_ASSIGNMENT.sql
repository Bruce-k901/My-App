-- Check if onboarding assignment exists for this profile
SELECT 
  eoa.id,
  eoa.profile_id,
  eoa.company_id,
  eoa.pack_id,
  eoa.sent_at,
  eoa.start_date,
  p.full_name,
  p.email,
  cop.name as pack_name
FROM public.employee_onboarding_assignments eoa
LEFT JOIN public.profiles p ON p.id = eoa.profile_id
LEFT JOIN public.company_onboarding_packs cop ON cop.id = eoa.pack_id
WHERE eoa.profile_id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';

-- Also check the profile exists
SELECT id, email, full_name, company_id, app_role
FROM public.profiles
WHERE id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';

-- Check if there's an offer letter for this
SELECT 
  ol.id,
  ol.status,
  ol.onboarding_profile_id,
  ol.onboarding_assignment_id,
  c.full_name as candidate_name,
  c.email as candidate_email
FROM public.offer_letters ol
LEFT JOIN public.candidates c ON c.id = ol.candidate_id
WHERE ol.onboarding_profile_id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';
