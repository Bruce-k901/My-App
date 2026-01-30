-- =====================================================
-- TRAINING COURSE SYSTEM - RLS POLICIES
-- Row Level Security policies for all new tables
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_assignments') THEN

    -- =====================================================
    -- COURSE ASSIGNMENTS RLS
    -- =====================================================
    ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;

    -- Users can view their own assignments
    DROP POLICY IF EXISTS "Users can view their own assignments" ON course_assignments;
    CREATE POLICY "Users can view their own assignments"
      ON course_assignments FOR SELECT
      USING (
        profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid()
        )
      );

    -- Managers can create assignments
    DROP POLICY IF EXISTS "Managers can create assignments" ON course_assignments;
    CREATE POLICY "Managers can create assignments"
      ON course_assignments FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid() 
          AND LOWER(app_role) IN ('admin', 'owner', 'manager')
        )
      );

    -- Users can update their own assignments (confirm, mark progress)
    DROP POLICY IF EXISTS "Users can update their own assignments" ON course_assignments;
    CREATE POLICY "Users can update their own assignments"
      ON course_assignments FOR UPDATE
      USING (
        profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR assigned_by IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      );

    -- Managers can update any assignment in their company
    DROP POLICY IF EXISTS "Managers can update company assignments" ON course_assignments;
    CREATE POLICY "Managers can update company assignments"
      ON course_assignments FOR UPDATE
      USING (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid() 
          AND LOWER(app_role) IN ('admin', 'owner', 'manager')
        )
      );

    -- =====================================================
    -- COURSE PROGRESS RLS
    -- =====================================================
    ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

    -- Users can view their own progress
    DROP POLICY IF EXISTS "Users can view their own progress" ON course_progress;
    CREATE POLICY "Users can view their own progress"
      ON course_progress FOR SELECT
      USING (
        profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid()
        )
      );

    -- Users can insert/update their own progress
    DROP POLICY IF EXISTS "Users can manage their own progress" ON course_progress;
    CREATE POLICY "Users can manage their own progress"
      ON course_progress FOR ALL
      USING (
        profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      );

    -- =====================================================
    -- COURSE QUESTIONS RLS
    -- =====================================================
    ALTER TABLE course_questions ENABLE ROW LEVEL SECURITY;

    -- All authenticated users can view active questions
    DROP POLICY IF EXISTS "Users can view active questions" ON course_questions;
    CREATE POLICY "Users can view active questions"
      ON course_questions FOR SELECT
      USING (
        is_active = true
        AND (
          company_id IS NULL 
          OR company_id IN (
            SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()
          )
        )
      );

    -- Managers can manage questions for their company
    DROP POLICY IF EXISTS "Managers can manage company questions" ON course_questions;
    CREATE POLICY "Managers can manage company questions"
      ON course_questions FOR ALL
      USING (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid() 
          AND LOWER(app_role) IN ('admin', 'owner', 'manager')
        )
      );

    -- =====================================================
    -- COURSE QUESTION OPTIONS RLS
    -- =====================================================
    ALTER TABLE course_question_options ENABLE ROW LEVEL SECURITY;

    -- Users can view options for questions they can view
    DROP POLICY IF EXISTS "Users can view question options" ON course_question_options;
    CREATE POLICY "Users can view question options"
      ON course_question_options FOR SELECT
      USING (
        question_id IN (
          SELECT id FROM course_questions 
          WHERE is_active = true
          AND (
            company_id IS NULL 
            OR company_id IN (
              SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()
            )
          )
        )
      );

    -- Managers can manage options for their company's questions
    DROP POLICY IF EXISTS "Managers can manage question options" ON course_question_options;
    CREATE POLICY "Managers can manage question options"
      ON course_question_options FOR ALL
      USING (
        question_id IN (
          SELECT id FROM course_questions 
          WHERE company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(app_role) IN ('admin', 'owner', 'manager')
          )
        )
      );

    -- =====================================================
    -- COURSE CHARGES RLS
    -- =====================================================
    ALTER TABLE course_charges ENABLE ROW LEVEL SECURITY;

    -- Users can view their own charges
    DROP POLICY IF EXISTS "Users can view their own charges" ON course_charges;
    CREATE POLICY "Users can view their own charges"
      ON course_charges FOR SELECT
      USING (
        profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid()
        )
      );

    -- System/managers can create charges (via API with service role)
    DROP POLICY IF EXISTS "Managers can view company charges" ON course_charges;
    CREATE POLICY "Managers can view company charges"
      ON course_charges FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid() 
          AND LOWER(app_role) IN ('admin', 'owner', 'manager')
        )
      );

    -- Only system can insert charges (via service role in API)
    -- No INSERT policy for authenticated users - charges created server-side only

    -- Managers can update charge status (mark as invoiced/paid)
    DROP POLICY IF EXISTS "Managers can update charge status" ON course_charges;
    CREATE POLICY "Managers can update charge status"
      ON course_charges FOR UPDATE
      USING (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid() 
          AND LOWER(app_role) IN ('admin', 'owner', 'manager')
        )
      );

    RAISE NOTICE 'Created RLS policies for training course system tables';

  ELSE
    RAISE NOTICE '⚠️ Required tables do not exist yet - skipping RLS policy creation';
  END IF;
END $$;
