-- ⚠️ IMPORTANT: Run APPLY_CONFIRMATION_SYSTEM.sql FIRST!
-- This script will fail if you haven't run APPLY_CONFIRMATION_SYSTEM.sql

-- Generate Confirmation Tokens for Existing Applications
-- Run this SECOND (after APPLY_CONFIRMATION_SYSTEM.sql)

-- Update all existing applications that don't have a token yet
UPDATE public.applications
SET confirmation_token = gen_random_uuid()
WHERE confirmation_token IS NULL;

-- Verify tokens were created
SELECT 
  COUNT(*) as total_applications,
  COUNT(confirmation_token) as applications_with_tokens,
  COUNT(*) - COUNT(confirmation_token) as applications_without_tokens
FROM public.applications;

-- Show sample of applications with tokens
SELECT 
  id,
  status,
  confirmation_token,
  interview_scheduled_at,
  trial_scheduled_at
FROM public.applications
ORDER BY applied_at DESC
LIMIT 10;
