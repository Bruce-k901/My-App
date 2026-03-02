-- ============================================================================
-- STEP 2: CREATE SITE_CHECKLISTS TABLE (My Tasks Storage)
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN

    DROP TABLE IF EXISTS site_checklists CASCADE;

    CREATE TABLE site_checklists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL,
      company_id UUID NOT NULL,
      template_id UUID NOT NULL,
      
      -- Basic info
      name TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'annually', 'triggered')),
      active BOOLEAN DEFAULT true,
      
      -- Multi-time configuration (for SFBB temp checks)
      daypart_times JSONB, -- {"before_open": ["07:00"], "during_service": ["12:00"], "after_service": ["17:00"]}
      
      -- Equipment configuration (for temp checks)
      equipment_config JSONB, -- [{"assetId": "uuid", "equipment": "Fridge", "nickname": "F1"}]
      
      -- Scheduling (for weekly/monthly/annual)
      days_of_week INTEGER[], -- [1,2,3,4,5] for weekly
      date_of_month INTEGER, -- 1-31 for monthly
      anniversary_date DATE, -- for annual
      
      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID,
      
      UNIQUE(site_id, template_id)
    );

    -- Add foreign keys conditionally
    ALTER TABLE site_checklists
    ADD CONSTRAINT site_checklists_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

    ALTER TABLE site_checklists
    ADD CONSTRAINT site_checklists_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

    ALTER TABLE site_checklists
    ADD CONSTRAINT site_checklists_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE;

    -- Add foreign key to profiles if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      ALTER TABLE site_checklists
      ADD CONSTRAINT site_checklists_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    -- Indexes
    CREATE INDEX idx_site_checklists_site ON site_checklists(site_id);
    CREATE INDEX idx_site_checklists_active ON site_checklists(active) WHERE active = true;
    CREATE INDEX idx_site_checklists_frequency ON site_checklists(frequency);
    CREATE INDEX idx_site_checklists_template ON site_checklists(template_id);

    -- RLS Policies
    ALTER TABLE site_checklists ENABLE ROW LEVEL SECURITY;

    -- Only create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE POLICY "Users view site_checklists for their site or all if Owner/Admin"
      ON site_checklists FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (
            profiles.app_role IN ('Owner', 'Admin')
            OR profiles.site_id = site_checklists.site_id
          )
        )
      );

      CREATE POLICY "Users insert site_checklists for their site"
      ON site_checklists FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND site_id = site_checklists.site_id
        )
      );

      CREATE POLICY "Users update site_checklists for their site"
      ON site_checklists FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (
            profiles.app_role IN ('Owner', 'Admin')
            OR profiles.site_id = site_checklists.site_id
          )
        )
      );

      CREATE POLICY "Users delete site_checklists for their site"
      ON site_checklists FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (
            profiles.app_role IN ('Owner', 'Admin')
            OR profiles.site_id = site_checklists.site_id
          )
        )
      );
    END IF;

    -- Trigger to auto-set site_id and company_id
    CREATE OR REPLACE FUNCTION set_site_checklist_defaults()
    RETURNS TRIGGER AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        IF NEW.site_id IS NULL THEN
          SELECT site_id INTO NEW.site_id FROM profiles WHERE id = auth.uid();
        END IF;
        
        IF NEW.company_id IS NULL THEN
          SELECT company_id INTO NEW.company_id FROM profiles WHERE id = auth.uid();
        END IF;
      END IF;
      
      IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
      END IF;
      
      NEW.updated_at := NOW();
      
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE TRIGGER trg_set_site_checklist_defaults
      BEFORE INSERT OR UPDATE ON site_checklists
      FOR EACH ROW
      EXECUTE FUNCTION set_site_checklist_defaults();

  ELSE
    RAISE NOTICE '⚠️ Required tables (sites, companies, task_templates) do not exist yet - skipping site_checklists table creation';
  END IF;
END $$;

