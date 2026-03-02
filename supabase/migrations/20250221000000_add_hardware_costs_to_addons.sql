-- Add hardware_cost and monthly_management_cost columns to subscription_addons
-- For Smart Sensors and Maintenance Kits, there's a one-off hardware cost and a monthly management cost per site
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if subscription_addons table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_addons') THEN

    ALTER TABLE public.subscription_addons
    ADD COLUMN IF NOT EXISTS hardware_cost DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS monthly_management_cost DECIMAL(10, 2);

    -- Update Smart Sensor addons with hardware costs and monthly management costs
    -- Hardware cost is per sensor, monthly cost is per site (not per sensor)
    UPDATE public.subscription_addons
    SET 
      hardware_cost = CASE 
        WHEN name = 'smart_sensor_basic' THEN 85.00
        WHEN name = 'smart_sensor_pro' THEN 120.00
        WHEN name = 'smart_sensor_observatory' THEN 150.00
        ELSE NULL
      END,
      monthly_management_cost = CASE
        WHEN name = 'smart_sensor_basic' THEN 35.00
        WHEN name = 'smart_sensor_pro' THEN 60.00
        WHEN name = 'smart_sensor_observatory' THEN 95.00
        ELSE NULL
      END
    WHERE name LIKE 'smart_sensor_%';

    -- Update Maintenance Kit addons with hardware costs
    -- Maintenance kits are one-time purchases, so no monthly management cost
    UPDATE public.subscription_addons
    SET 
      hardware_cost = CASE 
        WHEN name = 'maintenance_kit_basic' THEN 35.00
        WHEN name = 'maintenance_kit_pro' THEN 75.00
        WHEN name = 'maintenance_kit_observatory' THEN 125.00
        ELSE NULL
      END,
      monthly_management_cost = NULL
    WHERE name LIKE 'maintenance_kit_%';

    -- Update personalized onboarding price to £1200 total
    UPDATE public.subscription_addons
    SET 
      price = 1200.00,
      price_type = 'one_time'
    WHERE name = 'personalized_onboarding';

    COMMENT ON COLUMN public.subscription_addons.hardware_cost IS 'One-off hardware cost per unit (sensor or tag)';
    COMMENT ON COLUMN public.subscription_addons.monthly_management_cost IS 'Monthly management cost per site (for Smart Sensors only)';

  ELSE
    RAISE NOTICE '⚠️ subscription_addons table does not exist yet - skipping hardware costs addition';
  END IF;

  -- Add columns to company_addon_purchases to track monthly recurring costs
  -- Only if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_addon_purchases') THEN
    ALTER TABLE public.company_addon_purchases
    ADD COLUMN IF NOT EXISTS monthly_recurring_cost DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS hardware_cost_total DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS quantity_per_site INTEGER DEFAULT 1;

    COMMENT ON COLUMN public.company_addon_purchases.monthly_recurring_cost IS 'Monthly recurring cost for this addon purchase (for Smart Sensors)';
    COMMENT ON COLUMN public.company_addon_purchases.hardware_cost_total IS 'Total one-time hardware cost for this purchase';
    COMMENT ON COLUMN public.company_addon_purchases.quantity_per_site IS 'Quantity per site (sensors or tags) for tiered addons';
  ELSE
    RAISE NOTICE '⚠️ company_addon_purchases table does not exist yet - skipping columns addition';
  END IF;
END $$;

