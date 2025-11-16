-- ============================================
-- VERIFICATION QUERIES FOR SUBSCRIPTION SETUP
-- Run these to confirm everything is working
-- ============================================

-- 1. Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_plans', 'company_subscriptions', 'invoices', 'data_export_requests')
ORDER BY table_name;

-- Should return 4 rows

-- 2. Verify subscription plans were seeded
SELECT name, display_name, price_per_site_monthly, features
FROM subscription_plans
ORDER BY name;

-- Should return 3 plans: starter (£40), pro (£55), enterprise (£0)

-- 3. Check if any companies exist (to create subscriptions for them)
SELECT id, name, created_at
FROM companies
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if any subscriptions already exist
SELECT 
  cs.id,
  c.name AS company_name,
  sp.display_name AS plan_name,
  cs.status,
  cs.trial_started_at,
  cs.trial_ends_at,
  cs.site_count,
  cs.monthly_amount
FROM company_subscriptions cs
JOIN companies c ON c.id = cs.company_id
JOIN subscription_plans sp ON sp.id = cs.plan_id
ORDER BY cs.created_at DESC;

-- 5. Verify RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_plans', 'company_subscriptions', 'invoices', 'data_export_requests')
ORDER BY tablename;

-- All should show rowsecurity = true

-- 6. Verify functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('set_trial_end_date', 'update_subscription_status', 'calculate_monthly_amount', 'update_updated_at_column')
ORDER BY routine_name;

-- Should return 4 functions

-- 7. Verify triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('subscription_plans', 'company_subscriptions', 'invoices')
ORDER BY event_object_table, trigger_name;

-- Should return multiple triggers


