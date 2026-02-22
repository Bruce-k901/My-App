-- =====================================================
-- CREATE: Force create onboarding assignment
-- =====================================================

-- First, let's see what profile we're working with
SELECT 
  id,
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
WHERE id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';

-- Now create the assignment (without ON CONFLICT)
INSERT INTO public.employee_onboarding_assignments (
  id,
  profile_id,
  company_id,
  pack_id,
  sent_at,
  sent_by
)
VALUES (
  gen_random_uuid(),
  '03f95b9f-7d62-4414-a654-72ac79b9c87d',
  'f99510bc-b290-47c6-8f12-282bea67bd91', -- EAG company ID
  NULL,
  NOW(),
  '8066c4f2-fbff-4255-be96-71acf151473d' -- Your user ID
);

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
