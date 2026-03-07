-- =====================================================
-- RESET TEST RECRUITMENT DATA
-- =====================================================
-- Use this to clean up test candidates/applications/offers
-- so you can test the flow again with the same email

-- Replace 'test@example.com' with the email you're testing with
-- Or remove the WHERE clause to delete ALL recruitment test data

-- Delete offer letters
DELETE FROM public.offer_letters
WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email = 'test@example.com' -- CHANGE THIS TO YOUR TEST EMAIL
);

-- Delete applications
DELETE FROM public.applications
WHERE candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email = 'test@example.com' -- CHANGE THIS TO YOUR TEST EMAIL
);

-- Delete candidates
DELETE FROM public.candidates
WHERE email = 'test@example.com'; -- CHANGE THIS TO YOUR TEST EMAIL

-- Optional: Also delete the profile if it was created
DELETE FROM public.profiles
WHERE email = 'test@example.com'; -- CHANGE THIS TO YOUR TEST EMAIL

-- =====================================================
-- OR: DELETE ALL TEST DATA (use carefully!)
-- =====================================================
-- Uncomment these lines to delete ALL recruitment test data:

-- DELETE FROM public.offer_letters WHERE TRUE;
-- DELETE FROM public.applications WHERE TRUE;
-- DELETE FROM public.candidates WHERE TRUE;
-- Note: Don't delete profiles - they might be real employees

SELECT 'Test data cleaned up!' as status;
