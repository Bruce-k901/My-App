-- ============================================================================
-- Diagnose product_variants PostgREST access issues
-- This will help us understand why PostgREST is returning 400 errors
-- ============================================================================

-- 1. Check if view exists and is accessible
SELECT 
  'View exists' as check,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as result;

-- 2. Check view definition
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public' 
  AND table_name = 'product_variants';

-- 3. Check permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'product_variants'
ORDER BY grantee, privilege_type;

-- 4. Check security_invoker setting
SELECT 
  relname as view_name,
  reloptions as view_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'product_variants'
  AND c.relkind = 'v';

-- 5. Check RLS on underlying table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'stockly' 
  AND tablename = 'product_variants';

-- 6. Test direct query (this should work)
SELECT 
  'Direct query test' as test,
  COUNT(*) as count
FROM public.product_variants;

-- 7. Check if stockly_company_access function exists
SELECT 
  'Function exists' as check,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'stockly'
    AND p.proname = 'stockly_company_access'
  ) as result;

-- 8. Check if public.stockly_company_access exists (might be needed)
SELECT 
  'Public function exists' as check,
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.proname = 'stockly_company_access'
  ) as result;

-- 9. Try to see what columns PostgREST would see
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_variants'
ORDER BY ordinal_position;
