-- =====================================================
-- CREATE: Missing onboarding assignment for test profile
-- =====================================================

-- Create assignment for the test profile
INSERT INTO public.employee_onboarding_assignments (
  profile_id,
  company_id,
  pack_id,
  sent_at
)
SELECT 
  '03f95b9f-7d62-4414-a654-72ac79b9c87d',
  p.company_id,
  NULL, -- No pack assigned yet
  NOW()
FROM public.profiles p
WHERE p.id = '03f95b9f-7d62-4414-a654-72ac79b9c87d'
ON CONFLICT DO NOTHING;

-- Verify it was created
SELECT 
  eoa.id,
  eoa.profile_id,
  eoa.company_id,
  eoa.pack_id,
  eoa.sent_at,
  p.full_name,
  p.email
FROM public.employee_onboarding_assignments eoa
JOIN public.profiles p ON p.id = eoa.profile_id
WHERE eoa.profile_id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';
