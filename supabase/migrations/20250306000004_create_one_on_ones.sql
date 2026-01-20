-- =====================================================
-- ONE ON ONE MEETINGS TABLE
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS one_on_one_meetings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      -- Participants
      employee_id UUID NOT NULL,
      manager_id UUID NOT NULL,
      
      -- Schedule
      scheduled_date DATE NOT NULL,
      scheduled_time TIME,
      duration_minutes INTEGER DEFAULT 30,
      
      -- Location
      location TEXT,
      meeting_link TEXT,
      
      -- Status
      status TEXT NOT NULL DEFAULT 'scheduled',
      -- Values: 'scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'
      
      -- Agenda (prepared before meeting)
      employee_agenda TEXT,
      manager_agenda TEXT,
      
      -- Notes (taken during/after)
      meeting_notes TEXT,
      private_manager_notes TEXT,
      
      -- Action items captured
      action_items JSONB,
      -- Array of {task, assignee, due_date, completed}
      
      -- Follow up
      next_meeting_date DATE,
      
      -- Recurring
      is_recurring BOOLEAN DEFAULT false,
      recurrence_pattern TEXT,
      -- Values: 'weekly', 'biweekly', 'monthly'
      
      parent_meeting_id UUID,
      -- For recurring series
      
      -- Audit
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'one_on_one_meetings' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE one_on_one_meetings 
      ADD CONSTRAINT one_on_one_meetings_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'one_on_one_meetings' 
      AND constraint_name LIKE '%employee_id%'
    ) THEN
      ALTER TABLE one_on_one_meetings 
      ADD CONSTRAINT one_on_one_meetings_employee_id_fkey 
      FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'one_on_one_meetings' 
      AND constraint_name LIKE '%manager_id%'
    ) THEN
      ALTER TABLE one_on_one_meetings 
      ADD CONSTRAINT one_on_one_meetings_manager_id_fkey 
      FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'one_on_one_meetings' 
      AND constraint_name LIKE '%parent_meeting_id%'
    ) THEN
      ALTER TABLE one_on_one_meetings 
      ADD CONSTRAINT one_on_one_meetings_parent_meeting_id_fkey 
      FOREIGN KEY (parent_meeting_id) REFERENCES one_on_one_meetings(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'one_on_one_meetings' 
      AND constraint_name LIKE '%created_by%'
    ) THEN
      ALTER TABLE one_on_one_meetings 
      ADD CONSTRAINT one_on_one_meetings_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_1on1_company ON one_on_one_meetings(company_id);
    CREATE INDEX IF NOT EXISTS idx_1on1_employee ON one_on_one_meetings(employee_id);
    CREATE INDEX IF NOT EXISTS idx_1on1_manager ON one_on_one_meetings(manager_id);
    CREATE INDEX IF NOT EXISTS idx_1on1_date ON one_on_one_meetings(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_1on1_upcoming ON one_on_one_meetings(scheduled_date, status) 
      WHERE status = 'scheduled';

    -- RLS
    ALTER TABLE one_on_one_meetings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "view_own_1on1s" ON one_on_one_meetings;
    DROP POLICY IF EXISTS "manage_1on1s" ON one_on_one_meetings;
    DROP POLICY IF EXISTS "employee_update_1on1" ON one_on_one_meetings;

    -- Employees see their own 1:1s
    CREATE POLICY "view_own_1on1s"
    ON one_on_one_meetings FOR SELECT
    USING (
      employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      OR manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers can manage 1:1s
    CREATE POLICY "manage_1on1s"
    ON one_on_one_meetings FOR ALL
    USING (
      manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner')
      )
    );

    -- Employees can update agenda
    CREATE POLICY "employee_update_1on1"
    ON one_on_one_meetings FOR UPDATE
    USING (
      employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- =====================================================
    -- 1:1 TALKING POINTS TABLE
    -- Agenda items for meetings
    -- =====================================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'one_on_one_meetings') THEN
      CREATE TABLE IF NOT EXISTS one_on_one_talking_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meeting_id UUID NOT NULL,
        
        -- Content
        topic TEXT NOT NULL,
        notes TEXT,
        
        -- Who added it
        added_by TEXT NOT NULL,
        -- Values: 'employee', 'manager'
        
        -- Status
        is_discussed BOOLEAN DEFAULT false,
        
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- Add foreign key constraint
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'one_on_one_talking_points' 
        AND constraint_name LIKE '%meeting_id%'
      ) THEN
        ALTER TABLE one_on_one_talking_points 
        ADD CONSTRAINT one_on_one_talking_points_meeting_id_fkey 
        FOREIGN KEY (meeting_id) REFERENCES one_on_one_meetings(id) ON DELETE CASCADE;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_talking_points_meeting ON one_on_one_talking_points(meeting_id);

      -- RLS
      ALTER TABLE one_on_one_talking_points ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "manage_talking_points" ON one_on_one_talking_points;

      CREATE POLICY "manage_talking_points"
      ON one_on_one_talking_points FOR ALL
      USING (
        meeting_id IN (
          SELECT id FROM one_on_one_meetings 
          WHERE employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
          OR manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
      );
    END IF;

    RAISE NOTICE 'Created one_on_one_meetings and one_on_one_talking_points tables';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping one_on_one_meetings table creation';
  END IF;
END $$;

