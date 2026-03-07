-- Update calculate_monthly_amount() function to correctly handle per_site pricing
-- Pro plan is now per_site (£55/site/month), not flat_rate
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_subscriptions')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans') THEN

    DROP FUNCTION IF EXISTS calculate_monthly_amount() CASCADE;

    CREATE OR REPLACE FUNCTION calculate_monthly_amount()
    RETURNS TRIGGER AS $function$
    DECLARE
      plan_record RECORD;
      calculated_amount DECIMAL(10, 2);
    BEGIN
      -- Get plan details including pricing_model
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
      IF plan_record.pricing_model = 'per_site' THEN
        -- Per site pricing: price_per_site_monthly * site_count
        -- Applies to: Starter (£40/site), Pro (£55/site)
        calculated_amount := plan_record.price_per_site_monthly * COALESCE(NEW.site_count, 0);
        
      ELSIF plan_record.pricing_model = 'flat_rate' THEN
        -- Flat rate pricing: flat_rate_price regardless of site count
        calculated_amount := COALESCE(plan_record.flat_rate_price, 0);
        
      ELSIF plan_record.pricing_model = 'custom' THEN
        -- Enterprise: custom pricing (leave as is or set manually)
        calculated_amount := COALESCE(NEW.monthly_amount, 0);
        
      ELSE
        -- Fallback: per-site pricing (for backwards compatibility)
        calculated_amount := COALESCE(plan_record.price_per_site_monthly, 0) * COALESCE(NEW.site_count, 0);
      END IF;
      
      NEW.monthly_amount := calculated_amount;
      
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    -- Recreate trigger
    DROP TRIGGER IF EXISTS calculate_monthly_amount_trigger ON public.company_subscriptions;
    CREATE TRIGGER calculate_monthly_amount_trigger
      BEFORE INSERT OR UPDATE ON public.company_subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION calculate_monthly_amount();

    -- Update existing subscriptions to recalculate monthly_amount
    UPDATE public.company_subscriptions cs
    SET monthly_amount = (
      CASE 
        WHEN sp.pricing_model = 'per_site' THEN sp.price_per_site_monthly * COALESCE(cs.site_count, 0)
        WHEN sp.pricing_model = 'flat_rate' THEN COALESCE(sp.flat_rate_price, 0)
        ELSE COALESCE(cs.monthly_amount, 0)
      END
    )
    FROM public.subscription_plans sp
    WHERE cs.plan_id = sp.id;

    COMMENT ON FUNCTION calculate_monthly_amount() IS 'Calculates monthly subscription amount based on pricing model (per_site: price × site_count, flat_rate: fixed price, custom: manual)';

    RAISE NOTICE 'Updated calculate_monthly_amount function and trigger';

  ELSE
    RAISE NOTICE '⚠️ Required tables (company_subscriptions, subscription_plans) do not exist yet - skipping function update';
  END IF;
END $$;

