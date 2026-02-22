-- ============================================================================
-- Check product_variants access and structure
-- Run this to diagnose the 400 errors
-- ============================================================================

-- 1. Check if table exists in stockly schema
SELECT 
  'stockly.product_variants' as location,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'product_variants'
  ) as exists;

-- 2. Check if table exists in public schema
SELECT 
  'public.product_variants (table)' as location,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as exists;

-- 3. Check if view exists in public schema
SELECT 
  'public.product_variants (view)' as location,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'product_variants'
  ) as exists;

-- 4. Check view definition
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public' 
  AND table_name = 'product_variants';

-- 5. Check permissions on public.product_variants
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'product_variants';

-- 6. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'product_variants';

-- 7. Check if security_invoker is set on view
SELECT 
  relname as view_name,
  reloptions as view_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'product_variants'
  AND c.relkind = 'v';

-- 8. Try a test query (this will show the actual error)
SELECT 
  id, 
  stock_item_id, 
  current_price, 
  is_preferred 
FROM public.product_variants 
LIMIT 1;
