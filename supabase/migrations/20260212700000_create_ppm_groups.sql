-- PPM Asset Groups: allows grouping assets at the same site for joint PPM servicing
-- A single PPM callout covers all assets in a group

-- 1. Create ppm_groups table
CREATE TABLE IF NOT EXISTS public.ppm_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ppm_contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  ppm_contractor_name TEXT,
  ppm_frequency_months INTEGER,
  last_service_date DATE,
  next_service_date DATE,
  ppm_status TEXT DEFAULT 'unscheduled',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create junction table
CREATE TABLE IF NOT EXISTS public.ppm_group_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ppm_group_id UUID NOT NULL REFERENCES ppm_groups(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ppm_group_asset UNIQUE (ppm_group_id, asset_id)
);

-- 3. Add ppm_group_id to assets
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS ppm_group_id UUID REFERENCES ppm_groups(id) ON DELETE SET NULL;

-- 4. Add ppm_group_id to callouts and make asset_id nullable
ALTER TABLE public.callouts
  ALTER COLUMN asset_id DROP NOT NULL;

ALTER TABLE public.callouts
  ADD COLUMN IF NOT EXISTS ppm_group_id UUID REFERENCES ppm_groups(id) ON DELETE SET NULL;

ALTER TABLE public.callouts
  ADD CONSTRAINT chk_callout_target
  CHECK (asset_id IS NOT NULL OR ppm_group_id IS NOT NULL);

-- 5. Add ppm_group_id to ppm_service_events and make asset_id nullable
ALTER TABLE public.ppm_service_events
  ALTER COLUMN asset_id DROP NOT NULL;

ALTER TABLE public.ppm_service_events
  ADD COLUMN IF NOT EXISTS ppm_group_id UUID REFERENCES ppm_groups(id) ON DELETE SET NULL;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_ppm_groups_company ON ppm_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_ppm_groups_site ON ppm_groups(site_id);
CREATE INDEX IF NOT EXISTS idx_ppm_groups_status ON ppm_groups(ppm_status);
CREATE INDEX IF NOT EXISTS idx_ppm_groups_next_service ON ppm_groups(next_service_date);
CREATE INDEX IF NOT EXISTS idx_ppm_group_assets_group ON ppm_group_assets(ppm_group_id);
CREATE INDEX IF NOT EXISTS idx_ppm_group_assets_asset ON ppm_group_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_ppm_group ON assets(ppm_group_id) WHERE ppm_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_callouts_ppm_group ON callouts(ppm_group_id) WHERE ppm_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ppm_service_events_group ON ppm_service_events(ppm_group_id) WHERE ppm_group_id IS NOT NULL;

-- 7. RLS
ALTER TABLE public.ppm_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ppm_groups"
  ON public.ppm_groups FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE public.ppm_group_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage ppm_group_assets"
  ON public.ppm_group_assets FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Auto-update ppm_status on ppm_groups
CREATE OR REPLACE FUNCTION update_ppm_group_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.next_service_date IS NULL THEN
    NEW.ppm_status := 'unscheduled';
  ELSIF NEW.next_service_date < CURRENT_DATE THEN
    NEW.ppm_status := 'overdue';
  ELSIF NEW.next_service_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.ppm_status := 'due_soon';
  ELSE
    NEW.ppm_status := 'upcoming';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ppm_group_status
  BEFORE INSERT OR UPDATE OF next_service_date ON ppm_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_ppm_group_status();

-- 9. Keep assets.ppm_group_id in sync with junction table
CREATE OR REPLACE FUNCTION sync_asset_ppm_group()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE assets SET ppm_group_id = NEW.ppm_group_id WHERE id = NEW.asset_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE assets SET ppm_group_id = NULL WHERE id = OLD.asset_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_asset_ppm_group
  AFTER INSERT OR DELETE ON ppm_group_assets
  FOR EACH ROW
  EXECUTE FUNCTION sync_asset_ppm_group();
