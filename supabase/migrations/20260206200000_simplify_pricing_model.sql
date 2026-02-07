-- ============================================
-- SIMPLIFY PRICING MODEL
-- Single plan: £300/site/month, everything included
-- Run in Supabase SQL Editor
-- ============================================

-- Step 1: Add is_active column if it doesn't exist
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 2: Archive old plans (don't delete — preserves history)
UPDATE subscription_plans SET is_active = false
WHERE name IN ('starter', 'pro', 'enterprise');

-- Step 3: Insert the new unified Opsly plan
INSERT INTO subscription_plans (
  name, display_name, price_per_site_monthly,
  pricing_model, is_active, features
) VALUES (
  'opsly',
  'Opsly',
  300.00,
  'per_site',
  true,
  '["Checkly - Compliance & Quality Control",
    "Stockly - Inventory & Purchasing",
    "Teamly - People & Payroll",
    "Planly - Production & Orders",
    "Assetly - Asset Management",
    "Msgly - Team Communication",
    "AI-powered invoice processing",
    "Unlimited users per site",
    "60-day free trial"]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_per_site_monthly = EXCLUDED.price_per_site_monthly,
  pricing_model = EXCLUDED.pricing_model,
  is_active = EXCLUDED.is_active,
  features = EXCLUDED.features;

-- Step 4: Deactivate ALL add-ons (sensors, tags, reports, etc.)
UPDATE subscription_addons SET is_active = false;

-- Step 5: Update onboarding add-on with new pricing and reactivate
UPDATE subscription_addons SET
  display_name = 'Personalized Onboarding',
  description = 'Opsly team handles your complete onboarding including site setup, bulk data imports, template configuration, and 2-day on-site staff training.',
  price = 750.00,
  is_active = true,
  features = '["Complete site setup & configuration",
    "Bulk data import (products, suppliers, staff, recipes)",
    "Template & checklist configuration",
    "2-day on-site staff training",
    "Custom workflow setup",
    "Dedicated onboarding specialist"]'::jsonb
WHERE name = 'personalized_onboarding';

-- Step 6: Remove auto-switch trigger (no more Starter/Pro switching)
DROP TRIGGER IF EXISTS auto_update_plan_by_site_count_trigger
  ON public.company_subscriptions;
DROP FUNCTION IF EXISTS auto_update_plan_by_site_count();

-- Step 7: Simplify monthly amount calculation
-- Now just: price_per_site × site_count
DROP FUNCTION IF EXISTS calculate_monthly_amount() CASCADE;

CREATE OR REPLACE FUNCTION calculate_monthly_amount()
RETURNS TRIGGER AS $$
DECLARE
  price_per_site DECIMAL(10, 2);
BEGIN
  SELECT price_per_site_monthly INTO price_per_site
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;

  NEW.monthly_amount := COALESCE(price_per_site, 0)
    * COALESCE(NEW.site_count, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER calculate_monthly_amount_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_monthly_amount();

-- Step 8: Migrate existing subscriptions to new Opsly plan
UPDATE company_subscriptions SET
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'opsly' LIMIT 1)
WHERE plan_id IN (
  SELECT id FROM subscription_plans WHERE name IN ('starter', 'pro', 'enterprise')
);

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check active plans (should only show 'opsly')
-- SELECT name, display_name, price_per_site_monthly, is_active
-- FROM subscription_plans ORDER BY is_active DESC;

-- Check active add-ons (should only show 'personalized_onboarding')
-- SELECT name, display_name, price, is_active
-- FROM subscription_addons WHERE is_active = true;

-- Check all subscriptions are on the new plan
-- SELECT cs.id, cs.plan_id, sp.name as plan_name, cs.site_count, cs.monthly_amount
-- FROM company_subscriptions cs
-- JOIN subscription_plans sp ON sp.id = cs.plan_id;
