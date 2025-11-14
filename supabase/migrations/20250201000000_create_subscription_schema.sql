-- Subscription and Billing Schema
-- Supports 60-day free trial, manual invoicing, and data export

-- Subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'starter', 'pro', 'enterprise'
  display_name TEXT NOT NULL,
  price_per_site_monthly DECIMAL(10, 2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company subscriptions table
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  
  -- Trial tracking
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL, -- trial_started_at + 60 days
  trial_used BOOLEAN DEFAULT true,
  
  -- Subscription status
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'past_due')),
  
  -- Subscription dates
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Billing info (for manual invoicing)
  billing_email TEXT,
  billing_address JSONB, -- {line1, line2, city, postcode, country}
  payment_method TEXT DEFAULT 'manual_invoice', -- 'manual_invoice', 'stripe' (future)
  
  -- Site count tracking
  site_count INTEGER DEFAULT 0,
  monthly_amount DECIMAL(10, 2), -- Calculated: price_per_site * site_count
  
  -- Metadata
  notes TEXT, -- Admin notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Invoices table (for manual invoicing)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.company_subscriptions(id) ON DELETE CASCADE,
  
  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE, -- e.g., "INV-2025-001"
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Payment tracking
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_method TEXT,
  
  -- Line items (JSONB for flexibility)
  line_items JSONB DEFAULT '[]'::jsonb, -- [{description, quantity, unit_price, total}]
  
  -- Billing period
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data export requests table (for GDPR/compliance)
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  
  -- Export details
  export_type TEXT NOT NULL DEFAULT 'full' CHECK (export_type IN ('full', 'tasks', 'incidents', 'assets', 'sops')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- File storage
  file_url TEXT, -- URL to exported file (stored in Supabase Storage)
  file_size_bytes BIGINT,
  expires_at TIMESTAMPTZ, -- Link expiration (e.g., 30 days)
  
  -- Metadata
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id ON public.company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON public.company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_trial_ends_at ON public.company_subscriptions(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_company_id ON public.data_export_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON public.data_export_requests(status);

-- RLS Policies
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- Subscription plans: Public read (for pricing page)
CREATE POLICY subscription_plans_select_public
  ON public.subscription_plans
  FOR SELECT
  USING (true);

-- Company subscriptions: Users can view their company's subscription
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

-- Function to automatically set trial_ends_at (60 days from trial_started_at)
CREATE OR REPLACE FUNCTION set_trial_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_started_at IS NOT NULL AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NEW.trial_started_at + INTERVAL '60 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_trial_end_date_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_end_date();

-- Function to update subscription status based on dates
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If trial ended and no subscription started, mark as expired
  IF NEW.status = 'trial' AND NEW.trial_ends_at < NOW() AND NEW.subscription_started_at IS NULL THEN
    NEW.status := 'expired';
  END IF;
  
  -- If subscription ended, mark as expired
  IF NEW.status = 'active' AND NEW.subscription_ends_at IS NOT NULL AND NEW.subscription_ends_at < NOW() THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_status_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_status();

-- Function to calculate monthly amount based on plan and site count
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

CREATE TRIGGER calculate_monthly_amount_trigger
  BEFORE INSERT OR UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_monthly_amount();

-- Seed subscription plans
INSERT INTO public.subscription_plans (name, display_name, price_per_site_monthly, features) VALUES
  ('starter', 'Starter', 40.00, '["Digital checklists & task logging", "Temperature logging & alerts", "Maintenance & PPM tracking", "Audit-ready reports", "Mobile & desktop access"]'::jsonb),
  ('pro', 'Pro', 55.00, '["Everything in Starter", "Multi-site dashboards", "Scheduled reporting", "Custom task templates", "Corrective action tracking", "Supplier & asset register", "Role-based permissions"]'::jsonb),
  ('enterprise', 'Enterprise', 0.00, '["Everything in Pro", "API & integration access", "Custom workflows", "SSO & data security", "Advanced analytics", "Dedicated account manager", "SLA & rollout assistance"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_subscriptions_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans and pricing';
COMMENT ON TABLE public.company_subscriptions IS 'Company subscription tracking with 60-day trial support';
COMMENT ON TABLE public.invoices IS 'Manual invoice tracking for billing';
COMMENT ON TABLE public.data_export_requests IS 'GDPR-compliant data export requests for customers';

