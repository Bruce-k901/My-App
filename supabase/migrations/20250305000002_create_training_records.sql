-- =====================================================
-- TRAINING RECORDS TABLE
-- Employee training completions and certifications
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN

    CREATE TABLE IF NOT EXISTS training_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      course_id UUID NOT NULL,
      
      -- Completion details
      status TEXT NOT NULL DEFAULT 'not_started',
      -- Values: 'not_started', 'in_progress', 'completed', 'expired', 'failed'
      
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      
      -- Assessment results (if applicable)
      score_percentage INTEGER,
      passed BOOLEAN,
      attempts INTEGER DEFAULT 0,
      
      -- Certification details
      certificate_number TEXT,
      certificate_url TEXT,
      -- Link to uploaded certificate
      
      -- Validity
      issued_date DATE,
      expiry_date DATE,
      
      -- Renewal tracking
      renewal_reminder_sent BOOLEAN DEFAULT false,
      renewal_reminder_sent_at TIMESTAMPTZ,
      
      -- Verification
      verified BOOLEAN DEFAULT false,
      verified_by UUID,
      verified_at TIMESTAMPTZ,
      
      -- Notes
      notes TEXT,
      
      -- Training delivery
      trainer_name TEXT,
      training_location TEXT,
      
      -- Audit
      recorded_by UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'training_records' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE training_records 
      ADD CONSTRAINT training_records_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'training_records' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE training_records 
      ADD CONSTRAINT training_records_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'training_records' 
      AND constraint_name LIKE '%course_id%'
    ) THEN
      ALTER TABLE training_records 
      ADD CONSTRAINT training_records_course_id_fkey 
      FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'training_records' 
      AND constraint_name LIKE '%verified_by%'
    ) THEN
      ALTER TABLE training_records 
      ADD CONSTRAINT training_records_verified_by_fkey 
      FOREIGN KEY (verified_by) REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'training_records' 
      AND constraint_name LIKE '%recorded_by%'
    ) THEN
      ALTER TABLE training_records 
      ADD CONSTRAINT training_records_recorded_by_fkey 
      FOREIGN KEY (recorded_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_training_records_company ON training_records(company_id);
    CREATE INDEX IF NOT EXISTS idx_training_records_profile ON training_records(profile_id);
    CREATE INDEX IF NOT EXISTS idx_training_records_course ON training_records(course_id);
    CREATE INDEX IF NOT EXISTS idx_training_records_status ON training_records(status);
    CREATE INDEX IF NOT EXISTS idx_training_records_expiry ON training_records(expiry_date) WHERE expiry_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_training_records_expiring ON training_records(company_id, expiry_date) 
      WHERE status = 'completed' AND expiry_date IS NOT NULL;

    -- Prevent duplicate active records for same course
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'training_records' 
      AND indexname = 'idx_unique_active_training'
    ) THEN
      CREATE UNIQUE INDEX idx_unique_active_training 
      ON training_records(profile_id, course_id)
      WHERE status IN ('not_started', 'in_progress', 'completed');
    END IF;

    -- RLS
    ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "view_own_training" ON training_records;
    DROP POLICY IF EXISTS "managers_view_training" ON training_records;
    DROP POLICY IF EXISTS "managers_manage_training" ON training_records;

    -- Employees can view their own records
    CREATE POLICY "view_own_training"
    ON training_records FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers can view all in company
    CREATE POLICY "managers_view_training"
    ON training_records FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
      )
    );

    -- Managers can manage training records
    CREATE POLICY "managers_manage_training"
    ON training_records FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
      )
    );

    -- =====================================================
    -- HELPER FUNCTIONS
    -- =====================================================

    -- Record training completion
    CREATE OR REPLACE FUNCTION complete_training(
      p_profile_id UUID,
      p_course_id UUID,
      p_completed_at DATE DEFAULT CURRENT_DATE,
      p_score INTEGER DEFAULT NULL,
      p_certificate_number TEXT DEFAULT NULL,
      p_expiry_date DATE DEFAULT NULL,
      p_recorded_by UUID DEFAULT NULL
    )
    RETURNS UUID AS $function$
    DECLARE
      v_record_id UUID;
      v_company_id UUID;
      v_course RECORD;
      v_calc_expiry DATE;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
        RETURN NULL;
      END IF;

      SELECT company_id INTO v_company_id FROM profiles WHERE id = p_profile_id;
      SELECT * INTO v_course FROM training_courses WHERE id = p_course_id;
      
      IF NOT FOUND THEN
        RETURN NULL;
      END IF;
      
      -- Calculate expiry if not provided
      IF p_expiry_date IS NULL AND v_course.certification_validity_months IS NOT NULL THEN
        v_calc_expiry := p_completed_at + (v_course.certification_validity_months || ' months')::INTERVAL;
      ELSE
        v_calc_expiry := p_expiry_date;
      END IF;
      
      -- Check for existing record
      SELECT id INTO v_record_id FROM training_records
      WHERE profile_id = p_profile_id AND course_id = p_course_id
        AND status IN ('not_started', 'in_progress');
      
      IF v_record_id IS NOT NULL THEN
        -- Update existing
        UPDATE training_records SET
          status = 'completed',
          completed_at = p_completed_at,
          score_percentage = p_score,
          passed = CASE WHEN p_score IS NOT NULL THEN p_score >= COALESCE(v_course.pass_mark_percentage, 70) ELSE true END,
          certificate_number = p_certificate_number,
          issued_date = p_completed_at,
          expiry_date = v_calc_expiry,
          recorded_by = p_recorded_by,
          updated_at = now()
        WHERE id = v_record_id;
      ELSE
        -- Insert new
        INSERT INTO training_records (
          company_id, profile_id, course_id, status,
          completed_at, score_percentage, passed,
          certificate_number, issued_date, expiry_date, recorded_by
        ) VALUES (
          v_company_id, p_profile_id, p_course_id, 'completed',
          p_completed_at, p_score, 
          CASE WHEN p_score IS NOT NULL THEN p_score >= COALESCE(v_course.pass_mark_percentage, 70) ELSE true END,
          p_certificate_number, p_completed_at, v_calc_expiry, p_recorded_by
        )
        RETURNING id INTO v_record_id;
      END IF;
      
      RETURN v_record_id;
    END;
    $function$ LANGUAGE plpgsql;

    -- Get employees with expiring training
    CREATE OR REPLACE FUNCTION get_expiring_training(
      p_company_id UUID,
      p_days_ahead INTEGER DEFAULT 30
    )
    RETURNS TABLE (
      record_id UUID,
      profile_id UUID,
      employee_name TEXT,
      course_name TEXT,
      course_code TEXT,
      expiry_date DATE,
      days_until_expiry INTEGER,
      is_expired BOOLEAN
    ) AS $function$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
        RETURN;
      END IF;

      RETURN QUERY
      SELECT 
        tr.id,
        tr.profile_id,
        p.full_name,
        tc.name,
        tc.code,
        tr.expiry_date,
        (tr.expiry_date - CURRENT_DATE)::INTEGER,
        tr.expiry_date < CURRENT_DATE
      FROM training_records tr
      JOIN profiles p ON p.id = tr.profile_id
      JOIN training_courses tc ON tc.id = tr.course_id
      WHERE tr.company_id = p_company_id
        AND tr.status = 'completed'
        AND tr.expiry_date IS NOT NULL
        AND tr.expiry_date <= CURRENT_DATE + p_days_ahead
      ORDER BY tr.expiry_date;
    END;
    $function$ LANGUAGE plpgsql;

    -- Check employee compliance
    CREATE OR REPLACE FUNCTION check_employee_compliance(p_profile_id UUID)
    RETURNS TABLE (
      course_id UUID,
      course_name TEXT,
      course_code TEXT,
      is_mandatory BOOLEAN,
      status TEXT,
      expiry_date DATE,
      is_compliant BOOLEAN
    ) AS $function$
    DECLARE
      v_profile RECORD;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records') THEN
        RETURN;
      END IF;

      SELECT * INTO v_profile FROM profiles WHERE id = p_profile_id;
      
      IF NOT FOUND THEN
        RETURN;
      END IF;
      
      RETURN QUERY
      SELECT 
        tc.id,
        tc.name,
        tc.code,
        tc.is_mandatory,
        COALESCE(tr.status, 'not_started'),
        tr.expiry_date,
        CASE 
          WHEN NOT tc.is_mandatory THEN true
          WHEN tr.status = 'completed' AND (tr.expiry_date IS NULL OR tr.expiry_date > CURRENT_DATE) THEN true
          ELSE false
        END
      FROM training_courses tc
      LEFT JOIN training_records tr ON tr.course_id = tc.id AND tr.profile_id = p_profile_id
        AND tr.status IN ('completed', 'in_progress', 'not_started')
      WHERE tc.company_id = v_profile.company_id
        AND tc.is_active = true
        AND (
          tc.is_mandatory = true
          OR tc.mandatory_for_roles IS NULL
          OR LOWER(v_profile.app_role) = ANY(SELECT LOWER(unnest) FROM unnest(tc.mandatory_for_roles))
        )
      ORDER BY tc.sort_order;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created training_records table with functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles, training_courses) do not exist yet - skipping training_records table creation';
  END IF;
END $$;

