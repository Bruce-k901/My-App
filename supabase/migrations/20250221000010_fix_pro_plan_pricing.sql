-- Fix Pro plan pricing: Should be £55/site/month (not flat rate)
-- Update Pro plan from flat_rate to per_site pricing
-- Note: This migration will be skipped if subscription_plans table doesn't exist yet

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans') THEN

    UPDATE subscription_plans 
    SET 
      pricing_model = 'per_site',
      flat_rate_price = NULL,
      price_per_site_monthly = 55.00,
      min_sites = 2,
      max_sites = NULL
    WHERE name = 'pro';

    -- Update display to show per site pricing
    UPDATE subscription_plans 
    SET 
      display_name = 'Pro'
    WHERE name = 'pro';

    COMMENT ON COLUMN subscription_plans.pricing_model IS 'per_site: £X per site/month, flat_rate: £X flat/month for all sites, custom: negotiated pricing';
    COMMENT ON COLUMN subscription_plans.price_per_site_monthly IS 'Monthly price per site (for per_site pricing model)';
    COMMENT ON COLUMN subscription_plans.flat_rate_price IS 'Flat monthly rate regardless of site count (for flat_rate pricing model)';

    RAISE NOTICE 'Updated Pro plan pricing to per_site model';

  ELSE
    RAISE NOTICE '⚠️ subscription_plans table does not exist yet - skipping Pro plan pricing update';
  END IF;
END $$;

