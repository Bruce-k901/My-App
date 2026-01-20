-- =====================================================
-- COMPREHENSIVE REVIEW & APPRAISAL SYSTEM
-- Based on Teamly Reviews Specification v1.0
-- =====================================================

-- =====================================================
-- 1. COMPANY VALUES & BEHAVIORS
-- =====================================================

-- Company values (e.g., "Welcome Everyone", "Put on a Great Show")
CREATE TABLE IF NOT EXISTS company_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Value sub-categories (e.g., "Include", "Develop" under "Welcome Everyone")
CREATE TABLE IF NOT EXISTS company_value_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    value_id UUID NOT NULL REFERENCES company_values(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specific behaviours under each category with tier descriptions
CREATE TABLE IF NOT EXISTS company_value_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES company_value_categories(id) ON DELETE CASCADE,
    behavior_number INTEGER NOT NULL,
    
    -- The three tiers of behavior description
    tier_1_label VARCHAR(50) DEFAULT 'Not Meeting',
    tier_1_description TEXT NOT NULL,
    
    tier_2_label VARCHAR(50) DEFAULT 'Meeting',
    tier_2_description TEXT NOT NULL,
    
    tier_3_label VARCHAR(50) DEFAULT 'Exceeding',
    tier_3_description TEXT NOT NULL,
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. SCORING SCALES
-- =====================================================

-- Company scoring scales (flexible - numeric or tier-based)
CREATE TABLE IF NOT EXISTS scoring_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    scale_type VARCHAR(20) NOT NULL CHECK (scale_type IN ('numeric', 'tier')),
    min_value INTEGER,
    max_value INTEGER,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options for tier-based scales
CREATE TABLE IF NOT EXISTS scoring_scale_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scale_id UUID NOT NULL REFERENCES scoring_scales(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL,
    value INTEGER NOT NULL,
    description TEXT,
    color VARCHAR(7),
    display_order INTEGER DEFAULT 0
);

-- =====================================================
-- 3. REVIEW TEMPLATES
-- =====================================================

-- Template types enum (using CHECK constraint instead of ENUM for flexibility)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_template_type') THEN
    CREATE TYPE review_template_type AS ENUM (
    'onboarding_check_in',
    'probation_review',
    'one_to_one',
    'monthly_review',
    'quarterly_review',
    'annual_appraisal',
    'values_review',
    'mid_year_review',
    'performance_improvement',
    'promotion_review',
    'exit_interview',
    'return_to_work',
    'custom'
    );
  END IF;
END $$;

-- Question types enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM (
    'text_short',
    'text_long',
    'rating_scale',
    'rating_numeric',
    'single_choice',
    'multiple_choice',
    'yes_no',
    'date',
    'goal_tracker',
    'value_behavior',
    'file_upload',
    'signature'
    );
  END IF;
END $$;

-- Master review templates
CREATE TABLE IF NOT EXISTS review_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = system template
    
    name VARCHAR(200) NOT NULL,
    template_type review_template_type NOT NULL,
    description TEXT,
    
    -- Guidance for users
    instructions TEXT,
    rationale TEXT,
    expected_outcomes TEXT,
    recommended_duration_minutes INTEGER,
    recommended_frequency_days INTEGER,
    
    -- Configuration
    requires_self_assessment BOOLEAN DEFAULT true,
    requires_manager_assessment BOOLEAN DEFAULT true,
    requires_peer_feedback BOOLEAN DEFAULT false,
    peer_feedback_count INTEGER DEFAULT 0,
    
    -- Scoring
    scoring_scale_id UUID REFERENCES scoring_scales(id),
    calculate_overall_score BOOLEAN DEFAULT false,
    
    -- Status
    is_system_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Template sections (logical groupings)
CREATE TABLE IF NOT EXISTS review_template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES review_templates(id) ON DELETE CASCADE,
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Who completes this section
    completed_by VARCHAR(20) DEFAULT 'both' CHECK (completed_by IN ('employee', 'manager', 'both')),
    
    -- For values-based sections
    linked_value_id UUID REFERENCES company_values(id),
    
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual questions within sections
CREATE TABLE IF NOT EXISTS review_template_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES review_template_sections(id) ON DELETE CASCADE,
    
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    helper_text TEXT,
    placeholder_text VARCHAR(500),
    
    -- For rating questions
    scoring_scale_id UUID REFERENCES scoring_scales(id),
    min_label VARCHAR(50),
    max_label VARCHAR(50),
    
    -- For choice questions
    options JSONB,
    
    -- For value_behavior type
    linked_behavior_id UUID REFERENCES company_value_behaviors(id),
    
    -- Validation
    is_required BOOLEAN DEFAULT false,
    min_length INTEGER,
    max_length INTEGER,
    min_selections INTEGER,
    max_selections INTEGER,
    
    -- Scoring weight (if template calculates overall score)
    weight DECIMAL(3,2) DEFAULT 1.0,
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. REVIEW SCHEDULES & INSTANCES
-- =====================================================

-- Schedule status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status') THEN
    CREATE TYPE schedule_status AS ENUM (
    'scheduled',
    'invitation_sent',
    'in_progress',
    'pending_manager',
    'pending_employee',
    'pending_meeting',
    'completed',
    'cancelled',
    'overdue'
    );
  END IF;
END $$;

-- Review schedules (the plan for an employee)
CREATE TABLE IF NOT EXISTS employee_review_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES review_templates(id),
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    due_date DATE,
    
    -- Recurrence (for 1-2-1s, monthly reviews etc.)
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually')),
    recurrence_day INTEGER,
    next_occurrence_date DATE,
    
    -- Participants
    manager_id UUID REFERENCES profiles(id),
    additional_reviewers UUID[],
    
    status schedule_status DEFAULT 'scheduled',
    
    -- Notifications
    employee_notified_at TIMESTAMPTZ,
    manager_notified_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Actual review instances
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES employee_review_schedules(id),
    template_id UUID NOT NULL REFERENCES review_templates(id),
    employee_id UUID NOT NULL REFERENCES profiles(id),
    
    -- Review period
    review_period_start DATE,
    review_period_end DATE,
    
    -- Participants
    manager_id UUID REFERENCES profiles(id),
    conducted_by UUID REFERENCES profiles(id),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'employee_complete', 'manager_complete', 'in_meeting', 'completed', 'signed_off')),
    
    -- Completion timestamps
    employee_started_at TIMESTAMPTZ,
    employee_completed_at TIMESTAMPTZ,
    manager_started_at TIMESTAMPTZ,
    manager_completed_at TIMESTAMPTZ,
    meeting_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    signed_off_at TIMESTAMPTZ,
    
    -- Scores (if template calculates them)
    self_assessment_score DECIMAL(5,2),
    manager_assessment_score DECIMAL(5,2),
    overall_score DECIMAL(5,2),
    
    -- Sign-off
    employee_signature TEXT,
    employee_signed_at TIMESTAMPTZ,
    manager_signature TEXT,
    manager_signed_at TIMESTAMPTZ,
    
    -- Metadata
    template_version INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual responses to questions
