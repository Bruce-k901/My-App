-- ============================================================================
-- DIAGNOSTIC: Why are templates missing from Compliance page?
-- ============================================================================

-- Check 1: Total templates in database
SELECT 
  'Check 1: Total Templates' as check_name,
  COUNT(*) as total_templates,
  COUNT(*) FILTER (WHERE is_active = true) as active_templates,
  COUNT(*) FILTER (WHERE is_template_library = true) as library_templates,
  COUNT(*) FILTER (WHERE company_id IS NULL) as global_templates
FROM task_templates;

-- Check 2: Templates that SHOULD appear on Compliance page
-- Compliance page filters: company_id IS NULL AND is_template_library = true AND is_active = true
SELECT 
  'Check 2: Compliance Page Templates' as check_name,
  COUNT(*) as should_appear_count,
  COUNT(DISTINCT category) as categories,
  array_agg(DISTINCT name ORDER BY name) as template_names
FROM task_templates
WHERE company_id IS NULL
  AND is_template_library = true
  AND is_active = true;

-- Check 3: Templates that are EXCLUDED and why
SELECT 
  'Check 3: Excluded Templates' as check_name,
  CASE 
    WHEN company_id IS NOT NULL THEN 'Has company_id (should be NULL)'
    WHEN is_template_library = false THEN 'is_template_library = false (should be true)'
    WHEN is_active = false THEN 'is_active = false (should be true)'
    ELSE 'Other issue'
  END as exclusion_reason,
  COUNT(*) as count,
  array_agg(name ORDER BY name) as template_names
FROM task_templates
WHERE NOT (
  company_id IS NULL 
  AND is_template_library = true 
  AND is_active = true
)
GROUP BY 
  CASE 
    WHEN company_id IS NOT NULL THEN 'Has company_id (should be NULL)'
    WHEN is_template_library = false THEN 'is_template_library = false (should be true)'
    WHEN is_active = false THEN 'is_active = false (should be true)'
    ELSE 'Other issue'
  END;

-- Check 4: Templates with wrong company_id
SELECT 
  'Check 4: Templates with company_id (should be NULL)' as check_name,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  created_at
FROM task_templates
WHERE company_id IS NOT NULL
  AND is_template_library = true
ORDER BY created_at DESC;

-- Check 5: Templates with is_template_library = false (should be true)
SELECT 
  'Check 5: Library Templates Marked False' as check_name,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  created_at
FROM task_templates
WHERE company_id IS NULL
  AND is_template_library = false
  AND is_active = true
ORDER BY created_at DESC;

-- Check 6: Templates with is_active = false
SELECT 
  'Check 6: Inactive Templates' as check_name,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  created_at
FROM task_templates
WHERE company_id IS NULL
  AND is_template_library = true
  AND is_active = false
ORDER BY created_at DESC;

-- Check 7: All templates with their compliance page eligibility
SELECT 
  'Check 7: Template Eligibility Status' as check_name,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  CASE 
    WHEN company_id IS NULL AND is_template_library = true AND is_active = true 
    THEN '✅ WILL APPEAR'
    WHEN company_id IS NOT NULL 
    THEN '❌ Has company_id'
    WHEN is_template_library = false 
    THEN '❌ Not library template'
    WHEN is_active = false 
    THEN '❌ Not active'
    ELSE '❌ Unknown issue'
  END as compliance_page_status
FROM task_templates
ORDER BY 
  CASE 
    WHEN company_id IS NULL AND is_template_library = true AND is_active = true THEN 1
    ELSE 2
  END,
  name;

