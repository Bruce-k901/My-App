-- ============================================
-- CREATE TRIAL SUBSCRIPTIONS FOR EXISTING COMPANIES
-- Run this after the migration to set up subscriptions for all existing companies
-- ============================================

-- Create trial subscriptions for all existing companies that don't have one
INSERT INTO company_subscriptions (
  company_id, 
  plan_id, 
  trial_started_at, 
  trial_ends_at, 
  trial_used, 
  status, 
  site_count
)
SELECT 
  c.id AS company_id,
  (SELECT id FROM subscription_plans WHERE name = 'starter' LIMIT 1) AS plan_id,
  COALESCE(c.created_at, NOW()) AS trial_started_at, -- Use company creation date if available
  COALESCE(c.created_at, NOW()) + INTERVAL '60 days' AS trial_ends_at,
  true AS trial_used,
  'trial' AS status,
  (SELECT COUNT(*) FROM sites WHERE company_id = c.id) AS site_count
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_subscriptions WHERE company_id = c.id
)
RETURNING 
  company_id,
  trial_started_at,
  trial_ends_at,
  status,
  site_count;

-- Verify the subscriptions were created
SELECT 
  c.name AS company_name,
  sp.display_name AS plan_name,
  cs.status,
  cs.trial_started_at,
  cs.trial_ends_at,
  cs.site_count,
  cs.monthly_amount,
  CASE 
    WHEN cs.trial_ends_at > NOW() THEN 
      (cs.trial_ends_at - NOW())::text || ' days remaining'
    ELSE 
      'Trial expired'
  END AS trial_status
FROM company_subscriptions cs
JOIN companies c ON c.id = cs.company_id
JOIN subscription_plans sp ON sp.id = cs.plan_id
ORDER BY cs.trial_ends_at DESC;

