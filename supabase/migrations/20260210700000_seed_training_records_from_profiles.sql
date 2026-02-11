-- =====================================================
-- SEED training_records FROM profile cert fields
-- One-time migration to populate training_records with
-- existing certification data stored in profile fields.
-- This makes training_records the single source of truth.
-- =====================================================

DO $$
DECLARE
  v_inserted INTEGER := 0;
  v_count INTEGER;
BEGIN
  -- Only proceed if all required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE NOTICE 'Required tables do not exist - skipping seed';
    RETURN;
  END IF;

  -- ============================================================
  -- SCHEMA NORMALIZATION
  -- The remote training_records table may have been created with
  -- different column names. Normalize to our expected schema.
  -- ============================================================

  -- Normalize course_id column (may be named training_course_id or training_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'course_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'training_course_id'
    ) THEN
      RAISE NOTICE 'Renaming training_course_id → course_id';
      ALTER TABLE training_records RENAME COLUMN training_course_id TO course_id;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'training_id'
    ) THEN
      RAISE NOTICE 'Renaming training_id → course_id';
      ALTER TABLE training_records RENAME COLUMN training_id TO course_id;
    ELSE
      RAISE NOTICE 'Adding missing course_id column to training_records';
      ALTER TABLE training_records ADD COLUMN course_id UUID;
    END IF;
  END IF;

  -- Normalize profile_id column (may be named user_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'profile_id'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'user_id'
    ) THEN
      RAISE NOTICE 'Renaming user_id → profile_id';
      ALTER TABLE training_records RENAME COLUMN user_id TO profile_id;
    ELSE
      RAISE NOTICE 'Adding missing profile_id column to training_records';
      ALTER TABLE training_records ADD COLUMN profile_id UUID;
    END IF;
  END IF;

  -- Normalize completed_at column (may be named completed_date)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'completed_at'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'completed_date'
    ) THEN
      RAISE NOTICE 'Renaming completed_date → completed_at';
      ALTER TABLE training_records RENAME COLUMN completed_date TO completed_at;
    ELSE
      ALTER TABLE training_records ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
  END IF;

  -- Ensure company_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'company_id'
  ) THEN
    RAISE NOTICE 'Adding missing company_id column to training_records';
    ALTER TABLE training_records ADD COLUMN company_id UUID;
    -- Backfill from profiles where possible
    UPDATE training_records tr SET company_id = p.company_id
    FROM profiles p WHERE p.id = tr.profile_id AND tr.company_id IS NULL;
    -- Only set NOT NULL if all rows have a value
    IF NOT EXISTS (SELECT 1 FROM training_records WHERE company_id IS NULL) THEN
      ALTER TABLE training_records ALTER COLUMN company_id SET NOT NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'training_records' AND constraint_name = 'training_records_company_id_fkey'
    ) THEN
      BEGIN
        ALTER TABLE training_records
        ADD CONSTRAINT training_records_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not add company_id FK: %', SQLERRM;
      END;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_training_records_company ON training_records(company_id);
  END IF;

  -- Ensure status column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'status'
  ) THEN
    ALTER TABLE training_records ADD COLUMN status TEXT NOT NULL DEFAULT 'not_started';
  END IF;

  -- Ensure expiry_date column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE training_records ADD COLUMN expiry_date DATE;
  END IF;

  -- Ensure all columns referenced by our code exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'issued_date') THEN
    ALTER TABLE training_records ADD COLUMN issued_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'passed') THEN
    ALTER TABLE training_records ADD COLUMN passed BOOLEAN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'score_percentage') THEN
    ALTER TABLE training_records ADD COLUMN score_percentage INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'certificate_number') THEN
    ALTER TABLE training_records ADD COLUMN certificate_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'certificate_url') THEN
    ALTER TABLE training_records ADD COLUMN certificate_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'verified') THEN
    ALTER TABLE training_records ADD COLUMN verified BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'verified_by') THEN
    ALTER TABLE training_records ADD COLUMN verified_by UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'verified_at') THEN
    ALTER TABLE training_records ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'notes') THEN
    ALTER TABLE training_records ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'trainer_name') THEN
    ALTER TABLE training_records ADD COLUMN trainer_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'training_location') THEN
    ALTER TABLE training_records ADD COLUMN training_location TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'recorded_by') THEN
    ALTER TABLE training_records ADD COLUMN recorded_by UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'renewal_reminder_sent') THEN
    ALTER TABLE training_records ADD COLUMN renewal_reminder_sent BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'renewal_reminder_sent_at') THEN
    ALTER TABLE training_records ADD COLUMN renewal_reminder_sent_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'attempts') THEN
    ALTER TABLE training_records ADD COLUMN attempts INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'started_at') THEN
    ALTER TABLE training_records ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'training_records' AND column_name = 'updated_at') THEN
    ALTER TABLE training_records ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- Handle training_type column if it has a NOT NULL constraint (remote schema quirk)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records'
      AND column_name = 'training_type' AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Dropping NOT NULL constraint on training_type';
    ALTER TABLE training_records ALTER COLUMN training_type DROP NOT NULL;
  END IF;

  -- Handle any other NOT NULL columns we don't control
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'training_records'
      AND column_name = 'training_name' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE training_records ALTER COLUMN training_name DROP NOT NULL;
  END IF;

  -- Ensure essential indexes exist
  CREATE INDEX IF NOT EXISTS idx_training_records_profile ON training_records(profile_id);
  CREATE INDEX IF NOT EXISTS idx_training_records_course ON training_records(course_id);
  CREATE INDEX IF NOT EXISTS idx_training_records_status ON training_records(status);
  CREATE INDEX IF NOT EXISTS idx_training_records_expiry ON training_records(expiry_date) WHERE expiry_date IS NOT NULL;

  -- Unique active training index (prevents duplicate active records)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'training_records' AND indexname = 'idx_unique_active_training') THEN
    BEGIN
      CREATE UNIQUE INDEX idx_unique_active_training ON training_records(profile_id, course_id) WHERE status IN ('not_started', 'in_progress', 'completed');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create unique index (duplicates exist?): %', SQLERRM;
    END;
  END IF;

  -- Enable RLS
  ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

  RAISE NOTICE 'Schema normalization complete';

  -- Check that profile cert columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'food_safety_level') THEN
    RAISE NOTICE 'Profile cert columns not found - skipping seed';
    RETURN;
  END IF;

  -- ============================================
  -- Food Safety Level 2 (FS-L2)
  -- Profile: food_safety_level >= 2
  -- ============================================
  INSERT INTO training_records (company_id, profile_id, course_id, status, completed_at, expiry_date, passed, issued_date)
  SELECT
    p.company_id,
    p.id,
    tc.id,
    'completed',
    COALESCE(
      CASE WHEN p.food_safety_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.food_safety_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    ),
    p.food_safety_expiry_date,
    true,
    COALESCE(
      CASE WHEN p.food_safety_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.food_safety_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    )
  FROM profiles p
  JOIN training_courses tc ON tc.company_id = p.company_id AND tc.code = 'FS-L2' AND tc.is_active = true
  WHERE p.food_safety_level >= 2
    AND (p.status = 'active' OR p.status IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM training_records tr
      WHERE tr.profile_id = p.id AND tr.course_id = tc.id
        AND tr.status IN ('completed', 'in_progress', 'not_started')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;
  RAISE NOTICE 'FS-L2: inserted % records', v_count;

  -- ============================================
  -- Food Safety Level 3 (FS-L3)
  -- Profile: food_safety_level >= 3
  -- ============================================
  INSERT INTO training_records (company_id, profile_id, course_id, status, completed_at, expiry_date, passed, issued_date)
  SELECT
    p.company_id,
    p.id,
    tc.id,
    'completed',
    COALESCE(
      CASE WHEN p.food_safety_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.food_safety_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    ),
    p.food_safety_expiry_date,
    true,
    COALESCE(
      CASE WHEN p.food_safety_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.food_safety_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    )
  FROM profiles p
  JOIN training_courses tc ON tc.company_id = p.company_id AND tc.code = 'FS-L3' AND tc.is_active = true
  WHERE p.food_safety_level >= 3
    AND (p.status = 'active' OR p.status IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM training_records tr
      WHERE tr.profile_id = p.id AND tr.course_id = tc.id
        AND tr.status IN ('completed', 'in_progress', 'not_started')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;
  RAISE NOTICE 'FS-L3: inserted % records', v_count;

  -- ============================================
  -- Health & Safety Level 2 (HS-L2)
  -- Profile: h_and_s_level >= 2
  -- ============================================
  INSERT INTO training_records (company_id, profile_id, course_id, status, completed_at, expiry_date, passed, issued_date)
  SELECT
    p.company_id,
    p.id,
    tc.id,
    'completed',
    COALESCE(
      CASE WHEN p.h_and_s_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.h_and_s_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    ),
    p.h_and_s_expiry_date,
    true,
    COALESCE(
      CASE WHEN p.h_and_s_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.h_and_s_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    )
  FROM profiles p
  JOIN training_courses tc ON tc.company_id = p.company_id AND tc.code = 'HS-L2' AND tc.is_active = true
  WHERE p.h_and_s_level >= 2
    AND (p.status = 'active' OR p.status IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM training_records tr
      WHERE tr.profile_id = p.id AND tr.course_id = tc.id
        AND tr.status IN ('completed', 'in_progress', 'not_started')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;
  RAISE NOTICE 'HS-L2: inserted % records', v_count;

  -- ============================================
  -- Fire Safety (FIRE)
  -- Profile: fire_marshal_trained = true
  -- ============================================
  INSERT INTO training_records (company_id, profile_id, course_id, status, completed_at, expiry_date, passed, issued_date)
  SELECT
    p.company_id,
    p.id,
    tc.id,
    'completed',
    COALESCE(
      CASE WHEN p.fire_marshal_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.fire_marshal_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    ),
    p.fire_marshal_expiry_date,
    true,
    COALESCE(
      CASE WHEN p.fire_marshal_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.fire_marshal_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    )
  FROM profiles p
  JOIN training_courses tc ON tc.company_id = p.company_id AND tc.code = 'FIRE' AND tc.is_active = true
  WHERE p.fire_marshal_trained = true
    AND (p.status = 'active' OR p.status IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM training_records tr
      WHERE tr.profile_id = p.id AND tr.course_id = tc.id
        AND tr.status IN ('completed', 'in_progress', 'not_started')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;
  RAISE NOTICE 'FIRE: inserted % records', v_count;

  -- ============================================
  -- First Aid at Work (FAW)
  -- Profile: first_aid_trained = true
  -- ============================================
  INSERT INTO training_records (company_id, profile_id, course_id, status, completed_at, expiry_date, passed, issued_date)
  SELECT
    p.company_id,
    p.id,
    tc.id,
    'completed',
    COALESCE(
      CASE WHEN p.first_aid_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.first_aid_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    ),
    p.first_aid_expiry_date,
    true,
    COALESCE(
      CASE WHEN p.first_aid_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.first_aid_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    )
  FROM profiles p
  JOIN training_courses tc ON tc.company_id = p.company_id AND tc.code = 'FAW' AND tc.is_active = true
  WHERE p.first_aid_trained = true
    AND (p.status = 'active' OR p.status IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM training_records tr
      WHERE tr.profile_id = p.id AND tr.course_id = tc.id
        AND tr.status IN ('completed', 'in_progress', 'not_started')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;
  RAISE NOTICE 'FAW: inserted % records', v_count;

  -- ============================================
  -- COSHH (COSHH)
  -- Profile: cossh_trained = true
  -- ============================================
  INSERT INTO training_records (company_id, profile_id, course_id, status, completed_at, expiry_date, passed, issued_date)
  SELECT
    p.company_id,
    p.id,
    tc.id,
    'completed',
    COALESCE(
      CASE WHEN p.cossh_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.cossh_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    ),
    p.cossh_expiry_date,
    true,
    COALESCE(
      CASE WHEN p.cossh_expiry_date IS NOT NULL AND tc.certification_validity_months IS NOT NULL
        THEN (p.cossh_expiry_date - (tc.certification_validity_months || ' months')::INTERVAL)::DATE
        ELSE NULL END,
      CURRENT_DATE
    )
  FROM profiles p
  JOIN training_courses tc ON tc.company_id = p.company_id AND tc.code = 'COSHH' AND tc.is_active = true
  WHERE p.cossh_trained = true
    AND (p.status = 'active' OR p.status IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM training_records tr
      WHERE tr.profile_id = p.id AND tr.course_id = tc.id
        AND tr.status IN ('completed', 'in_progress', 'not_started')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_inserted := v_inserted + v_count;
  RAISE NOTICE 'COSHH: inserted % records', v_count;

  RAISE NOTICE '=== Total training records seeded: % ===', v_inserted;
END $$;
