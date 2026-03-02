-- COMPLETE FIX FOR JOSH SIMMONS
-- This fixes both issues:
-- 1. Org chart showing him in Head Office (site_id is NULL)
-- 2. Onboarding badge still showing (status is 'onboarding')

-- ==============================================================================
-- QUICK FIX (Run this if you just want to fix Josh now)
-- ==============================================================================

-- Option 1: If home_site is already set to St Kaths
UPDATE profiles
SET 
  site_id = home_site,           -- Copy home_site to site_id (fixes org chart)
  status = 'active'               -- Change from 'onboarding' to 'active' (removes badge)
WHERE 
  full_name ILIKE '%josh%simmons%'
  AND site_id IS NULL             -- Only update if site_id is missing
  AND home_site IS NOT NULL;      -- And home_site is set

-- Option 2: If you want to explicitly set St Kaths (safer)
-- First, get the St Kaths site ID:
-- SELECT id FROM sites WHERE name ILIKE '%kath%';
-- Then uncomment and run this (replace [ST_KATHS_ID] with actual ID):
/*
UPDATE profiles
SET 
  site_id = '[ST_KATHS_ID]',
  home_site = '[ST_KATHS_ID]',
  status = 'active'
WHERE 
  full_name ILIKE '%josh%simmons%';
*/

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- Check Josh's profile after the fix
SELECT 
  p.full_name,
  p.email,
  p.app_role,
  p.site_id,
  p.home_site,
  p.status,
  s.name as site_name,
  CASE 
    WHEN p.site_id IS NOT NULL AND p.status = 'active' 
    THEN '✅ FIXED! Josh should now:
    - Appear under St Kaths in org chart
    - Have NO onboarding badge'
    WHEN p.site_id IS NULL 
    THEN '❌ site_id still NULL - will show in Head Office'
    WHEN p.status = 'onboarding'
    THEN '❌ status still "onboarding" - badge will show'
    ELSE '⚠️ Check the values above'
  END as status_check
FROM profiles p
LEFT JOIN sites s ON p.site_id = s.id
WHERE 
  p.full_name ILIKE '%josh%simmons%';

-- ==============================================================================
-- BULK FIX (If other employees have the same issue)
-- ==============================================================================

-- Find all employees with home_site but no site_id
SELECT 
  p.full_name,
  p.email,
  s.name as home_site_name,
  p.status,
  '⚠️ Will show in Head Office instead of site' as issue
FROM profiles p
LEFT JOIN sites s ON p.home_site = s.id
WHERE 
  p.site_id IS NULL 
  AND p.home_site IS NOT NULL
ORDER BY p.full_name;

-- Fix all of them at once
/*
UPDATE profiles
SET 
  site_id = home_site,
  status = 'active'
WHERE 
  site_id IS NULL 
  AND home_site IS NOT NULL;
*/

-- ==============================================================================
-- ROOT CAUSE EXPLANATION
-- ==============================================================================

/*
WHY THIS HAPPENED:

The site employee form (src/app/dashboard/people/directory/new-site/page.tsx) had a bug:
- It was saving to `home_site` field
- But NOT saving to `site_id` field
- The org chart only checks `site_id` to determine site placement

This has been FIXED in the code (just now), so new employees won't have this issue.
But Josh (and any others added before the fix) need this SQL update.

STATUS BADGE:
- New employees are set to status='onboarding' by default
- The badge shows until status is changed to 'active'
- Currently there's no UI to change this (TODO)
- This SQL fixes it manually
*/

