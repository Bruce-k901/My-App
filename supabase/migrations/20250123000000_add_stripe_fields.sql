-- Add Stripe integration fields to existing tables

-- Add stripe_customer_id to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add stripe_subscription_id to company_subscriptions table
ALTER TABLE public.company_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

-- Add stripe_price_id to subscription_plans table (for Stripe Price objects)
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add stripe_product_id to subscription_plans table (for Stripe Product objects)
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Add stripe_invoice_id to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT UNIQUE;

-- Create indexes for Stripe IDs
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id 
ON public.companies(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_stripe_subscription_id 
ON public.company_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id 
ON public.invoices(stripe_invoice_id);

-- Add comment
COMMENT ON COLUMN public.companies.stripe_customer_id IS 'Stripe Customer ID for payment processing';
COMMENT ON COLUMN public.company_subscriptions.stripe_subscription_id IS 'Stripe Subscription ID';
COMMENT ON COLUMN public.subscription_plans.stripe_price_id IS 'Stripe Price ID for recurring billing';
COMMENT ON COLUMN public.subscription_plans.stripe_product_id IS 'Stripe Product ID';
COMMENT ON COLUMN public.invoices.stripe_invoice_id IS 'Stripe Invoice ID';
