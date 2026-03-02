-- =====================================================
-- MIGRATE LEGACY TRAINING DATA FROM PROFILES TO TRAINING_RECORDS
-- This migration copies hardcoded training fields from profiles table
-- to the new training_records table
-- =====================================================

DO $$
DECLARE
  profile_record RECORD;
  course_record RECORD;
  training_record_id UUID;
  expiry_date DATE;
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_records')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN

    RAISE NOTICE 'Starting legacy training data migration...';

    -- Migrate Food Safety Level
    FOR profile_record IN 
      SELECT 
        id,
        company_id,
        food_safety_level,
        food_safety_expiry_date,
        full_name
      FROM profiles
      WHERE food_safety_level IS NOT NULL
    LOOP
      -- Find Food Safety Level 2 course
      SELECT id INTO course_record
      FROM training_courses
      WHERE code = 'FS-L2'
        AND company_id = profile_record.company_id
      LIMIT 1;

      IF course_record.id IS NOT NULL THEN
        -- Calculate expiry date (3 years from now if not provided, or use provided date)
        IF profile_record.food_safety_expiry_date IS NOT NULL THEN
          expiry_date := profile_record.food_safety_expiry_date::DATE;
        ELSE
          expiry_date := (CURRENT_DATE + INTERVAL '3 years')::DATE;
        END IF;

        -- Check if training record already exists
        SELECT id INTO training_record_id
        FROM training_records
        WHERE profile_id = profile_record.id
          AND course_id = course_record.id
          AND status = 'completed'
        LIMIT 1;

        IF training_record_id IS NULL THEN
          -- Create training record
          INSERT INTO training_records (
            company_id,
            profile_id,
            course_id,
            status,
            completed_at,
            score_percentage,
            passed,
            expiry_date,
            recorded_by,
            notes
          )
          VALUES (
            profile_record.company_id,
            profile_record.id,
            course_record.id,
            'completed',
            COALESCE(profile_record.food_safety_expiry_date::TIMESTAMPTZ - INTERVAL '3 years', CURRENT_TIMESTAMP),
            100, -- Assume passed if legacy data exists
            true,
            expiry_date,
            profile_record.id,
            'Migrated from legacy profiles.food_safety_level field'
          );
          
          RAISE NOTICE 'Migrated Food Safety Level % for profile %', profile_record.food_safety_level, profile_record.full_name;
        END IF;
      END IF;
    END LOOP;

    -- Migrate Health & Safety Level
    FOR profile_record IN 
      SELECT 
        id,
        company_id,
        h_and_s_level,
        h_and_s_expiry_date,
        full_name
      FROM profiles
      WHERE h_and_s_level IS NOT NULL
    LOOP
      -- Find Health & Safety Level 2 course
      SELECT id INTO course_record
      FROM training_courses
      WHERE code = 'HS-L2'
        AND company_id = profile_record.company_id
      LIMIT 1;

      IF course_record.id IS NOT NULL THEN
        -- Calculate expiry date
        IF profile_record.h_and_s_expiry_date IS NOT NULL THEN
          expiry_date := profile_record.h_and_s_expiry_date::DATE;
        ELSE
          expiry_date := (CURRENT_DATE + INTERVAL '3 years')::DATE;
        END IF;

        -- Check if training record already exists
        SELECT id INTO training_record_id
        FROM training_records
        WHERE profile_id = profile_record.id
          AND course_id = course_record.id
          AND status = 'completed'
        LIMIT 1;

        IF training_record_id IS NULL THEN
          INSERT INTO training_records (
            company_id,
            profile_id,
            course_id,
            status,
            completed_at,
            score_percentage,
            passed,
            expiry_date,
            recorded_by,
            notes
          )
          VALUES (
            profile_record.company_id,
            profile_record.id,
            course_record.id,
            'completed',
            COALESCE(profile_record.h_and_s_expiry_date::TIMESTAMPTZ - INTERVAL '3 years', CURRENT_TIMESTAMP),
            100,
            true,
            expiry_date,
            profile_record.id,
            'Migrated from legacy profiles.h_and_s_level field'
          );
          
          RAISE NOTICE 'Migrated H&S Level % for profile %', profile_record.h_and_s_level, profile_record.full_name;
        END IF;
      END IF;
    END LOOP;

    -- Migrate Fire Marshal Training
    FOR profile_record IN 
      SELECT 
        id,
        company_id,
        fire_marshal_trained,
        fire_marshal_expiry_date,
        full_name
      FROM profiles
      WHERE fire_marshal_trained = true
    LOOP
      -- Find Fire Marshal course
      SELECT id INTO course_record
      FROM training_courses
      WHERE code = 'FIRE'
        AND company_id = profile_record.company_id
      LIMIT 1;

      IF course_record.id IS NOT NULL THEN
        -- Calculate expiry date
        IF profile_record.fire_marshal_expiry_date IS NOT NULL THEN
          expiry_date := profile_record.fire_marshal_expiry_date::DATE;
        ELSE
          expiry_date := (CURRENT_DATE + INTERVAL '3 years')::DATE;
        END IF;

        -- Check if training record already exists
        SELECT id INTO training_record_id
        FROM training_records
        WHERE profile_id = profile_record.id
          AND course_id = course_record.id
          AND status = 'completed'
        LIMIT 1;

        IF training_record_id IS NULL THEN
          INSERT INTO training_records (
            company_id,
            profile_id,
            course_id,
            status,
            completed_at,
            score_percentage,
            passed,
            expiry_date,
            recorded_by,
            notes
          )
          VALUES (
            profile_record.company_id,
            profile_record.id,
            course_record.id,
            'completed',
            COALESCE(profile_record.fire_marshal_expiry_date::TIMESTAMPTZ - INTERVAL '3 years', CURRENT_TIMESTAMP),
            100,
            true,
            expiry_date,
            profile_record.id,
            'Migrated from legacy profiles.fire_marshal_trained field'
          );
          
          RAISE NOTICE 'Migrated Fire Marshal training for profile %', profile_record.full_name;
        END IF;
      END IF;
    END LOOP;

    -- Migrate First Aid Training
    FOR profile_record IN 
      SELECT 
        id,
        company_id,
        first_aid_trained,
        first_aid_expiry_date,
        full_name
      FROM profiles
      WHERE first_aid_trained = true
    LOOP
      -- Find First Aid course (may need to check course name or create if doesn't exist)
      -- For now, we'll skip if course doesn't exist
      SELECT id INTO course_record
      FROM training_courses
      WHERE (name ILIKE '%First Aid%' OR code = 'FIRST-AID')
        AND company_id = profile_record.company_id
      LIMIT 1;

      IF course_record.id IS NOT NULL THEN
        -- Calculate expiry date
        IF profile_record.first_aid_expiry_date IS NOT NULL THEN
          expiry_date := profile_record.first_aid_expiry_date::DATE;
        ELSE
          expiry_date := (CURRENT_DATE + INTERVAL '3 years')::DATE;
        END IF;

        -- Check if training record already exists
        SELECT id INTO training_record_id
        FROM training_records
        WHERE profile_id = profile_record.id
          AND course_id = course_record.id
          AND status = 'completed'
        LIMIT 1;

        IF training_record_id IS NULL THEN
          INSERT INTO training_records (
            company_id,
            profile_id,
            course_id,
            status,
            completed_at,
            score_percentage,
            passed,
            expiry_date,
            recorded_by,
            notes
          )
          VALUES (
            profile_record.company_id,
            profile_record.id,
            course_record.id,
            'completed',
            COALESCE(profile_record.first_aid_expiry_date::TIMESTAMPTZ - INTERVAL '3 years', CURRENT_TIMESTAMP),
            100,
            true,
            expiry_date,
            profile_record.id,
            'Migrated from legacy profiles.first_aid_trained field'
          );
          
          RAISE NOTICE 'Migrated First Aid training for profile %', profile_record.full_name;
        END IF;
      END IF;
    END LOOP;

    -- Migrate COSHH Training
    FOR profile_record IN 
      SELECT 
        id,
        company_id,
        cossh_trained,
        cossh_expiry_date,
        full_name
      FROM profiles
      WHERE cossh_trained = true
    LOOP
      -- Find COSHH course
      SELECT id INTO course_record
      FROM training_courses
      WHERE code = 'COSHH'
        AND company_id = profile_record.company_id
      LIMIT 1;

      IF course_record.id IS NOT NULL THEN
        -- Calculate expiry date
        IF profile_record.cossh_expiry_date IS NOT NULL THEN
          expiry_date := profile_record.cossh_expiry_date::DATE;
        ELSE
          expiry_date := (CURRENT_DATE + INTERVAL '3 years')::DATE;
        END IF;

        -- Check if training record already exists
        SELECT id INTO training_record_id
        FROM training_records
        WHERE profile_id = profile_record.id
          AND course_id = course_record.id
          AND status = 'completed'
        LIMIT 1;

        IF training_record_id IS NULL THEN
          INSERT INTO training_records (
            company_id,
            profile_id,
            course_id,
            status,
            completed_at,
            score_percentage,
            passed,
            expiry_date,
            recorded_by,
            notes
          )
          VALUES (
            profile_record.company_id,
            profile_record.id,
            course_record.id,
            'completed',
            COALESCE(profile_record.cossh_expiry_date::TIMESTAMPTZ - INTERVAL '3 years', CURRENT_TIMESTAMP),
            100,
            true,
            expiry_date,
            profile_record.id,
            'Migrated from legacy profiles.cossh_trained field'
          );
          
          RAISE NOTICE 'Migrated COSHH training for profile %', profile_record.full_name;
        END IF;
      END IF;
    END LOOP;

    RAISE NOTICE 'Legacy training data migration completed';

  ELSE
    RAISE NOTICE '⚠️ Required tables do not exist - skipping legacy training data migration';
  END IF;
END $$;
