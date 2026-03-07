-- ============================================================================
-- POS Menu Items table — stores synced catalog from Square (or other POS).
-- ============================================================================

-- ─── 1. Create table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stockly.pos_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pos_provider TEXT NOT NULL DEFAULT 'square',
  catalog_item_id TEXT NOT NULL,
  catalog_variation_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  category_name TEXT,
  variation_name TEXT,
  price NUMERIC(10,2),
  currency TEXT DEFAULT 'GBP',
  image_url TEXT,
  modifiers JSONB,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, pos_provider, catalog_item_id, catalog_variation_id)
);

-- ─── 2. Indexes ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pos_menu_items_company
  ON stockly.pos_menu_items(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_menu_items_catalog
  ON stockly.pos_menu_items(company_id, pos_provider, catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_pos_menu_items_category
  ON stockly.pos_menu_items(company_id, category_name) WHERE category_name IS NOT NULL;

-- ─── 3. RLS ────────────────────────────────────────────────────────────────

ALTER TABLE stockly.pos_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_menu_items_select" ON stockly.pos_menu_items
  FOR SELECT USING (stockly.stockly_company_access(company_id));

CREATE POLICY "pos_menu_items_service" ON stockly.pos_menu_items
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- ─── 4. Grants ─────────────────────────────────────────────────────────────

GRANT ALL ON stockly.pos_menu_items TO service_role;
GRANT SELECT ON stockly.pos_menu_items TO authenticated;

-- ─── 5. Public view ────────────────────────────────────────────────────────

CREATE VIEW public.pos_menu_items AS SELECT * FROM stockly.pos_menu_items;
ALTER VIEW public.pos_menu_items SET (security_invoker = true);

GRANT SELECT ON public.pos_menu_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_menu_items TO service_role;

-- INSTEAD OF INSERT trigger for the view
CREATE OR REPLACE FUNCTION public.insert_pos_menu_items()
RETURNS TRIGGER AS $$
BEGIN
  NEW.id := COALESCE(NEW.id, gen_random_uuid());
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.synced_at := COALESCE(NEW.synced_at, now());

  INSERT INTO stockly.pos_menu_items (
    id, company_id, pos_provider, catalog_item_id, catalog_variation_id,
    name, description, category_id, category_name, variation_name,
    price, currency, image_url, modifiers,
    is_active, is_deleted, synced_at, created_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.pos_provider, NEW.catalog_item_id, NEW.catalog_variation_id,
    NEW.name, NEW.description, NEW.category_id, NEW.category_name, NEW.variation_name,
    NEW.price, NEW.currency, NEW.image_url, NEW.modifiers,
    NEW.is_active, NEW.is_deleted, NEW.synced_at, NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER pos_menu_items_insert_trigger
  INSTEAD OF INSERT ON public.pos_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.insert_pos_menu_items();

-- ─── 6. Upsert RPC (used by catalog sync) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_pos_menu_items(items JSONB)
RETURNS INTEGER AS $$
DECLARE
  item JSONB;
  upserted_count INTEGER := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    INSERT INTO stockly.pos_menu_items (
      company_id, pos_provider, catalog_item_id, catalog_variation_id,
      name, description, category_id, category_name, variation_name,
      price, currency, image_url, modifiers,
      is_active, is_deleted, synced_at
    ) VALUES (
      (item->>'company_id')::UUID,
      COALESCE(item->>'pos_provider', 'square'),
      item->>'catalog_item_id',
      item->>'catalog_variation_id',
      COALESCE(item->>'name', 'Unknown Item'),
      item->>'description',
      item->>'category_id',
      item->>'category_name',
      item->>'variation_name',
      (item->>'price')::NUMERIC,
      COALESCE(item->>'currency', 'GBP'),
      item->>'image_url',
      (item->'modifiers')::JSONB,
      COALESCE((item->>'is_active')::BOOLEAN, true),
      COALESCE((item->>'is_deleted')::BOOLEAN, false),
      now()
    )
    ON CONFLICT (company_id, pos_provider, catalog_item_id, catalog_variation_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      category_id = EXCLUDED.category_id,
      category_name = EXCLUDED.category_name,
      variation_name = EXCLUDED.variation_name,
      price = EXCLUDED.price,
      currency = EXCLUDED.currency,
      image_url = EXCLUDED.image_url,
      modifiers = EXCLUDED.modifiers,
      is_active = EXCLUDED.is_active,
      is_deleted = EXCLUDED.is_deleted,
      synced_at = now();

    upserted_count := upserted_count + 1;
  END LOOP;
  RETURN upserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.upsert_pos_menu_items(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_pos_menu_items(JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
