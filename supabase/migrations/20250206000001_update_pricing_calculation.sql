-- ============================================
-- UPDATE PRICING CALCULATION FUNCTION
-- Handles new pricing model: 1 site = £40, Multiple sites = £55 flat
-- ============================================

-- Drop old function and recreate with new logic
DROP FUNCTION IF EXISTS calculate_monthly_amount() CASCADE;

CREATE OR REPLACE FUNCTION calculate_monthly_amount()
RETURNS TRIGGER AS $$
DECLARE
  plan_record RECORD;
  calculated_amount DECIMAL(10, 2);
BEGIN
  -- Get plan details
  SELECT 
    pricing_model,
    price_per_site_monthly,
    flat_rate_price,
    min_sites,
    max_sites
  INTO plan_record
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;
  
  IF plan_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate based on pricing model
  IF plan_record.pricing_model = 'flat_rate' THEN
    -- Pro plan: flat rate for 2+ sites
    IF COALESCE(NEW.site_count, 0) >= plan_record.min_sites THEN
      calculated_amount := plan_record.flat_rate_price;
    ELSE
      -- If less than min_sites, use per-site pricing
      calculated_amount := plan_record.price_per_site_monthly * COALESCE(NEW.site_count, 0);
    END IF;
  ELSIF plan_record.pricing_model = 'per_site' THEN
    -- Starter plan: per site pricing
    calculated_amount := plan_record.price_per_site_monthly * COALESCE(NEW.site_count, 0);
  ELSIF plan_record.pricing_model = 'custom' THEN
    -- Enterprise: custom pricing (set manually)
    calculated_amount := COALESCE(NEW.monthly_amount, 0);
  ELSE
    -- Fallback to per-site pricing
    calculated_amount := plan_record.price_per_site_monthly * COALESCE(NEW.site_count, 0);
  END IF;
  
  NEW.monthly_amount := calculated_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER calculate_monthly_amount_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_monthly_amount();

-- Function to auto-update plan based on site count
-- If 1 site -> Starter, if 2+ sites -> Pro
CREATE OR REPLACE FUNCTION auto_update_plan_by_site_count()
RETURNS TRIGGER AS $$
DECLARE
  site_count INTEGER;
  current_plan_name TEXT;
  new_plan_id UUID;
BEGIN
  -- Get current site count
  SELECT COUNT(*) INTO site_count
  FROM sites
  WHERE company_id = NEW.company_id;
  
  -- Get current plan name
  SELECT sp.name INTO current_plan_name
  FROM subscription_plans sp
  WHERE sp.id = NEW.plan_id;
  
  -- Auto-switch plan based on site count
  IF site_count = 1 AND current_plan_name != 'starter' THEN
    -- Switch to Starter for single site
    SELECT id INTO new_plan_id FROM subscription_plans WHERE name = 'starter' LIMIT 1;
    IF new_plan_id IS NOT NULL THEN
      NEW.plan_id := new_plan_id;
    END IF;
  ELSIF site_count >= 2 AND current_plan_name = 'starter' THEN
    -- Switch to Pro for multiple sites
    SELECT id INTO new_plan_id FROM subscription_plans WHERE name = 'pro' LIMIT 1;
    IF new_plan_id IS NOT NULL THEN
      NEW.plan_id := new_plan_id;
    END IF;
  END IF;
  
  -- Update site count
  NEW.site_count := site_count;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update plan when site count changes
CREATE TRIGGER auto_update_plan_by_site_count_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_plan_by_site_count();

COMMENT ON FUNCTION calculate_monthly_amount() IS 'Calculates monthly subscription amount based on pricing model (per-site, flat-rate, or custom)';
COMMENT ON FUNCTION auto_update_plan_by_site_count() IS 'Automatically switches between Starter (1 site) and Pro (2+ sites) based on site count';

