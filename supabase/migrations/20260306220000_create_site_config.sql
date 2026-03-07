-- Migration: 20260305100000_create_site_config.sql
-- Description: Create site_config table for flexible per-site operational configuration
-- Date: 2026-03-05

-- Site configuration: defines operational model per site
CREATE TABLE IF NOT EXISTS public.site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL UNIQUE REFERENCES public.sites(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Stock Sources
  receives_supplier_deliveries BOOLEAN DEFAULT TRUE,
  receives_internal_transfers BOOLEAN DEFAULT FALSE,
  produces_items BOOLEAN DEFAULT FALSE,

  -- Sales Channels
  sells_wholesale BOOLEAN DEFAULT FALSE,
  sells_retail BOOLEAN DEFAULT FALSE,
  sells_online BOOLEAN DEFAULT FALSE,
  sells_internal BOOLEAN DEFAULT FALSE, -- Supplies other sites

  -- Production
  production_recipe_ids UUID[], -- Which recipes this site produces

  -- GP Model
  transfer_pricing_method TEXT DEFAULT 'cost_plus_markup'
    CHECK (transfer_pricing_method IN ('cost_plus_markup', 'wholesale_price', 'fixed_price')),
  transfer_markup_percentage NUMERIC DEFAULT 15.0,

  -- Wizard completion tracking
  setup_completed BOOLEAN DEFAULT FALSE,
  setup_completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_site_config_site ON public.site_config(site_id);
CREATE INDEX IF NOT EXISTS idx_site_config_company ON public.site_config(company_id);

-- Comments for documentation
COMMENT ON TABLE public.site_config IS
  'Per-site operational configuration for stock flow and business model. Defines what each site does: stock sources, production capabilities, sales channels, and GP reporting model.';

COMMENT ON COLUMN public.site_config.receives_supplier_deliveries IS
  'TRUE if this site receives direct deliveries from external suppliers';

COMMENT ON COLUMN public.site_config.receives_internal_transfers IS
  'TRUE if this site receives stock transfers from other sites';

COMMENT ON COLUMN public.site_config.produces_items IS
  'TRUE if this site produces items (has production recipes)';

COMMENT ON COLUMN public.site_config.sells_wholesale IS
  'TRUE if this site sells wholesale to external customers';

COMMENT ON COLUMN public.site_config.sells_retail IS
  'TRUE if this site sells retail to end customers';

COMMENT ON COLUMN public.site_config.sells_online IS
  'TRUE if this site sells online/e-commerce';

COMMENT ON COLUMN public.site_config.sells_internal IS
  'TRUE if this site supplies other sites (internal wholesale)';

COMMENT ON COLUMN public.site_config.production_recipe_ids IS
  'Array of recipe IDs that this site produces for sale/transfer';

COMMENT ON COLUMN public.site_config.transfer_pricing_method IS
  'Method for calculating internal transfer prices: cost_plus_markup (cost + %), wholesale_price (from ingredients_library), fixed_price (per-item pricing)';

COMMENT ON COLUMN public.site_config.transfer_markup_percentage IS
  'Markup percentage for cost_plus_markup method (e.g., 15.0 = 15%)';

COMMENT ON COLUMN public.site_config.setup_completed IS
  'TRUE if the site has completed the Stockly setup wizard';

-- Default config for existing sites (restaurant model)
-- Sites that don't have a config get a simple default
INSERT INTO public.site_config (site_id, company_id, setup_completed)
SELECT id, company_id, FALSE
FROM public.sites
WHERE company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.site_config WHERE site_id = sites.id
  )
ON CONFLICT (site_id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view/edit config for sites in their company
CREATE POLICY "Users can view site_config for their company"
  ON public.site_config FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert site_config for their company"
  ON public.site_config FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update site_config for their company"
  ON public.site_config FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