CREATE TABLE IF NOT EXISTS review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES review_template_questions(id),
    
    -- Who provided this response
    respondent_type VARCHAR(20) NOT NULL CHECK (respondent_type IN ('employee', 'manager', 'peer')),
    respondent_id UUID REFERENCES profiles(id),
    
    -- The actual response (flexible storage)
    response_text TEXT,
    response_number DECIMAL(5,2),
    response_json JSONB,
    response_date DATE,
    
    -- For value behavior ratings
    behavior_tier_selected INTEGER CHECK (behavior_tier_selected IN (1, 2, 3)),
    behavior_example TEXT,
    
    -- Metadata
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(review_id, question_id, respondent_type, respondent_id)
);

-- =====================================================
-- 5. SUPPORTING FEATURES
-- =====================================================

-- Review invitations
CREATE TABLE IF NOT EXISTS review_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    
    recipient_id UUID NOT NULL REFERENCES profiles(id),
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('employee', 'manager', 'peer')),
    
    -- Invitation details
    sent_at TIMESTAMPTZ,
    sent_via VARCHAR(20) CHECK (sent_via IN ('email', 'push', 'sms')),
    message TEXT,
    
    -- Response tracking
    opened_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    
    -- Reminders
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    
    -- Token for secure access
    access_token VARCHAR(100) UNIQUE,
    token_expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar appointments for review meetings
CREATE TABLE IF NOT EXISTS review_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    location VARCHAR(500),
    
    -- Attendees
    organizer_id UUID REFERENCES profiles(id),
    attendee_ids UUID[],
    
    -- External calendar sync
    external_calendar_id VARCHAR(500),
    external_calendar_type VARCHAR(20) CHECK (external_calendar_type IN ('google', 'outlook', 'ical')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Actual meeting
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes attached to reviews
CREATE TABLE IF NOT EXISTS review_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    
    author_id UUID NOT NULL REFERENCES profiles(id),
    note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('general', 'private', 'hr_only', 'follow_up')),
    
    content TEXT NOT NULL,
    
    -- Visibility
    visible_to_employee BOOLEAN DEFAULT false,
    visible_to_manager BOOLEAN DEFAULT true,
    visible_to_hr BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-up actions from reviews
