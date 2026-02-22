-- Check if assignment exists (bypassing RLS)
SET LOCAL ROLE postgres;

SELECT 
  eoa.id,
  eoa.profile_id,
  eoa.company_id,
  eoa.pack_id,
  eoa.sent_at,
  p.full_name,
  p.email,
  p.company_id as profile_company_id
FROM public.employee_onboarding_assignments eoa
JOIN public.profiles p ON p.id = eoa.profile_id
WHERE eoa.profile_id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';

-- Also check total count
SELECT COUNT(*) as total_assignments
FROM public.employee_onboarding_assignments;

RESET ROLE;
