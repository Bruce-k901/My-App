-- This migration only runs if required tables exist
DO $$
BEGIN
  -- Check if required tables exist - exit early if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'companies or profiles tables do not exist - skipping approval_hierarchy migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Required tables found - proceeding with approval_hierarchy migration';
END $$;

-- Only proceed if required tables exist (checked above)
DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RETURN;
  END IF;

  -- Create regions table
  EXECUTE $sql_table1$
    CREATE TABLE IF NOT EXISTS regions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_id, name)
    );
  $sql_table1$;

  -- Create areas table
  EXECUTE $sql_table2$
    CREATE TABLE IF NOT EXISTS areas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(region_id, name)
    );
  $sql_table2$;

  -- Add area_id to sites table if it doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sites'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'area_id'
    ) THEN
      ALTER TABLE sites ADD COLUMN area_id UUID REFERENCES areas(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Create approval workflows table
  EXECUTE $sql_table3$
    CREATE TABLE IF NOT EXISTS approval_workflows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('rota', 'payroll', 'leave', 'expenses', 'time_off', 'other')),
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_id, name)
    );
  $sql_table3$;

  -- Create approval steps table
  EXECUTE $sql_table4$
    CREATE TABLE IF NOT EXISTS approval_steps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      approver_role TEXT NOT NULL,
      can_reject BOOLEAN DEFAULT true,
      required BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(workflow_id, step_number)
    );
  $sql_table4$;

  -- Create approval requests table
  EXECUTE $sql_table5$
    CREATE TABLE IF NOT EXISTS approval_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
      requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      current_step INTEGER DEFAULT 1,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  $sql_table5$;

  -- Create approval actions table
  EXECUTE $sql_table6$
    CREATE TABLE IF NOT EXISTS approval_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      action_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'commented')),
      comments TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  $sql_table6$;

  -- Enable RLS
  ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
  ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
  ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
  ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

  -- RLS Policies for regions
  DROP POLICY IF EXISTS "Users can view regions in their company" ON regions;
  CREATE POLICY "Users can view regions in their company"
    ON regions FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

  CREATE POLICY "Admins can insert regions"
    ON regions FOR INSERT
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND app_role IN ('Admin', 'Owner', 'Super Admin')
      )
    );

  DROP POLICY IF EXISTS "Admins can update regions" ON regions;
  CREATE POLICY "Admins can update regions"
    ON regions FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND app_role IN ('Admin', 'Owner', 'Super Admin')
      )
    );

  DROP POLICY IF EXISTS "Admins can delete regions" ON regions;
  CREATE POLICY "Admins can delete regions"
    ON regions FOR DELETE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND app_role IN ('Admin', 'Owner', 'Super Admin')
      )
    );

  -- RLS Policies for areas
  DROP POLICY IF EXISTS "Users can view areas in their company" ON areas;
  CREATE POLICY "Users can view areas in their company"
    ON areas FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

  DROP POLICY IF EXISTS "Admins can insert areas" ON areas;
  CREATE POLICY "Admins can insert areas"
    ON areas FOR INSERT
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND app_role IN ('Admin', 'Owner', 'Super Admin')
      )
    );

  DROP POLICY IF EXISTS "Admins can update areas" ON areas;
  CREATE POLICY "Admins can update areas"
    ON areas FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND app_role IN ('Admin', 'Owner', 'Super Admin')
      )
    );

  DROP POLICY IF EXISTS "Admins can delete areas" ON areas;
  CREATE POLICY "Admins can delete areas"
    ON areas FOR DELETE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND app_role IN ('Admin', 'Owner', 'Super Admin')
      )
    );

  -- RLS Policies for approval_workflows
  DROP POLICY IF EXISTS "Users can view workflows in their company" ON approval_workflows;
  CREATE POLICY "Users can view workflows in their company"
    ON approval_workflows FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

  DROP POLICY IF EXISTS "Admins can manage workflows" ON approval_workflows;
  CREATE POLICY "Admins can manage workflows"
    ON approval_workflows FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND app_role IN ('Admin', 'Owner', 'Super Admin')
      )
    );

  -- RLS Policies for approval_steps
  DROP POLICY IF EXISTS "Users can view approval steps" ON approval_steps;
  CREATE POLICY "Users can view approval steps"
    ON approval_steps FOR SELECT
    USING (
      workflow_id IN (
        SELECT id FROM approval_workflows 
        WHERE company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
      )
    );

  DROP POLICY IF EXISTS "Admins can manage approval steps" ON approval_steps;
  CREATE POLICY "Admins can manage approval steps"
    ON approval_steps FOR ALL
    USING (
      workflow_id IN (
        SELECT id FROM approval_workflows 
        WHERE company_id IN (
          SELECT company_id FROM profiles 
          WHERE id = auth.uid() 
          AND app_role IN ('Admin', 'Owner', 'Super Admin')
        )
      )
    );

  -- RLS Policies for approval_requests
  DROP POLICY IF EXISTS "Users can view approval requests in their company" ON approval_requests;
  CREATE POLICY "Users can view approval requests in their company"
    ON approval_requests FOR SELECT
    USING (
      workflow_id IN (
        SELECT id FROM approval_workflows 
        WHERE company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
      )
    );

  DROP POLICY IF EXISTS "Users can create approval requests" ON approval_requests;
  CREATE POLICY "Users can create approval requests"
    ON approval_requests FOR INSERT
    WITH CHECK (
      workflow_id IN (
        SELECT id FROM approval_workflows 
        WHERE company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
      )
      AND requested_by = auth.uid()
    );

  DROP POLICY IF EXISTS "Approvers can update approval requests" ON approval_requests;
  CREATE POLICY "Approvers can update approval requests"
    ON approval_requests FOR UPDATE
    USING (
      workflow_id IN (
        SELECT id FROM approval_workflows 
        WHERE company_id IN (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
      )
    );

  -- RLS Policies for approval_actions
  DROP POLICY IF EXISTS "Users can view approval actions in their company" ON approval_actions;
  CREATE POLICY "Users can view approval actions in their company"
    ON approval_actions FOR SELECT
    USING (
      request_id IN (
        SELECT id FROM approval_requests 
        WHERE workflow_id IN (
          SELECT id FROM approval_workflows 
          WHERE company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
          )
        )
      )
    );

  DROP POLICY IF EXISTS "Approvers can create approval actions" ON approval_actions;
  -- Only create policy if action_by column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'approval_actions' 
      AND column_name = 'action_by'
  ) THEN
    EXECUTE 'CREATE POLICY "Approvers can create approval actions"
      ON approval_actions FOR INSERT
      WITH CHECK (
        request_id IN (
          SELECT id FROM approval_requests 
          WHERE workflow_id IN (
            SELECT id FROM approval_workflows 
            WHERE company_id IN (
              SELECT company_id FROM profiles WHERE id = auth.uid()
            )
          )
        )
        AND action_by = auth.uid()
      )';
  END IF;

  -- Create updated_at triggers
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_areas_updated_at
    BEFORE UPDATE ON areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_approval_workflows_updated_at
    BEFORE UPDATE ON approval_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_regions_company_id ON regions(company_id);
  -- Only create manager_id index if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'regions' 
      AND column_name = 'manager_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_regions_manager_id ON regions(manager_id);
  END IF;

  CREATE INDEX IF NOT EXISTS idx_areas_region_id ON areas(region_id);
  CREATE INDEX IF NOT EXISTS idx_areas_company_id ON areas(company_id);

  -- Only create manager_id index if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'areas' 
      AND column_name = 'manager_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_areas_manager_id ON areas(manager_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sites'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sites_area_id ON sites(area_id);
  END IF;
  
  CREATE INDEX IF NOT EXISTS idx_approval_workflows_company_id ON approval_workflows(company_id);
  CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow_id ON approval_steps(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow_id ON approval_requests(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
  CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(request_id);
  -- Only create action_by index if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'approval_actions' 
      AND column_name = 'action_by'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_approval_actions_action_by ON approval_actions(action_by);
  END IF;

END $$;

