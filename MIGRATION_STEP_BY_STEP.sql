-- ============================================
-- STEP-BY-STEP MIGRATION FOR SUBSCRIPTION SCHEMA
-- Run each section separately and verify before moving on
-- ============================================

-- ============================================
-- STEP 1: Verify Prerequisites
-- ============================================
-- Run this first to make sure the companies table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'companies'
) AS companies_table_exists;

-- If this returns false, you need to create the companies table first!

-- ============================================
-- STEP 2: Create subscription_plans table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_per_site_monthly DECIMAL(10, 2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verify Step 2:
SELECT 'subscription_plans table created' AS status, COUNT(*) AS row_count FROM subscription_plans;

-- ============================================
-- STEP 3: Seed subscription plans
-- ============================================
INSERT INTO public.subscription_plans (name, display_name, price_per_site_monthly, features) VALUES
  ('starter', 'Starter', 40.00, '["Digital checklists & task logging", "Temperature logging & alerts", "Maintenance & PPM tracking", "Audit-ready reports", "Mobile & desktop access"]'::jsonb),
  ('pro', 'Pro', 55.00, '["Everything in Starter", "Multi-site dashboards", "Scheduled reporting", "Custom task templates", "Corrective action tracking", "Supplier & asset register", "Role-based permissions"]'::jsonb),
  ('enterprise', 'Enterprise', 0.00, '["Everything in Pro", "API & integration access", "Custom workflows", "SSO & data security", "Advanced analytics", "Dedicated account manager", "SLA & rollout assistance"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Verify Step 3:
SELECT name, display_name, price_per_site_monthly FROM subscription_plans ORDER BY name;

-- ============================================
-- STEP 4: Create company_subscriptions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL,
  trial_used BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'past_due')),
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  billing_email TEXT,
  billing_address JSONB,
  payment_method TEXT DEFAULT 'manual_invoice',
  site_count INTEGER DEFAULT 0,
  monthly_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Verify Step 4:
SELECT 'company_subscriptions table created' AS status;

-- ============================================
-- STEP 5: Create invoices table
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.company_subscriptions(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_method TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verify Step 5:
SELECT 'invoices table created' AS status;

-- ============================================
-- STEP 6: Create data_export_requests table
-- ============================================
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  export_type TEXT NOT NULL DEFAULT 'full' CHECK (export_type IN ('full', 'tasks', 'incidents', 'assets', 'sops')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  file_size_bytes BIGINT,
  expires_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verify Step 6:
SELECT 'data_export_requests table created' AS status;

-- ============================================
-- STEP 7: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id ON public.company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON public.company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_trial_ends_at ON public.company_subscriptions(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_company_id ON public.data_export_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON public.data_export_requests(status);

-- Verify Step 7:
SELECT 'indexes created' AS status;

-- ============================================
-- STEP 8: Enable RLS
-- ============================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- Verify Step 8:
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_plans', 'company_subscriptions', 'invoices', 'data_export_requests')
ORDER BY tablename;

-- ============================================
-- STEP 9: Create RLS Policies
-- ============================================
-- Subscription plans: Public read
DROP POLICY IF EXISTS subscription_plans_select_public ON public.subscription_plans;
CREATE POLICY subscription_plans_select_public
  ON public.subscription_plans
  FOR SELECT
  USING (true);

-- Company subscriptions: Users can view their company's subscription
DROP POLICY IF EXISTS company_subscriptions_select_own_company ON public.company_subscriptions;
CREATE POLICY company_subscriptions_select_own_company
  ON public.company_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_subscriptions.company_id
    )
  );

-- Invoices: Users can view their company's invoices
DROP POLICY IF EXISTS invoices_select_own_company ON public.invoices;
CREATE POLICY invoices_select_own_company
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = invoices.company_id
    )
  );

-- Data export requests: Users can view their company's export requests
DROP POLICY IF EXISTS data_export_requests_select_own_company ON public.data_export_requests;
CREATE POLICY data_export_requests_select_own_company
  ON public.data_export_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = data_export_requests.company_id
    )
  );

-- Data export requests: Users can create export requests for their company
DROP POLICY IF EXISTS data_export_requests_insert_own_company ON public.data_export_requests;
CREATE POLICY data_export_requests_insert_own_company
  ON public.data_export_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = data_export_requests.company_id
    )
  );

-- Verify Step 9:
SELECT 'RLS policies created' AS status;

-- ============================================
-- STEP 10: Create Functions
-- ============================================
-- Function to automatically set trial_ends_at
CREATE OR REPLACE FUNCTION set_trial_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_started_at IS NOT NULL AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NEW.trial_started_at + INTERVAL '60 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update subscription status
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'trial' AND NEW.trial_ends_at < NOW() AND NEW.subscription_started_at IS NULL THEN
    NEW.status := 'expired';
  END IF;
  IF NEW.status = 'active' AND NEW.subscription_ends_at IS NOT NULL AND NEW.subscription_ends_at < NOW() THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate monthly amount
CREATE OR REPLACE FUNCTION calculate_monthly_amount()
RETURNS TRIGGER AS $$
DECLARE
  plan_price DECIMAL(10, 2);
BEGIN
  SELECT price_per_site_monthly INTO plan_price
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;
  
  IF plan_price IS NOT NULL THEN
    NEW.monthly_amount := plan_price * COALESCE(NEW.site_count, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify Step 10:
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('set_trial_end_date', 'update_subscription_status', 'calculate_monthly_amount', 'update_updated_at_column')
ORDER BY routine_name;

-- ============================================
-- STEP 11: Create Triggers
-- ============================================
DROP TRIGGER IF EXISTS set_trial_end_date_trigger ON public.company_subscriptions;
CREATE TRIGGER set_trial_end_date_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_end_date();

DROP TRIGGER IF EXISTS update_subscription_status_trigger ON public.company_subscriptions;
CREATE TRIGGER update_subscription_status_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_status();

DROP TRIGGER IF EXISTS calculate_monthly_amount_trigger ON public.company_subscriptions;
CREATE TRIGGER calculate_monthly_amount_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_monthly_amount();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_subscriptions_updated_at ON public.company_subscriptions;
CREATE TRIGGER update_company_subscriptions_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify Step 11:
SELECT 'triggers created' AS status;

-- ============================================
-- FINAL VERIFICATION
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_plans', 'company_subscriptions', 'invoices', 'data_export_requests')
ORDER BY table_name;

-- Should return 4 rows:
-- company_subscriptions
-- data_export_requests
-- invoices
-- subscription_plans


