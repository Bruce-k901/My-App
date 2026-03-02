-- =====================================================
-- GOALS TABLE
-- Employee goals and objectives
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      
      -- Linked to review (optional)
      review_id UUID,
      
      -- Goal details
      title TEXT NOT NULL,
      description TEXT,
      
      -- Category
      goal_type TEXT NOT NULL DEFAULT 'performance',
      -- Values: 'performance', 'development', 'project', 'behaviour', 'career'
      
      -- SMART criteria
      measurable_target TEXT,
      -- What does success look like?
      
      -- Timeline
      start_date DATE DEFAULT CURRENT_DATE,
      target_date DATE,
      completed_date DATE,
      
      -- Progress
      progress_percentage INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'not_started',
      -- Values: 'not_started', 'in_progress', 'completed', 'cancelled', 'deferred'
      
      -- Priority
      priority TEXT DEFAULT 'medium',
      -- Values: 'low', 'medium', 'high', 'critical'
      
      -- Weighting for overall performance
      weight_percentage INTEGER DEFAULT 0,
      
      -- Visibility
      is_private BOOLEAN DEFAULT false,
      
      -- Approval
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      
      -- Audit
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'goals' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE goals 
      ADD CONSTRAINT goals_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'goals' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE goals 
      ADD CONSTRAINT goals_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_reviews') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'goals' 
        AND constraint_name LIKE '%review_id%'
      ) THEN
        ALTER TABLE goals 
        ADD CONSTRAINT goals_review_id_fkey 
        FOREIGN KEY (review_id) REFERENCES performance_reviews(id);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'goals' 
      AND constraint_name LIKE '%approved_by%'
    ) THEN
      ALTER TABLE goals 
      ADD CONSTRAINT goals_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'goals' 
      AND constraint_name LIKE '%created_by%'
    ) THEN
      ALTER TABLE goals 
      ADD CONSTRAINT goals_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_goals_company ON goals(company_id);
    CREATE INDEX IF NOT EXISTS idx_goals_profile ON goals(profile_id);
    CREATE INDEX IF NOT EXISTS idx_goals_review ON goals(review_id);
    CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
    CREATE INDEX IF NOT EXISTS idx_goals_target ON goals(target_date) WHERE status NOT IN ('completed', 'cancelled');

    -- RLS
    ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "view_own_goals" ON goals;
    DROP POLICY IF EXISTS "managers_view_goals" ON goals;
    DROP POLICY IF EXISTS "manage_own_goals" ON goals;
    DROP POLICY IF EXISTS "managers_manage_goals" ON goals;

    -- Employees see their own goals
    CREATE POLICY "view_own_goals"
    ON goals FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers see their reports' goals
    CREATE POLICY "managers_view_goals"
    ON goals FOR SELECT
    USING (
      profile_id IN (
        SELECT id FROM profiles 
        WHERE EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'reports_to'
        )
        AND reports_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      )
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner')
      )
    );

    -- Employees manage their own goals
    CREATE POLICY "manage_own_goals"
    ON goals FOR ALL
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers can approve/update
    CREATE POLICY "managers_manage_goals"
    ON goals FOR UPDATE
    USING (
      profile_id IN (
        SELECT id FROM profiles 
        WHERE EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'reports_to'
        )
        AND reports_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      )
    );

    -- =====================================================
    -- GOAL UPDATES TABLE
    -- Progress updates and check-ins
    -- =====================================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
      CREATE TABLE IF NOT EXISTS goal_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        goal_id UUID NOT NULL,
        
        -- Update content
        update_text TEXT NOT NULL,
        progress_percentage INTEGER,
        
        -- Who posted
        posted_by UUID NOT NULL,
        
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- Add foreign key constraints
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'goal_updates' 
        AND constraint_name LIKE '%goal_id%'
      ) THEN
        ALTER TABLE goal_updates 
        ADD CONSTRAINT goal_updates_goal_id_fkey 
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'goal_updates' 
        AND constraint_name LIKE '%posted_by%'
      ) THEN
        ALTER TABLE goal_updates 
        ADD CONSTRAINT goal_updates_posted_by_fkey 
        FOREIGN KEY (posted_by) REFERENCES profiles(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_goal_updates_goal ON goal_updates(goal_id);

      -- RLS
      ALTER TABLE goal_updates ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "view_goal_updates" ON goal_updates;
      DROP POLICY IF EXISTS "create_goal_updates" ON goal_updates;

      CREATE POLICY "view_goal_updates"
      ON goal_updates FOR SELECT
      USING (
        goal_id IN (
          SELECT id FROM goals 
          WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
          OR profile_id IN (
            SELECT id FROM profiles 
            WHERE EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'reports_to'
            )
            AND reports_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
          )
        )
      );

      CREATE POLICY "create_goal_updates"
      ON goal_updates FOR INSERT
      WITH CHECK (
        goal_id IN (
          SELECT id FROM goals 
          WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
        OR posted_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      );
    END IF;

    RAISE NOTICE 'Created goals and goal_updates tables';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping goals table creation';
  END IF;
END $$;

