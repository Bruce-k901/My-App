-- ============================================
-- UPDATE PRICING MODEL
-- New pricing: 1 site = £40/month, Multiple sites = £55/month flat
-- Add personalized onboarding and other add-ons
-- Note: This migration will be skipped if subscription_plans table doesn't exist yet
-- ============================================

-- Update subscription plans with new pricing model (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans') THEN
    UPDATE subscription_plans 
    SET 
      display_name = 'Starter',
      price_per_site_monthly = 40.00,
      features = '["Digital checklists & task logging", "Temperature logging & alerts", "Maintenance & PPM tracking", "Audit-ready reports", "Mobile & desktop access"]'::jsonb
    WHERE name = 'starter';

    UPDATE subscription_plans 
    SET 
      display_name = 'Pro',
      price_per_site_monthly = 55.00,
      features = '["Everything in Starter", "Multi-site dashboards", "Scheduled reporting", "Custom task templates", "Corrective action tracking", "Supplier & asset register", "Role-based permissions"]'::jsonb
    WHERE name = 'pro';

    -- Enterprise pricing - set to 0 for now (custom pricing)
    UPDATE subscription_plans 
    SET 
      display_name = 'Enterprise',
      price_per_site_monthly = 0.00,
      features = '["Everything in Pro", "API & integration access", "Custom workflows", "SSO & data security", "Advanced analytics", "Dedicated account manager", "SLA & rollout assistance"]'::jsonb
    WHERE name = 'enterprise';

    -- Add pricing metadata to plans table
    ALTER TABLE subscription_plans 
    ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'per_site' CHECK (pricing_model IN ('per_site', 'flat_rate', 'custom')),
    ADD COLUMN IF NOT EXISTS flat_rate_price DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS min_sites INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS max_sites INTEGER;

    -- Update pricing model for plans
    UPDATE subscription_plans 
    SET 
      pricing_model = 'per_site',
      min_sites = 1,
      max_sites = 1
    WHERE name = 'starter';

    UPDATE subscription_plans 
    SET 
      pricing_model = 'flat_rate',
      flat_rate_price = 55.00,
      min_sites = 2,
      max_sites = NULL
    WHERE name = 'pro';

    UPDATE subscription_plans 
    SET 
      pricing_model = 'custom',
      flat_rate_price = NULL,
      min_sites = NULL,
      max_sites = NULL
    WHERE name = 'enterprise';
  ELSE
    RAISE NOTICE '⚠️ subscription_plans table does not exist yet - skipping pricing model updates';
  END IF;
END $$;

-- Create add-ons table
CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'one_time' CHECK (price_type IN ('one_time', 'monthly', 'per_site_one_time', 'per_site_monthly')),
  category TEXT DEFAULT 'service', -- 'service', 'hardware', 'reporting'
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create company addon purchases table (only if companies table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    CREATE TABLE IF NOT EXISTS public.company_addon_purchases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      addon_id UUID NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      purchased_at TIMESTAMPTZ DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
      cancelled_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add foreign keys conditionally
    ALTER TABLE public.company_addon_purchases 
    ADD CONSTRAINT company_addon_purchases_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    
    ALTER TABLE public.company_addon_purchases 
    ADD CONSTRAINT company_addon_purchases_addon_id_fkey 
    FOREIGN KEY (addon_id) REFERENCES public.subscription_addons(id);

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_company_addon_purchases_company_id ON public.company_addon_purchases(company_id);
    CREATE INDEX IF NOT EXISTS idx_company_addon_purchases_addon_id ON public.company_addon_purchases(addon_id);
    CREATE INDEX IF NOT EXISTS idx_company_addon_purchases_status ON public.company_addon_purchases(status);
  ELSE
    RAISE NOTICE '⚠️ companies table does not exist yet - skipping company_addon_purchases table creation';
  END IF;
END $$;

-- RLS Policies (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_addons') THEN
    ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

    -- Addons: Public read (for pricing page)
    DROP POLICY IF EXISTS subscription_addons_select_public ON public.subscription_addons;
    CREATE POLICY subscription_addons_select_public
      ON public.subscription_addons
      FOR SELECT
      USING (is_active = true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_addon_purchases')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.company_addon_purchases ENABLE ROW LEVEL SECURITY;

    -- Company addon purchases: Users can view their company's addons
    DROP POLICY IF EXISTS company_addon_purchases_select_own_company ON public.company_addon_purchases;
    CREATE POLICY company_addon_purchases_select_own_company
      ON public.company_addon_purchases
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = company_addon_purchases.company_id
        )
      );
  END IF;
END $$;

-- Seed add-ons
INSERT INTO public.subscription_addons (name, display_name, description, price, price_type, category, features) VALUES
  (
    'personalized_onboarding',
    'Personalized Onboarding',
    'Checkly team handles your complete onboarding, including site setup, template configuration, and staff training.',
    200.00,
    'per_site_one_time',
    'service',
    '["Complete site setup", "Template configuration", "Staff training sessions", "Custom workflow setup", "Dedicated onboarding specialist"]'::jsonb
  ),
  (
    'smart_sensor_basic',
    'Smart Sensors - Basic',
    'Automatic hourly temperature logs, daily compliance reports, EHO-ready export, and basic email alerts.',
    35.00,
    'per_site_monthly',
    'hardware',
    '["Automatic hourly temperature logs", "Data stored in Checkly", "Daily compliance report", "EHO-ready export", "Basic alerting (email only)"]'::jsonb
  ),
  (
    'smart_sensor_pro',
    'Smart Sensors - Pro',
    'Everything in Basic plus SMS/push alerts, multi-threshold alarms, 24hr breach tracking, analytics, and hardware warranty.',
    60.00,
    'per_site_monthly',
    'hardware',
    '["Everything in Basic", "SMS + push alerts", "Multi-threshold alarms", "24hr breach tracking", "Analytics (patterns, slow cooling, warm spots)", "Replacement hardware warranty", "Annual probe replacement"]'::jsonb
  ),
  (
    'smart_sensor_observatory',
    'Smart Sensors - Observatory',
    'Complete peace of mind. Everything in Pro plus live dashboard, weekly reports, predictive warnings, engineer automation, and 24/7 escalation.',
    95.00,
    'per_site_monthly',
    'hardware',
    '["Everything in Pro", "Live monitoring dashboard", "Weekly health report", "Predictive failure warnings", "Engineer callout automation", "24/7 response escalation", "Multi-site group analytics", "Priority hardware replacement", "Multi-unit discount"]'::jsonb
  ),
  (
    'maintenance_kit_basic',
    'Maintenance Hardware Kit - Basic',
    'QR asset tags with setup guide and contractor instructions. Give every asset a digital passport for fault reporting, PPM check-ins, and daily checks.',
    35.00,
    'per_site_one_time',
    'hardware',
    '["QR asset tags", "Setup guide", "Contractor scan instructions", "Replacement tag pack"]'::jsonb
  ),
  (
    'maintenance_kit_pro',
    'Maintenance Hardware Kit - Pro',
    'QR + NFC tags with better durability. Waterproof fridge-safe variants. Contractors can tap with phone for faster check-ins.',
    75.00,
    'per_site_one_time',
    'hardware',
    '["QR + NFC tags", "Waterproof fridge-safe variants", "Better durability", "Faster contractor check-ins", "Setup guide", "Contractor scan instructions"]'::jsonb
  ),
  (
    'maintenance_kit_observatory',
    'Maintenance Hardware Kit - Observatory',
    'Laser-etched metal tags with premium branding. Multi-site pack bundles available. Replacement tags free for life.',
    125.00,
    'per_site_one_time',
    'hardware',
    '["Laser-etched metal tags", "Premium branding", "Multi-site pack bundles", "Replacement tags free for life", "QR + NFC", "Waterproof variants"]'::jsonb
  ),
  (
    'white_label_reports',
    'White-Label Reports',
    'Custom branded reports for audits and EHO inspections with your company logo and branding.',
    50.00,
    'monthly',
    'reporting',
    '["Custom branding", "Logo integration", "Audit-ready reports", "EHO inspection formats", "PDF export"]'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  category = EXCLUDED.category,
  features = EXCLUDED.features;

-- Updated_at trigger for addons (only if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_addons')
     AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_subscription_addons_updated_at ON public.subscription_addons;
    CREATE TRIGGER update_subscription_addons_updated_at
      BEFORE UPDATE ON public.subscription_addons
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_addon_purchases')
     AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_company_addon_purchases_updated_at ON public.company_addon_purchases;
    CREATE TRIGGER update_company_addon_purchases_updated_at
      BEFORE UPDATE ON public.company_addon_purchases
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comments (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_addons') THEN
    COMMENT ON TABLE public.subscription_addons IS 'Optional add-ons available for purchase';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_addon_purchases') THEN
    COMMENT ON TABLE public.company_addon_purchases IS 'Company purchases of subscription add-ons';
  END IF;
END $$;

