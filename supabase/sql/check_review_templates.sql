-- Check if review templates exist
-- Run this in Supabase SQL Editor to verify templates

-- Check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'review_template_type')
ORDER BY enumsortorder;

-- Check existing templates
SELECT 
  id,
  name,
  template_type,
  is_system_template,
  is_active,
  created_at
FROM review_templates
WHERE is_system_template = true
ORDER BY template_type, name;

-- Count by type
SELECT 
  template_type,
  COUNT(*) as count
FROM review_templates
WHERE is_system_template = true
GROUP BY template_type
ORDER BY template_type;

