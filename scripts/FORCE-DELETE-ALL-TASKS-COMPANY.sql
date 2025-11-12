-- ============================================================================
-- FORCE DELETE ALL TASKS FOR COMPANY
-- This script uses multiple methods to ensure ALL tasks are deleted
-- Company ID: f99510bc-b290-47c6-8f12-282bea67bd91
-- ============================================================================

-- STEP 1: Count ALL tasks (using different methods to catch everything)
SELECT 'Method 1: Direct UUID' as method, COUNT(*) as count
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'::uuid

UNION ALL

SELECT 'Method 2: Text comparison' as method, COUNT(*) as count
FROM checklist_tasks
WHERE company_id::text = 'f99510bc-b290-47c6-8f12-282bea67bd91'

UNION ALL

SELECT 'Method 3: Pattern match' as method, COUNT(*) as count
FROM checklist_tasks
WHERE company_id::text LIKE 'f99510bc%';

-- STEP 2: Show ALL task IDs that will be deleted
SELECT 
  id,
  company_id::text as company_id_text,
  template_id,
  site_id,
  status,
  due_date,
  created_at
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'::uuid
ORDER BY created_at DESC;

-- STEP 3: DELETE using UUID cast (most reliable)
DELETE FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'::uuid;

-- STEP 4: DELETE using text comparison (catch any edge cases)
DELETE FROM checklist_tasks
WHERE company_id::text = 'f99510bc-b290-47c6-8f12-282bea67bd91';

-- STEP 5: Verify deletion
SELECT 
  'VERIFICATION - UUID method' as check_method,
  COUNT(*) as remaining_tasks
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'::uuid

UNION ALL

SELECT 'VERIFICATION - Text method' as check_method,
  COUNT(*) as remaining_tasks
FROM checklist_tasks
WHERE company_id::text = 'f99510bc-b290-47c6-8f12-282bea67bd91'

UNION ALL

SELECT 'VERIFICATION - Pattern match' as check_method,
  COUNT(*) as remaining_tasks
FROM checklist_tasks
WHERE company_id::text LIKE 'f99510bc%';

-- All should return 0 if deletion was successful

-- STEP 6: Check for any remaining tasks (comprehensive check)
SELECT 
  'FINAL CHECK' as info,
  COUNT(*) as total_remaining,
  COUNT(DISTINCT company_id) as unique_companies
FROM checklist_tasks
WHERE company_id::text LIKE '%f99510bc%'
   OR company_id::text LIKE '%b290-47c6%'
   OR company_id::text LIKE '%8f12%'
   OR company_id::text LIKE '%282bea67bd91%';




