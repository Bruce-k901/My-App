-- =====================================================
-- RESET: Specific onboarding test for profile 03f95b9f
-- =====================================================

-- Delete the onboarding assignment
DELETE FROM public.employee_onboarding_assignments
WHERE profile_id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';

-- Optionally: Delete the profile if you want to start completely fresh
-- DELETE FROM public.profiles
-- WHERE id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';

-- Optionally: Reset the offer letter status
-- UPDATE public.offer_letters
-- SET status = 'pending', accepted_at = NULL, onboarding_assignment_id = NULL
-- WHERE onboarding_profile_id = '03f95b9f-7d62-4414-a654-72ac79b9c87d';

SELECT 'Reset complete - you can now accept the offer again' as message;
