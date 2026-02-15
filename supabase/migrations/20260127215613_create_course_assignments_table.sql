-- =====================================================
-- CREATE COURSE ASSIGNMENTS TABLE
-- Creates the course_assignments table for tracking course assignments
-- =====================================================

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records') THEN

    -- =====================================================
    -- COURSE ASSIGNMENTS TABLE
    -- Track who is assigned to which courses
    -- =====================================================
    CREATE TABLE IF NOT EXISTS course_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      course_id UUID NOT NULL,
      
      -- Assignment details
      status TEXT NOT NULL DEFAULT 'invited',
      -- Values: 'invited', 'confirmed', 'in_progress', 'completed', 'expired'
      CHECK (status IN ('invited', 'confirmed', 'in_progress', 'completed', 'expired')),
      
      assigned_by UUID,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Confirmation
      confirmed_at TIMESTAMPTZ,
      confirmation_name TEXT,
      confirmation_site_id UUID,
      
      -- Deadline/reminder
      deadline_date DATE,
      reminder_sent BOOLEAN DEFAULT FALSE,
      
      -- Attempts tracking
      attempts INTEGER DEFAULT 0,
      
      -- Link to resulting training record when completed
      training_record_id UUID,
      
      -- Messaging conversation reference
      msgly_conversation_id UUID,
      
      -- Calendar task reference (notification ID)
      calendar_task_id UUID,
      
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'course_assignments' 
      AND constraint_name = 'course_assignments_company_id_fkey'
    ) THEN
      ALTER TABLE course_assignments 
      ADD CONSTRAINT course_assignments_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'course_assignments' 
      AND constraint_name = 'course_assignments_profile_id_fkey'
    ) THEN
      ALTER TABLE course_assignments 
      ADD CONSTRAINT course_assignments_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'course_assignments' 
      AND constraint_name = 'course_assignments_course_id_fkey'
    ) THEN
      ALTER TABLE course_assignments 
      ADD CONSTRAINT course_assignments_course_id_fkey 
      FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'course_assignments' 
      AND constraint_name = 'course_assignments_assigned_by_fkey'
    ) THEN
      ALTER TABLE course_assignments 
      ADD CONSTRAINT course_assignments_assigned_by_fkey 
      FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'course_assignments' 
      AND constraint_name = 'course_assignments_confirmation_site_id_fkey'
    ) THEN
      ALTER TABLE course_assignments 
      ADD CONSTRAINT course_assignments_confirmation_site_id_fkey 
      FOREIGN KEY (confirmation_site_id) REFERENCES sites(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'course_assignments' 
      AND constraint_name = 'course_assignments_training_record_id_fkey'
    ) THEN
      ALTER TABLE course_assignments 
      ADD CONSTRAINT course_assignments_training_record_id_fkey 
      FOREIGN KEY (training_record_id) REFERENCES training_records(id) ON DELETE SET NULL;
    END IF;

    -- Unique constraint: Allow re-assignment after expiry
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'course_assignments' 
      AND indexname = 'idx_unique_active_assignment'
    ) THEN
      CREATE UNIQUE INDEX idx_unique_active_assignment 
      ON course_assignments(profile_id, course_id)
      WHERE status IN ('invited', 'confirmed', 'in_progress');
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_course_assignments_profile ON course_assignments(profile_id);
    CREATE INDEX IF NOT EXISTS idx_course_assignments_course ON course_assignments(course_id);
    CREATE INDEX IF NOT EXISTS idx_course_assignments_status ON course_assignments(status);
    CREATE INDEX IF NOT EXISTS idx_course_assignments_company ON course_assignments(company_id);
    CREATE INDEX IF NOT EXISTS idx_course_assignments_deadline ON course_assignments(deadline_date) WHERE deadline_date IS NOT NULL;

    RAISE NOTICE '✅ Created course_assignments table';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles, training_courses, training_records) do not exist yet - skipping course_assignments table creation';
  END IF;
END $$;
