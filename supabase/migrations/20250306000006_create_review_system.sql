-- =====================================================
-- REVIEW CYCLES TABLE
-- Company-wide review periods
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
DECLARE
  company_record RECORD;
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS review_cycles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      -- Cycle info
      name TEXT NOT NULL,
      description TEXT,
      
      -- Type
      cycle_type TEXT NOT NULL DEFAULT 'annual',
      -- Values: 'annual', 'semi_annual', 'quarterly', 'probation', 'project', 'ad_hoc'
      
      -- Dates
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      
      -- Review period (when reviews should be completed)
      review_window_start DATE,
      review_window_end DATE,
      
      -- Status
      status TEXT NOT NULL DEFAULT 'draft',
      -- Values: 'draft', 'active', 'in_review', 'completed', 'cancelled'
      
      -- Settings
      include_self_assessment BOOLEAN DEFAULT true,
      include_manager_assessment BOOLEAN DEFAULT true,
      include_peer_feedback BOOLEAN DEFAULT false,
      include_goals BOOLEAN DEFAULT true,
      
      -- Template
      template_id UUID,
      
      -- Audit
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'review_cycles' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE review_cycles 
      ADD CONSTRAINT review_cycles_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'review_cycles' 
      AND constraint_name LIKE '%created_by%'
    ) THEN
      ALTER TABLE review_cycles 
      ADD CONSTRAINT review_cycles_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_review_cycles_company ON review_cycles(company_id);
    CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);
    CREATE INDEX IF NOT EXISTS idx_review_cycles_dates ON review_cycles(start_date, end_date);

    -- RLS
    ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "view_company_cycles" ON review_cycles;
    DROP POLICY IF EXISTS "manage_cycles" ON review_cycles;

    CREATE POLICY "view_company_cycles"
    ON review_cycles FOR SELECT
    USING (
      company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
    );

    CREATE POLICY "manage_cycles"
    ON review_cycles FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner')
      )
    );

    -- =====================================================
    -- REVIEW TEMPLATES TABLE
    -- =====================================================

    CREATE TABLE IF NOT EXISTS review_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      name TEXT NOT NULL,
      description TEXT,
      
      -- Template type
      template_type TEXT NOT NULL DEFAULT 'standard',
      -- Values: 'standard', 'probation', '360', 'project'
      
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'review_templates' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE review_templates 
      ADD CONSTRAINT review_templates_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key from review_cycles to review_templates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_templates') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'review_cycles' 
        AND constraint_name LIKE '%template_id%'
      ) THEN
        ALTER TABLE review_cycles 
        ADD CONSTRAINT review_cycles_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES review_templates(id);
      END IF;
    END IF;

    -- =====================================================
    -- REVIEW TEMPLATE SECTIONS
    -- =====================================================

    CREATE TABLE IF NOT EXISTS review_template_sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id UUID NOT NULL,
      
      title TEXT NOT NULL,
      description TEXT,
      
      section_type TEXT NOT NULL DEFAULT 'rating',
      -- Values: 'rating', 'text', 'goals', 'competencies', 'values'
      
      -- For rating sections
      rating_scale INTEGER DEFAULT 5,
      rating_labels JSONB,
      -- e.g., {"1": "Needs Improvement", "3": "Meets Expectations", "5": "Exceeds"}
      
      -- Who fills this section
      completed_by TEXT NOT NULL DEFAULT 'both',
      -- Values: 'employee', 'manager', 'both'
      
      is_required BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraint
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_templates') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'review_template_sections' 
        AND constraint_name LIKE '%template_id%'
      ) THEN
        ALTER TABLE review_template_sections 
        ADD CONSTRAINT review_template_sections_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES review_templates(id) ON DELETE CASCADE;
      END IF;
    END IF;

    -- =====================================================
    -- REVIEW TEMPLATE QUESTIONS
    -- =====================================================

    CREATE TABLE IF NOT EXISTS review_template_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      section_id UUID NOT NULL,
      
      question_text TEXT NOT NULL,
      help_text TEXT,
      
      question_type TEXT NOT NULL DEFAULT 'rating',
      -- Values: 'rating', 'text', 'yes_no', 'multi_choice'
      
      options JSONB,
      -- For multi_choice questions
      
      is_required BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraint
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_template_sections') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'review_template_questions' 
        AND constraint_name LIKE '%section_id%'
      ) THEN
        ALTER TABLE review_template_questions 
        ADD CONSTRAINT review_template_questions_section_id_fkey 
        FOREIGN KEY (section_id) REFERENCES review_template_sections(id) ON DELETE CASCADE;
      END IF;
    END IF;

    -- =====================================================
    -- SEED DEFAULT REVIEW TEMPLATE
    -- =====================================================

    CREATE OR REPLACE FUNCTION seed_default_review_template(p_company_id UUID)
    RETURNS UUID AS $function$
    DECLARE
      v_template_id UUID;
      v_section_id UUID;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_templates')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_template_sections')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review_template_questions') THEN
        RETURN NULL;
      END IF;

      -- Create template
      INSERT INTO review_templates (company_id, name, description, template_type, is_default)
      VALUES (p_company_id, 'Standard Performance Review', 'Annual performance review template', 'standard', true)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_template_id;
      
      IF v_template_id IS NULL THEN
        SELECT id INTO v_template_id FROM review_templates WHERE company_id = p_company_id AND is_default = true LIMIT 1;
        RETURN v_template_id;
      END IF;
      
      -- Section 1: Overall Performance
      INSERT INTO review_template_sections (template_id, title, description, section_type, completed_by, sort_order, rating_labels)
      VALUES (v_template_id, 'Overall Performance', 'Rate overall job performance', 'rating', 'both', 1,
        '{"1": "Unsatisfactory", "2": "Needs Improvement", "3": "Meets Expectations", "4": "Exceeds Expectations", "5": "Outstanding"}'::JSONB)
      RETURNING id INTO v_section_id;
      
      INSERT INTO review_template_questions (section_id, question_text, help_text, question_type, sort_order) VALUES
      (v_section_id, 'Quality of Work', 'Accuracy, thoroughness, and reliability of work output', 'rating', 1),
      (v_section_id, 'Productivity', 'Volume of work completed and efficiency', 'rating', 2),
      (v_section_id, 'Job Knowledge', 'Understanding of role requirements and industry', 'rating', 3),
      (v_section_id, 'Reliability', 'Attendance, punctuality, and dependability', 'rating', 4),
      (v_section_id, 'Initiative', 'Self-motivation and proactive approach', 'rating', 5);
      
      -- Section 2: Core Competencies
      INSERT INTO review_template_sections (template_id, title, description, section_type, completed_by, sort_order)
      VALUES (v_template_id, 'Core Competencies', 'Key skills and behaviours', 'competencies', 'both', 2)
      RETURNING id INTO v_section_id;
      
      INSERT INTO review_template_questions (section_id, question_text, help_text, question_type, sort_order) VALUES
      (v_section_id, 'Communication', 'Verbal and written communication effectiveness', 'rating', 1),
      (v_section_id, 'Teamwork', 'Collaboration and support of colleagues', 'rating', 2),
      (v_section_id, 'Problem Solving', 'Ability to identify and resolve issues', 'rating', 3),
      (v_section_id, 'Customer Focus', 'Commitment to customer satisfaction', 'rating', 4),
      (v_section_id, 'Adaptability', 'Flexibility and response to change', 'rating', 5);
      
      -- Section 3: Achievements
      INSERT INTO review_template_sections (template_id, title, description, section_type, completed_by, sort_order)
      VALUES (v_template_id, 'Key Achievements', 'Notable accomplishments this period', 'text', 'employee', 3)
      RETURNING id INTO v_section_id;
      
      INSERT INTO review_template_questions (section_id, question_text, help_text, question_type, sort_order) VALUES
      (v_section_id, 'What are your top 3 achievements this review period?', 'Be specific about outcomes and impact', 'text', 1),
      (v_section_id, 'What challenges did you overcome?', 'Describe difficult situations and how you handled them', 'text', 2);
      
      -- Section 4: Development
      INSERT INTO review_template_sections (template_id, title, description, section_type, completed_by, sort_order)
      VALUES (v_template_id, 'Development & Growth', 'Areas for improvement and career development', 'text', 'both', 4)
      RETURNING id INTO v_section_id;
      
      INSERT INTO review_template_questions (section_id, question_text, help_text, question_type, sort_order) VALUES
      (v_section_id, 'What areas would you like to develop?', 'Skills, knowledge, or experience you want to build', 'text', 1),
      (v_section_id, 'What support do you need from your manager?', 'Resources, training, or guidance required', 'text', 2),
      (v_section_id, 'Career aspirations', 'Where do you see yourself in 1-2 years?', 'text', 3);
      
      -- Section 5: Manager Comments
      INSERT INTO review_template_sections (template_id, title, description, section_type, completed_by, sort_order)
      VALUES (v_template_id, 'Manager Assessment', 'Manager''s overall assessment and recommendations', 'text', 'manager', 5)
      RETURNING id INTO v_section_id;
      
      INSERT INTO review_template_questions (section_id, question_text, help_text, question_type, sort_order) VALUES
      (v_section_id, 'Summary of performance', 'Overall assessment of the employee''s performance', 'text', 1),
      (v_section_id, 'Key strengths', 'What does this employee do particularly well?', 'text', 2),
      (v_section_id, 'Areas for development', 'Where should this employee focus improvement efforts?', 'text', 3),
      (v_section_id, 'Recommended actions', 'Training, projects, or other development activities', 'text', 4);
      
      RETURN v_template_id;
    END;
    $function$ LANGUAGE plpgsql;

    -- Trigger for new companies
    CREATE OR REPLACE FUNCTION trigger_seed_review_template()
    RETURNS TRIGGER AS $function$
    BEGIN
      PERFORM seed_default_review_template(NEW.id);
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_new_company_review_template ON companies;
    CREATE TRIGGER trigger_new_company_review_template
      AFTER INSERT ON companies
      FOR EACH ROW
      EXECUTE FUNCTION trigger_seed_review_template();

    -- Seed existing
    FOR company_record IN SELECT id FROM companies LOOP
      PERFORM seed_default_review_template(company_record.id);
    END LOOP;

    RAISE NOTICE 'Created review system tables and seeded default template';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping review system table creation';
  END IF;
END $$;

