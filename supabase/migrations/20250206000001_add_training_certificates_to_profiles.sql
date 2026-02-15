-- ============================================================================
-- Migration: 20250206000001_add_training_certificates_to_profiles.sql
-- Description: Add training certificate fields to profiles table
-- Note: This migration will be skipped if profiles table doesn't exist yet
-- ============================================================================

-- Add training certificate columns to profiles table (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS food_safety_level INTEGER CHECK (food_safety_level IN (2, 3, 4, 5) OR food_safety_level IS NULL),
    ADD COLUMN IF NOT EXISTS food_safety_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS h_and_s_level INTEGER CHECK (h_and_s_level IN (2, 3, 4) OR h_and_s_level IS NULL),
    ADD COLUMN IF NOT EXISTS h_and_s_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS fire_marshal_trained BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fire_marshal_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS first_aid_trained BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS first_aid_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS cossh_trained BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cossh_expiry_date DATE;

    -- Add indexes for efficient querying of expiry dates
    CREATE INDEX IF NOT EXISTS idx_profiles_food_safety_expiry ON public.profiles(food_safety_expiry_date) WHERE food_safety_expiry_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_h_and_s_expiry ON public.profiles(h_and_s_expiry_date) WHERE h_and_s_expiry_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_fire_marshal_expiry ON public.profiles(fire_marshal_expiry_date) WHERE fire_marshal_expiry_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_first_aid_expiry ON public.profiles(first_aid_expiry_date) WHERE first_aid_expiry_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_cossh_expiry ON public.profiles(cossh_expiry_date) WHERE cossh_expiry_date IS NOT NULL;
  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping training certificate columns';
  END IF;
END $$;

-- Function to create training certificate renewal tasks
-- This function creates tasks 1 month before certificate expiry dates
-- Only create if profiles and tasks tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    CREATE OR REPLACE FUNCTION create_training_certificate_renewal_tasks()
    RETURNS INTEGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      task_count INTEGER := 0;
      profile_record RECORD;
      one_month_from_now DATE;
      task_name TEXT;
      task_description TEXT;
    BEGIN
      one_month_from_now := CURRENT_DATE + INTERVAL '1 month';

      -- Check Food Safety certificates
      FOR profile_record IN
        SELECT 
          p.id as profile_id,
          p.company_id,
          COALESCE(p.site_id, p.home_site) as site_id,
          p.full_name,
          p.food_safety_level,
          p.food_safety_expiry_date
        FROM public.profiles p
        WHERE p.company_id IS NOT NULL
          AND (p.site_id IS NOT NULL OR p.home_site IS NOT NULL)
          AND p.food_safety_level IS NOT NULL
          AND p.food_safety_expiry_date IS NOT NULL
          AND p.food_safety_expiry_date <= one_month_from_now
          AND p.food_safety_expiry_date > CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.assigned_to = p.id
              AND t.name LIKE '%Food Safety%Certificate%Renewal%'
              AND t.due_date >= CURRENT_DATE
              AND t.status != 'completed'
          )
      LOOP
    task_name := 'Food Safety Level ' || profile_record.food_safety_level || ' Certificate Renewal';
    task_description := 'Book ' || COALESCE(profile_record.full_name, 'user') || 
                       ' onto a refresher course for Food Safety Level ' || profile_record.food_safety_level || 
                       '. Certificate expires on ' || TO_CHAR(profile_record.food_safety_expiry_date, 'DD/MM/YYYY') || '.';

    INSERT INTO public.tasks (
      company_id,
      site_id,
      name,
      task_type,
      assigned_to,
      due_date,
      status,
      notes
    ) VALUES (
      profile_record.company_id,
      profile_record.site_id,
      task_name,
      'general',
      profile_record.profile_id,
      profile_record.food_safety_expiry_date - INTERVAL '1 month',
      'pending',
      task_description
    );

    task_count := task_count + 1;
  END LOOP;

  -- Check H&S certificates
  FOR profile_record IN
    SELECT 
      p.id as profile_id,
      p.company_id,
      COALESCE(p.site_id, p.home_site) as site_id,
      p.full_name,
      p.h_and_s_level,
      p.h_and_s_expiry_date
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
      AND (p.site_id IS NOT NULL OR p.home_site IS NOT NULL)
      AND p.h_and_s_level IS NOT NULL
      AND p.h_and_s_expiry_date IS NOT NULL
      AND p.h_and_s_expiry_date <= one_month_from_now
      AND p.h_and_s_expiry_date > CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.assigned_to = p.id
          AND t.name LIKE '%H&S%Certificate%Renewal%'
          AND t.due_date >= CURRENT_DATE
          AND t.status != 'completed'
      )
  LOOP
    task_name := 'Health & Safety Level ' || profile_record.h_and_s_level || ' Certificate Renewal';
    task_description := 'Book ' || COALESCE(profile_record.full_name, 'user') || 
                       ' onto a refresher course for Health & Safety Level ' || profile_record.h_and_s_level || 
                       '. Certificate expires on ' || TO_CHAR(profile_record.h_and_s_expiry_date, 'DD/MM/YYYY') || '.';

    INSERT INTO public.tasks (
      company_id,
      site_id,
      name,
      task_type,
      assigned_to,
      due_date,
      status,
      notes
    ) VALUES (
      profile_record.company_id,
      profile_record.site_id,
      task_name,
      'general',
      profile_record.profile_id,
      profile_record.h_and_s_expiry_date - INTERVAL '1 month',
      'pending',
      task_description
    );

    task_count := task_count + 1;
  END LOOP;

  -- Check Fire Marshal training
  FOR profile_record IN
    SELECT 
      p.id as profile_id,
      p.company_id,
      COALESCE(p.site_id, p.home_site) as site_id,
      p.full_name,
      p.fire_marshal_expiry_date
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
      AND (p.site_id IS NOT NULL OR p.home_site IS NOT NULL)
      AND p.fire_marshal_trained = TRUE
      AND p.fire_marshal_expiry_date IS NOT NULL
      AND p.fire_marshal_expiry_date <= one_month_from_now
      AND p.fire_marshal_expiry_date > CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.assigned_to = p.id
          AND t.name LIKE '%Fire Marshal%Training%Renewal%'
          AND t.due_date >= CURRENT_DATE
          AND t.status != 'completed'
      )
  LOOP
    task_name := 'Fire Marshal Training Renewal';
    task_description := 'Book ' || COALESCE(profile_record.full_name, 'user') || 
                       ' onto a Fire Marshal refresher course. Training expires on ' || 
                       TO_CHAR(profile_record.fire_marshal_expiry_date, 'DD/MM/YYYY') || '.';

    INSERT INTO public.tasks (
      company_id,
      site_id,
      name,
      task_type,
      assigned_to,
      due_date,
      status,
      notes
    ) VALUES (
      profile_record.company_id,
      profile_record.site_id,
      task_name,
      'general',
      profile_record.profile_id,
      profile_record.fire_marshal_expiry_date - INTERVAL '1 month',
      'pending',
      task_description
    );

    task_count := task_count + 1;
  END LOOP;

  -- Check First Aid training
  FOR profile_record IN
    SELECT 
      p.id as profile_id,
      p.company_id,
      COALESCE(p.site_id, p.home_site) as site_id,
      p.full_name,
      p.first_aid_expiry_date
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
      AND (p.site_id IS NOT NULL OR p.home_site IS NOT NULL)
      AND p.first_aid_trained = TRUE
      AND p.first_aid_expiry_date IS NOT NULL
      AND p.first_aid_expiry_date <= one_month_from_now
      AND p.first_aid_expiry_date > CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.assigned_to = p.id
          AND t.name LIKE '%First Aid%Training%Renewal%'
          AND t.due_date >= CURRENT_DATE
          AND t.status != 'completed'
      )
  LOOP
    task_name := 'First Aid Training Renewal';
    task_description := 'Book ' || COALESCE(profile_record.full_name, 'user') || 
                       ' onto a First Aid refresher course. Training expires on ' || 
                       TO_CHAR(profile_record.first_aid_expiry_date, 'DD/MM/YYYY') || '.';

    INSERT INTO public.tasks (
      company_id,
      site_id,
      name,
      task_type,
      assigned_to,
      due_date,
      status,
      notes
    ) VALUES (
      profile_record.company_id,
      profile_record.site_id,
      task_name,
      'general',
      profile_record.profile_id,
      profile_record.first_aid_expiry_date - INTERVAL '1 month',
      'pending',
      task_description
    );

    task_count := task_count + 1;
  END LOOP;

  -- Check COSSH training
  FOR profile_record IN
    SELECT 
      p.id as profile_id,
      p.company_id,
      COALESCE(p.site_id, p.home_site) as site_id,
      p.full_name,
      p.cossh_expiry_date
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
      AND (p.site_id IS NOT NULL OR p.home_site IS NOT NULL)
      AND p.cossh_trained = TRUE
      AND p.cossh_expiry_date IS NOT NULL
      AND p.cossh_expiry_date <= one_month_from_now
      AND p.cossh_expiry_date > CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.assigned_to = p.id
          AND t.name LIKE '%COSSH%Training%Renewal%'
          AND t.due_date >= CURRENT_DATE
          AND t.status != 'completed'
      )
  LOOP
    task_name := 'COSSH Training Renewal';
    task_description := 'Book ' || COALESCE(profile_record.full_name, 'user') || 
                       ' onto a COSSH refresher course. Training expires on ' || 
                       TO_CHAR(profile_record.cossh_expiry_date, 'DD/MM/YYYY') || '.';

    INSERT INTO public.tasks (
      company_id,
      site_id,
      name,
      task_type,
      assigned_to,
      due_date,
      status,
      notes
    ) VALUES (
      profile_record.company_id,
      profile_record.site_id,
      task_name,
      'general',
      profile_record.profile_id,
      profile_record.cossh_expiry_date - INTERVAL '1 month',
      'pending',
      task_description
    );

    task_count := task_count + 1;
  END LOOP;

      RETURN task_count;
    END;
    $function$;

    -- Grant execute permission to authenticated users
    GRANT EXECUTE ON FUNCTION create_training_certificate_renewal_tasks() TO authenticated;

    COMMENT ON FUNCTION create_training_certificate_renewal_tasks() IS 
    'Creates tasks for training certificate renewals 1 month before expiry dates. Should be called daily by a cron job or task generation function.';
  ELSE
    RAISE NOTICE '⚠️ profiles or tasks table does not exist yet - skipping training certificate renewal function';
  END IF;
END $$;

