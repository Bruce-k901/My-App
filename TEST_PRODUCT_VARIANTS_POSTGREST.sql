-- ============================================================================
-- Test if PostgREST can see and query product_variants
-- Run this to verify the view is accessible
-- ============================================================================

-- 1. Verify view exists
SELECT 
  'View exists' as test,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as result;

-- 2. Check view security_invoker setting
SELECT 
  relname as view_name,
  reloptions as view_options,
  CASE 
    WHEN reloptions IS NULL THEN 'No options set'
    WHEN array_to_string(reloptions, ', ') LIKE '%security_invoker%' THEN 'security_invoker is set'
    ELSE array_to_string(reloptions, ', ')
  END as security_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'product_variants'
  AND c.relkind = 'v';

-- 3. Check permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'product_variants'
ORDER BY grantee, privilege_type;

-- 4. Test direct query (simulating what PostgREST would do)
SELECT 
  'Direct query test' as test,
  COUNT(*) as row_count
FROM public.product_variants;

-- 5. Test with RLS context (simulating authenticated user)
SET ROLE authenticated;
SELECT 
  'RLS context test' as test,
  COUNT(*) as row_count
FROM public.product_variants;
RESET ROLE;

-- 6. Check if underlying table has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'stockly' 
  AND tablename = 'product_variants';

-- 7. Check RLS policies on underlying table
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

-- 8. Test query with specific stock_item_id (matching the error)
-- First, let's see what columns are actually available
SELECT 
  'Available columns' as test,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_variants'
  AND column_name IN ('stock_item_id', 'current_price', 'price_per_base', 'is_preferred', 'is_discontinued')
ORDER BY column_name;

-- 9. Test query with only columns that exist (using dynamic query)
-- This will show what we can actually query
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  -- Build column list from what exists
  SELECT string_agg(column_name, ', ' ORDER BY column_name)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
    AND column_name IN ('stock_item_id', 'current_price', 'price_per_base', 'is_preferred', 'is_discontinued');
  
  -- Execute dynamic query
  IF v_columns IS NOT NULL THEN
    EXECUTE format('SELECT %s FROM public.product_variants LIMIT 1', v_columns);
  ELSE
    RAISE NOTICE 'No matching columns found';
  END IF;
END $$;
