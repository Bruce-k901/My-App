-- =====================================================
-- TRAINING COURSES TABLE
-- Catalog of available training courses
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
DECLARE
  company_record RECORD;
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS training_courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      -- Course info
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      
      -- Category for grouping
      category TEXT NOT NULL DEFAULT 'General',
      -- e.g., 'Food Safety', 'Health & Safety', 'Compliance', 'Skills', 'Management'
      
      -- Course type
      course_type TEXT NOT NULL DEFAULT 'internal',
      -- Values: 'internal' (in-house), 'external' (third-party), 'online', 'certification'
      
      -- Provider (for external courses)
      provider TEXT,
      provider_url TEXT,
      
      -- Duration
      duration_minutes INTEGER,
      
      -- Certification details
      results_in_certification BOOLEAN DEFAULT false,
      certification_name TEXT,
      certification_validity_months INTEGER,
      -- How long the cert is valid (NULL = never expires)
      
      -- Requirements
      is_mandatory BOOLEAN DEFAULT false,
      mandatory_for_roles TEXT[],
      -- e.g., ['staff', 'manager'] - NULL or empty = all roles if mandatory
      
      mandatory_for_sites UUID[],
      -- Specific sites - NULL = all sites if mandatory
      
      prerequisite_course_id UUID,
      -- Must complete this course first
      
      -- Renewal
      renewal_required BOOLEAN DEFAULT false,
      renewal_period_months INTEGER,
      renewal_reminder_days INTEGER DEFAULT 30,
      -- Days before expiry to send reminder
      
      -- Content
      content_url TEXT,
      -- Link to training materials
      
      assessment_required BOOLEAN DEFAULT false,
      pass_mark_percentage INTEGER DEFAULT 70,
      
      -- Status
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      
      -- Audit
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(company_id, code)
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'training_courses' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE training_courses 
      ADD CONSTRAINT training_courses_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'training_courses' 
      AND constraint_name LIKE '%prerequisite_course_id%'
    ) THEN
      ALTER TABLE training_courses 
      ADD CONSTRAINT training_courses_prerequisite_course_id_fkey 
      FOREIGN KEY (prerequisite_course_id) REFERENCES training_courses(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'training_courses' 
      AND constraint_name LIKE '%created_by%'
    ) THEN
      ALTER TABLE training_courses 
      ADD CONSTRAINT training_courses_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_training_courses_company ON training_courses(company_id);
    CREATE INDEX IF NOT EXISTS idx_training_courses_category ON training_courses(company_id, category);
    CREATE INDEX IF NOT EXISTS idx_training_courses_mandatory ON training_courses(company_id, is_mandatory) WHERE is_mandatory = true;
    CREATE INDEX IF NOT EXISTS idx_training_courses_active ON training_courses(company_id, is_active) WHERE is_active = true;

    -- RLS
    ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "view_company_courses" ON training_courses;
    DROP POLICY IF EXISTS "manage_courses" ON training_courses;

    CREATE POLICY "view_company_courses"
    ON training_courses FOR SELECT
    USING (
      company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
    );

    CREATE POLICY "manage_courses"
    ON training_courses FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
      )
    );

    -- =====================================================
    -- SEED DEFAULT TRAINING COURSES
    -- UK Hospitality standard courses
    -- =====================================================

    CREATE OR REPLACE FUNCTION seed_default_training_courses(p_company_id UUID)
    RETURNS void AS $function$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'training_courses') THEN
        RETURN;
      END IF;

      -- Food Safety Level 2
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name, certification_validity_months,
        is_mandatory, renewal_required, renewal_period_months, renewal_reminder_days,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Food Safety Level 2', 'FS-L2',
        'Basic food hygiene certificate required for all food handlers',
        'Food Safety', 'certification',
        true, 'Food Safety Level 2 Certificate', 36,
        true, true, 36, 60,
        180, 1
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- Food Safety Level 3
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name, certification_validity_months,
        is_mandatory, mandatory_for_roles, renewal_required, renewal_period_months,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Food Safety Level 3', 'FS-L3',
        'Advanced food safety for supervisors and managers',
        'Food Safety', 'certification',
        true, 'Food Safety Level 3 Certificate', 36,
        true, ARRAY['manager', 'owner'], true, 36,
        480, 2
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- Allergen Awareness
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name, certification_validity_months,
        is_mandatory, renewal_required, renewal_period_months,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Allergen Awareness', 'ALLERGY',
        'Understanding food allergens and preventing cross-contamination',
        'Food Safety', 'online',
        true, 'Allergen Awareness Certificate', 12,
        true, true, 12,
        60, 3
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- Health and Safety Level 2
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name, certification_validity_months,
        is_mandatory, renewal_required, renewal_period_months, renewal_reminder_days,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Health and Safety Level 2', 'HS-L2',
        'Comprehensive workplace safety course covering risk assessment, fire safety, manual handling, and kitchen-specific hazards',
        'Health & Safety', 'online',
        true, 'Health and Safety Level 2 Certificate', 36,
        true, true, 36, 60,
        240, 2.5
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- COSHH
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name,
        is_mandatory, renewal_required, renewal_period_months,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'COSHH Training', 'COSHH',
        'Control of Substances Hazardous to Health - safe handling of cleaning chemicals',
        'Health & Safety', 'internal',
        true, 'COSHH Certificate',
        true, true, 24,
        45, 4
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- Manual Handling
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name,
        is_mandatory, renewal_required, renewal_period_months,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Manual Handling', 'MH',
        'Safe lifting and carrying techniques to prevent injury',
        'Health & Safety', 'internal',
        true, 'Manual Handling Certificate',
        true, true, 24,
        30, 5
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- Fire Safety
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name,
        is_mandatory, renewal_required, renewal_period_months,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Fire Safety Awareness', 'FIRE',
        'Fire prevention, evacuation procedures, and extinguisher use',
        'Health & Safety', 'internal',
        true, 'Fire Safety Certificate',
        true, true, 12,
        45, 6
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- First Aid at Work
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name, certification_validity_months,
        is_mandatory, mandatory_for_roles, renewal_required, renewal_period_months,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'First Aid at Work', 'FAW',
        'Full first aid qualification for designated first aiders',
        'Health & Safety', 'external',
        true, 'First Aid at Work Certificate', 36,
        false, NULL, true, 36,
        1080, 7
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- Personal Licence
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        results_in_certification, certification_name, certification_validity_months,
        is_mandatory, mandatory_for_roles, renewal_required, renewal_period_months,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Personal Licence Holder', 'PLH',
        'Required for authorising alcohol sales',
        'Compliance', 'external',
        true, 'Personal Licence', NULL,
        false, ARRAY['manager', 'owner'], false, NULL,
        360, 8
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- Health & Safety Induction
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        is_mandatory, duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Health & Safety Induction', 'HS-IND',
        'Basic H&S orientation for new starters',
        'Health & Safety', 'internal',
        true, 30, 9
      ) ON CONFLICT (company_id, code) DO NOTHING;
      
      -- GDPR/Data Protection
      INSERT INTO training_courses (
        company_id, name, code, description, category, course_type,
        is_mandatory, renewal_required, renewal_period_months,
        duration_minutes, sort_order
      ) VALUES (
        p_company_id, 'Data Protection & GDPR', 'GDPR',
        'Understanding data protection requirements',
        'Compliance', 'online',
        true, true, 12,
        30, 10
      ) ON CONFLICT (company_id, code) DO NOTHING;
    END;
    $function$ LANGUAGE plpgsql;

    -- Trigger for new companies
    CREATE OR REPLACE FUNCTION trigger_seed_training_courses()
    RETURNS TRIGGER AS $function$
    BEGIN
      PERFORM seed_default_training_courses(NEW.id);
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_new_company_training ON companies;
    CREATE TRIGGER trigger_new_company_training
      AFTER INSERT ON companies
      FOR EACH ROW
      EXECUTE FUNCTION trigger_seed_training_courses();

    -- Seed for existing companies
    FOR company_record IN SELECT id FROM companies LOOP
      PERFORM seed_default_training_courses(company_record.id);
    END LOOP;

    RAISE NOTICE 'Created training_courses table and seeded default courses';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping training_courses table creation';
  END IF;
END $$;

