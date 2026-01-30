-- =====================================================
-- PERFORMANCE REVIEWS TABLE
-- Individual employee reviews
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS performance_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      cycle_id UUID,
      
      -- Employee being reviewed
      profile_id UUID NOT NULL,
      
      -- Reviewer (usually manager)
      reviewer_id UUID NOT NULL,
      
      -- Template used
      template_id UUID,
      
      -- Status workflow
      status TEXT NOT NULL DEFAULT 'not_started',
      -- Values: 'not_started', 'self_assessment', 'manager_review', 'discussion', 'completed', 'acknowledged'
      
      -- Dates
      due_date DATE,
      self_assessment_completed_at TIMESTAMPTZ,
      manager_review_completed_at TIMESTAMPTZ,
      discussion_date DATE,
      completed_at TIMESTAMPTZ,
      acknowledged_at TIMESTAMPTZ,
      
      -- Overall rating (calculated or set)
      overall_rating DECIMAL(3,2),
      overall_rating_label TEXT,
      
      -- Recommendations
      promotion_recommended BOOLEAN DEFAULT false,
      salary_increase_recommended BOOLEAN DEFAULT false,
      pip_recommended BOOLEAN DEFAULT false,
      -- Performance Improvement Plan
      
      -- Notes
      private_manager_notes TEXT,
      -- Not visible to employee
      
      -- Signatures
      employee_signature TEXT,
      manager_signature TEXT,
      
      -- Audit
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'performance_reviews' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE performance_reviews 
      ADD CONSTRAINT performance_reviews_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_cycles') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'performance_reviews' 
        AND constraint_name LIKE '%cycle_id%'
      ) THEN
        ALTER TABLE performance_reviews 
        ADD CONSTRAINT performance_reviews_cycle_id_fkey 
        FOREIGN KEY (cycle_id) REFERENCES review_cycles(id);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'performance_reviews' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE performance_reviews 
      ADD CONSTRAINT performance_reviews_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'performance_reviews' 
      AND constraint_name LIKE '%reviewer_id%'
    ) THEN
      ALTER TABLE performance_reviews 
      ADD CONSTRAINT performance_reviews_reviewer_id_fkey 
      FOREIGN KEY (reviewer_id) REFERENCES profiles(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_templates') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'performance_reviews' 
        AND constraint_name LIKE '%template_id%'
      ) THEN
        ALTER TABLE performance_reviews 
        ADD CONSTRAINT performance_reviews_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES review_templates(id);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'performance_reviews' 
      AND constraint_name LIKE '%created_by%'
    ) THEN
      ALTER TABLE performance_reviews 
      ADD CONSTRAINT performance_reviews_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_performance_reviews_company ON performance_reviews(company_id);
    CREATE INDEX IF NOT EXISTS idx_performance_reviews_profile ON performance_reviews(profile_id);
    CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
    CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle ON performance_reviews(cycle_id);
    CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

    -- RLS
    ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "view_own_reviews" ON performance_reviews;
    DROP POLICY IF EXISTS "view_managed_reviews" ON performance_reviews;
    DROP POLICY IF EXISTS "admin_view_reviews" ON performance_reviews;
    DROP POLICY IF EXISTS "managers_update_reviews" ON performance_reviews;

    -- Employees see their own reviews
    CREATE POLICY "view_own_reviews"
    ON performance_reviews FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers see reviews they're conducting
    CREATE POLICY "view_managed_reviews"
    ON performance_reviews FOR SELECT
    USING (
      reviewer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Admins see all
    CREATE POLICY "admin_view_reviews"
    ON performance_reviews FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner')
      )
    );

    -- Managers can update reviews they're conducting
    CREATE POLICY "managers_update_reviews"
    ON performance_reviews FOR UPDATE
    USING (
      reviewer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      OR company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner')
      )
    );

    -- =====================================================
    -- REVIEW RESPONSES TABLE
    -- Answers to review questions
    -- =====================================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_reviews')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_template_questions') THEN

      CREATE TABLE IF NOT EXISTS review_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL,
        question_id UUID NOT NULL,
        
        -- Who provided this response
        responded_by TEXT NOT NULL,
        -- Values: 'employee', 'manager'
        
        -- Response content
        rating_value INTEGER,
        text_value TEXT,
        
        -- Audit
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        
        UNIQUE(review_id, question_id, responded_by)
      );

      -- Add foreign key constraints
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'review_responses' 
        AND constraint_name LIKE '%review_id%'
      ) THEN
        ALTER TABLE review_responses 
        ADD CONSTRAINT review_responses_review_id_fkey 
        FOREIGN KEY (review_id) REFERENCES performance_reviews(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'review_responses' 
        AND constraint_name LIKE '%question_id%'
      ) THEN
        ALTER TABLE review_responses 
        ADD CONSTRAINT review_responses_question_id_fkey 
        FOREIGN KEY (question_id) REFERENCES review_template_questions(id);
      END IF;

      CREATE INDEX IF NOT EXISTS idx_review_responses_review ON review_responses(review_id);

      -- RLS
      ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "view_own_responses" ON review_responses;
      DROP POLICY IF EXISTS "manage_responses" ON review_responses;

      CREATE POLICY "view_own_responses"
      ON review_responses FOR SELECT
      USING (
        review_id IN (
          SELECT id FROM performance_reviews 
          WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
          OR reviewer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
      );

      CREATE POLICY "manage_responses"
      ON review_responses FOR ALL
      USING (
        review_id IN (
          SELECT id FROM performance_reviews 
          WHERE profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
          OR reviewer_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
      );
    END IF;

    RAISE NOTICE 'Created performance_reviews and review_responses tables';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping performance_reviews table creation';
  END IF;
END $$;

