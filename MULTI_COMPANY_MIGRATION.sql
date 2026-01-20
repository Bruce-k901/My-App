-- ============================================================================
-- MULTI-COMPANY & RESOURCE SHARING MIGRATION
-- ============================================================================

-- 1. Create user_companies junction table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  app_role TEXT NOT NULL DEFAULT 'Staff' CHECK (app_role IN ('Staff', 'Manager', 'Owner', 'Admin')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, company_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_companies_profile ON user_companies(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies(company_id);

-- Enable RLS
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own company memberships
DROP POLICY IF EXISTS "Users can view their own company memberships" ON user_companies;
CREATE POLICY "Users can view their own company memberships"
ON user_companies FOR SELECT
USING (profile_id = auth.uid());

-- RLS Policy: Owners/Admins can manage company memberships
DROP POLICY IF EXISTS "Owners and Admins can manage company memberships" ON user_companies;
CREATE POLICY "Owners and Admins can manage company memberships"
ON user_companies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.app_role IN ('Owner', 'Admin')
  )
);

-- 2. Add parent_company_id for company groups
-- ============================================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_companies_parent ON companies(parent_company_id);

-- 3. Add shared_with_group flag to all resource tables
-- ============================================================================

-- Sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_sites_shared ON sites(shared_with_group) WHERE shared_with_group = true;

-- Profiles (Staff)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_shared ON profiles(shared_with_group) WHERE shared_with_group = true;

-- Check if stockly tables exist before adding columns
DO $$ 
BEGIN
  -- stock_items is a view in public schema, but the actual table is in stockly schema
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'stock_items'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE stockly.stock_items ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_stock_items_shared ON stockly.stock_items(shared_with_group) WHERE shared_with_group = true;
    
    -- Recreate the public view to include the new column
    DROP VIEW IF EXISTS public.stock_items CASCADE;
    CREATE VIEW public.stock_items AS
    SELECT * FROM stockly.stock_items;
    
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
    ALTER VIEW public.stock_items SET (security_invoker = true);
  END IF;
  
  -- Check if suppliers table exists (could be in public or stockly schema)
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'suppliers'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_suppliers_shared ON public.suppliers(shared_with_group) WHERE shared_with_group = true;
  ELSIF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'suppliers'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE stockly.suppliers ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_suppliers_shared ON stockly.suppliers(shared_with_group) WHERE shared_with_group = true;
  END IF;
  
  -- Check if purchase_orders table exists (could be in public or stockly schema)
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_shared ON public.purchase_orders(shared_with_group) WHERE shared_with_group = true;
  ELSIF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'stockly' 
    AND table_name = 'purchase_orders'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE stockly.purchase_orders ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_shared ON stockly.purchase_orders(shared_with_group) WHERE shared_with_group = true;
  END IF;
END $$;

-- Check if assetly tables exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'assets') THEN
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_assets_shared ON assets(shared_with_group) WHERE shared_with_group = true;
  END IF;
END $$;

-- Check if checkly tables exist
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_templates') THEN
    ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS shared_with_group BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_task_templates_shared ON task_templates(shared_with_group) WHERE shared_with_group = true;
  END IF;
END $$;

-- 4. Function to keep user_companies in sync with profiles.company_id
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_primary_company()
RETURNS TRIGGER AS $$
BEGIN
  -- When profile.company_id changes, update is_primary in user_companies
  IF NEW.company_id IS NOT NULL AND (OLD.company_id IS NULL OR OLD.company_id != NEW.company_id) THEN
    -- Remove primary flag from all companies for this user
    UPDATE user_companies
    SET is_primary = false
    WHERE profile_id = NEW.id;
    
    -- Set the new primary company
    INSERT INTO user_companies (profile_id, company_id, app_role, is_primary)
    VALUES (NEW.id, NEW.company_id, NEW.app_role, true)
    ON CONFLICT (profile_id, company_id) 
    DO UPDATE SET is_primary = true, app_role = EXCLUDED.app_role;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_primary_company_trigger ON profiles;
CREATE TRIGGER sync_primary_company_trigger
AFTER INSERT OR UPDATE OF company_id ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_primary_company();

-- 5. Helper function to get all company IDs in a group (for queries)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_company_group_ids(input_company_id UUID)
RETURNS TABLE(company_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE company_tree AS (
    -- Get the parent company (if this is a child)
    SELECT 
      COALESCE(c.parent_company_id, c.id) as root_id,
      c.id as company_id
    FROM companies c
    WHERE c.id = input_company_id
    
    UNION
    
    -- Get all children of the parent
    SELECT 
      ct.root_id,
      c.id
    FROM companies c
    INNER JOIN company_tree ct ON c.parent_company_id = ct.root_id
  )
  SELECT DISTINCT ct.company_id
  FROM company_tree ct;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Backfill existing data into user_companies
-- ============================================================================
INSERT INTO user_companies (profile_id, company_id, app_role, is_primary)
SELECT id, company_id, app_role, true
FROM profiles
WHERE company_id IS NOT NULL
ON CONFLICT (profile_id, company_id) DO NOTHING;

-- 7. Create company_settings table for managing shared resources
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Resource sharing toggles
  share_staff BOOLEAN DEFAULT true,
  share_sites BOOLEAN DEFAULT false, -- Sites usually company-specific
  share_stock BOOLEAN DEFAULT true,
  share_suppliers BOOLEAN DEFAULT true,
  share_assets BOOLEAN DEFAULT true,
  share_templates BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company ON company_settings(company_id);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view settings for their companies
DROP POLICY IF EXISTS "Users can view settings for their companies" ON company_settings;
CREATE POLICY "Users can view settings for their companies"
ON company_settings FOR SELECT
USING (
  company_id IN (
    SELECT uc.company_id 
    FROM user_companies uc 
    WHERE uc.profile_id = auth.uid()
  )
);

-- RLS: Owners/Admins can manage settings
DROP POLICY IF EXISTS "Owners and Admins can manage settings" ON company_settings;
CREATE POLICY "Owners and Admins can manage settings"
ON company_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    INNER JOIN profiles p ON p.id = uc.profile_id
    WHERE uc.profile_id = auth.uid()
    AND uc.company_id = company_settings.company_id
    AND uc.app_role IN ('Owner', 'Admin')
  )
);

-- Create default settings for existing companies
INSERT INTO company_settings (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify the migration
DO $$
DECLARE
  user_companies_count INT;
  settings_count INT;
BEGIN
  SELECT COUNT(*) INTO user_companies_count FROM user_companies;
  SELECT COUNT(*) INTO settings_count FROM company_settings;
  
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '📊 user_companies entries: %', user_companies_count;
  RAISE NOTICE '⚙️  company_settings entries: %', settings_count;
END $$;
