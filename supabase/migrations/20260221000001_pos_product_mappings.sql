-- ============================================================================
-- POS Product Mappings
-- Maps Square (or other POS) catalog items to Stockly stock items/recipes
-- for COGS calculation and stock drawdown.
-- ============================================================================

CREATE TABLE IF NOT EXISTS stockly.pos_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,

  -- POS item identity
  pos_provider TEXT NOT NULL DEFAULT 'square',
  pos_product_id TEXT NOT NULL,
  pos_product_name TEXT NOT NULL,
  pos_category_name TEXT,

  -- Mapping targets (one or the other, or null if unmapped)
  stock_item_id UUID REFERENCES stockly.stock_items(id) ON DELETE SET NULL,
  recipe_id UUID, -- FK to recipes table if it exists

  -- Flags
  is_auto_matched BOOLEAN DEFAULT FALSE,
  is_ignored BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One mapping per POS item per company
  UNIQUE(company_id, pos_provider, pos_product_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_product_mappings_company
  ON stockly.pos_product_mappings(company_id, pos_provider);
CREATE INDEX IF NOT EXISTS idx_pos_product_mappings_pos_id
  ON stockly.pos_product_mappings(pos_product_id);

-- RLS Policies
ALTER TABLE stockly.pos_product_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company mappings" ON stockly.pos_product_mappings
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage mappings" ON stockly.pos_product_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND p.company_id = stockly.pos_product_mappings.company_id
        AND r.name IN ('owner', 'admin')
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    )
  );