CREATE TABLE IF NOT EXISTS review_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    
    title VARCHAR(300) NOT NULL,
    description TEXT,
    
    -- Assignment
    assigned_to UUID REFERENCES profiles(id),
    assigned_by UUID REFERENCES profiles(id),
    
    -- Timing
    due_date DATE,
    reminder_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    
    -- Categorisation
    follow_up_type VARCHAR(30) CHECK (follow_up_type IN ('training', 'goal', 'meeting', 'document', 'other')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Link to other entities
    linked_goal_id UUID,
    linked_training_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee file summary (aggregated view of tenure)
CREATE TABLE IF NOT EXISTS employee_review_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Counts
    total_reviews_completed INTEGER DEFAULT 0,
    total_one_to_ones INTEGER DEFAULT 0,
    total_appraisals INTEGER DEFAULT 0,
    
    -- Latest scores
    latest_overall_score DECIMAL(5,2),
    latest_self_score DECIMAL(5,2),
    latest_manager_score DECIMAL(5,2),
    
    -- Trends
    score_trend VARCHAR(10) CHECK (score_trend IN ('improving', 'stable', 'declining')),
    average_score_12_months DECIMAL(5,2),
    
    -- Key dates
    last_review_date DATE,
    next_scheduled_review DATE,
    last_values_review_date DATE,
    
    -- Flags
    has_overdue_reviews BOOLEAN DEFAULT false,
    has_pending_follow_ups BOOLEAN DEFAULT false,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, company_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_review_schedules_employee ON employee_review_schedules(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_review_schedules_date ON employee_review_schedules(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON reviews(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_manager ON reviews(manager_id, status);
CREATE INDEX IF NOT EXISTS idx_review_responses_review ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_invitations_recipient ON review_invitations(recipient_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_review_follow_ups_assigned ON review_follow_ups(assigned_to, status, due_date);
CREATE INDEX IF NOT EXISTS idx_company_values_company ON company_values(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_review_templates_company ON review_templates(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_scoring_scales_company ON scoring_scales(company_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Company Values
ALTER TABLE company_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_company_values" ON company_values;
CREATE POLICY "view_company_values" ON company_values FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "manage_company_values" ON company_values;
CREATE POLICY "manage_company_values" ON company_values FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
        )
    );

-- Scoring Scales
ALTER TABLE scoring_scales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_scoring_scales" ON scoring_scales;
CREATE POLICY "view_scoring_scales" ON scoring_scales FOR SELECT
    USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "manage_scoring_scales" ON scoring_scales;
CREATE POLICY "manage_scoring_scales" ON scoring_scales FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
        )
    );

-- Review Templates
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_review_templates" ON review_templates;
CREATE POLICY "view_review_templates" ON review_templates FOR SELECT
    USING (
        company_id IS NULL OR 
        company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
    );

DROP POLICY IF EXISTS "manage_review_templates" ON review_templates;
CREATE POLICY "manage_review_templates" ON review_templates FOR ALL
    USING (
        company_id IS NULL OR
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
        )
    );

-- Review Schedules
ALTER TABLE employee_review_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_review_schedules" ON employee_review_schedules;
CREATE POLICY "view_review_schedules" ON employee_review_schedules FOR SELECT
    USING (
        employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
        )
    );

DROP POLICY IF EXISTS "manage_review_schedules" ON employee_review_schedules;
CREATE POLICY "manage_review_schedules" ON employee_review_schedules FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
        )
    );

-- Reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_reviews" ON reviews;
CREATE POLICY "view_reviews" ON reviews FOR SELECT
    USING (
        employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
        )
    );

DROP POLICY IF EXISTS "manage_reviews" ON reviews;
CREATE POLICY "manage_reviews" ON reviews FOR ALL
    USING (
        employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
        )
    );

-- Review Responses
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_review_responses" ON review_responses;
CREATE POLICY "view_review_responses" ON review_responses FOR SELECT
    USING (
        review_id IN (
            SELECT id FROM reviews 
            WHERE employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
            OR manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "manage_review_responses" ON review_responses;
CREATE POLICY "manage_review_responses" ON review_responses FOR ALL
    USING (
        review_id IN (
            SELECT id FROM reviews 
            WHERE employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
            OR manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
    );

-- Review Follow-ups
ALTER TABLE review_follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_review_follow_ups" ON review_follow_ups;
CREATE POLICY "view_review_follow_ups" ON review_follow_ups FOR SELECT
    USING (
        assigned_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR review_id IN (
            SELECT id FROM reviews 
            WHERE employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
            OR manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "manage_review_follow_ups" ON review_follow_ups;
CREATE POLICY "manage_review_follow_ups" ON review_follow_ups FOR ALL
    USING (
        assigned_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR review_id IN (
            SELECT id FROM reviews 
            WHERE manager_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
    );

-- Employee Review Summary
ALTER TABLE employee_review_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_employee_review_summary" ON employee_review_summary;
CREATE POLICY "view_employee_review_summary" ON employee_review_summary FOR SELECT
    USING (
        employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
        )
    );

