-- =====================================================
-- RECRUITMENT SYSTEM - Complete Schema
-- =====================================================
-- Creates: jobs, candidates, applications, offers, interviews
-- Enables: Full recruitment → onboarding flow

-- =====================================================
-- 1. JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Job Details
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  location TEXT, -- Site/venue name or "Multiple sites"
  site_id UUID REFERENCES public.sites(id), -- Home site if applicable
  
  -- Critical for Onboarding Flow
  boh_foh TEXT NOT NULL CHECK (boh_foh IN ('FOH', 'BOH', 'BOTH')),
  pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'salaried')),
  
  -- Pay Information
  pay_rate_min DECIMAL(10,2), -- Hourly or annual
  pay_rate_max DECIMAL(10,2),
  currency TEXT DEFAULT 'GBP',
  
  -- Contract Details
  contract_type TEXT CHECK (contract_type IN ('permanent', 'fixed_term', 'zero_hours', 'casual')),
  contract_hours DECIMAL(5,2), -- Hours per week
  
  -- Requirements
  required_skills TEXT[], -- Array of skills
  required_certifications TEXT[], -- e.g., ["Food Hygiene Level 2", "First Aid"]
  experience_required TEXT, -- e.g., "1-2 years", "No experience needed"
  
  -- Status & Visibility
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paused', 'closed')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  
  -- Job Board Integration (future)
  external_job_boards TEXT[], -- e.g., ["Indeed", "LinkedIn"]
  external_urls JSONB, -- { "indeed": "https://...", "linkedin": "https://..." }
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_jobs_company ON public.jobs(company_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_boh_foh ON public.jobs(boh_foh);
CREATE INDEX idx_jobs_published ON public.jobs(is_published, published_at);

-- RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Company members can view their company's jobs
CREATE POLICY "company_members_can_view_jobs"
ON public.jobs FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Managers can manage jobs
CREATE POLICY "managers_can_manage_jobs"
ON public.jobs FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE id = auth.uid() 
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- Public can view published jobs (for applications)
-- NOTE: This policy allows anonymous (non-authenticated) users to view open jobs
CREATE POLICY "public_can_view_published_jobs"
ON public.jobs FOR SELECT
TO anon, authenticated
USING (is_published = true AND status = 'open');

-- =====================================================
-- 2. CANDIDATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Personal Info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  postcode TEXT,
  
  -- Application Source
  source TEXT, -- e.g., "Indeed", "LinkedIn", "Referral", "Walk-in"
  referred_by UUID REFERENCES public.profiles(id),
  
  -- CV & Documents
  cv_file_path TEXT, -- Path in Supabase Storage
  cover_letter TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  
  -- Overall Status (across all applications)
  overall_status TEXT DEFAULT 'active' CHECK (overall_status IN ('active', 'hired', 'rejected', 'withdrawn')),
  
  -- Tags & Notes
  tags TEXT[], -- e.g., ["experienced", "bilingual", "available_immediately"]
  internal_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique email per company
  UNIQUE(company_id, email)
);

-- Indexes
CREATE INDEX idx_candidates_company ON public.candidates(company_id);
CREATE INDEX idx_candidates_email ON public.candidates(email);
CREATE INDEX idx_candidates_status ON public.candidates(overall_status);

-- RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Company members can view candidates
CREATE POLICY "company_members_can_view_candidates"
ON public.candidates FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Managers can manage candidates
CREATE POLICY "managers_can_manage_candidates"
ON public.candidates FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE id = auth.uid() 
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- =====================================================
-- 3. APPLICATIONS TABLE (links candidates to jobs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Application Status Pipeline
  status TEXT DEFAULT 'applied' CHECK (status IN (
    'applied',           -- Initial application
    'screening',         -- Under review
    'interview',         -- Interview scheduled
    'trial',             -- Trial shift arranged
    'offer',             -- Offer sent
    'accepted',          -- Offer accepted → Move to onboarding
    'rejected',          -- Application rejected
    'withdrawn'          -- Candidate withdrew
  )),
  
  -- Status History (JSONB for audit trail)
  status_history JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"status": "applied", "changed_at": "2024-01-01T10:00:00Z", "changed_by": "uuid"}]
  
  -- Application Details
  application_message TEXT, -- Cover letter / application message
  availability TEXT, -- When can they start
  preferred_hours TEXT, -- Full-time, part-time, weekends only, etc.
  salary_expectation DECIMAL(10,2),
  
  -- Interview & Trial
  interview_scheduled_at TIMESTAMPTZ,
  interview_completed_at TIMESTAMPTZ,
  interview_notes TEXT,
  interview_rating INTEGER CHECK (interview_rating >= 1 AND interview_rating <= 5),
  
  trial_scheduled_at TIMESTAMPTZ,
  trial_completed_at TIMESTAMPTZ,
  trial_notes TEXT,
  trial_rating INTEGER CHECK (trial_rating >= 1 AND trial_rating <= 5),
  
  -- Decision
  rejection_reason TEXT,
  rejection_notes TEXT,
  
  -- Metadata
  applied_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  
  -- One application per candidate per job
  UNIQUE(job_id, candidate_id)
);

-- Indexes
CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX idx_applications_company ON public.applications(company_id);
CREATE INDEX idx_applications_status ON public.applications(status);

-- RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Company members can view applications
CREATE POLICY "company_members_can_view_applications"
ON public.applications FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Managers can manage applications
CREATE POLICY "managers_can_manage_applications"
ON public.applications FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE id = auth.uid() 
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- =====================================================
-- 4. OFFER LETTERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.offer_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Offer Details
  position_title TEXT NOT NULL,
  start_date DATE NOT NULL,
  pay_rate DECIMAL(10,2) NOT NULL,
  pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('hourly', 'annual')),
  contract_hours DECIMAL(5,2), -- Hours per week
  contract_type TEXT CHECK (contract_type IN ('permanent', 'fixed_term', 'zero_hours', 'casual')),
  site_id UUID REFERENCES public.sites(id), -- Home site
  
  -- From job for onboarding
  boh_foh TEXT NOT NULL CHECK (boh_foh IN ('FOH', 'BOH', 'BOTH')),
  pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'salaried')),
  
  -- Offer Letter Content
  offer_letter_template TEXT, -- Template name or ID
  offer_letter_content TEXT, -- Generated offer letter (HTML or Markdown)
  custom_terms TEXT, -- Any additional terms
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  
  -- Signature & Acceptance
  offer_token TEXT UNIQUE, -- Unique token for candidate to accept
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  candidate_signature TEXT, -- E-signature (typed name or image data)
  candidate_signature_date TIMESTAMPTZ,
  
  decline_reason TEXT,
  
  -- Link to Onboarding (set when accepted)
  onboarding_profile_id UUID REFERENCES public.profiles(id), -- Profile created on acceptance
  onboarding_assignment_id UUID, -- Will reference employee_onboarding_assignments
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_offer_letters_application ON public.offer_letters(application_id);
CREATE INDEX idx_offer_letters_candidate ON public.offer_letters(candidate_id);
CREATE INDEX idx_offer_letters_company ON public.offer_letters(company_id);
CREATE INDEX idx_offer_letters_token ON public.offer_letters(offer_token);
CREATE INDEX idx_offer_letters_status ON public.offer_letters(status);

-- RLS
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;

-- Company members can view offer letters
CREATE POLICY "company_members_can_view_offers"
ON public.offer_letters FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Managers can manage offers
CREATE POLICY "managers_can_manage_offers"
ON public.offer_letters FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles 
    WHERE id = auth.uid() 
    AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
  )
);

-- Candidates can view/update their offers via token (for acceptance)
CREATE POLICY "candidates_can_access_via_token"
ON public.offer_letters FOR SELECT
USING (
  offer_token = current_setting('request.headers', true)::json->>'offer-token'
  AND status IN ('sent', 'viewed')
  AND expires_at > now()
);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to update application status with history
CREATE OR REPLACE FUNCTION update_application_status(
  p_application_id UUID,
  p_new_status TEXT,
  p_changed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_status TEXT;
  v_status_history JSONB;
BEGIN
  -- Get current status and history
  SELECT status, status_history INTO v_current_status, v_status_history
  FROM public.applications
  WHERE id = p_application_id;
  
  -- Don't update if status is the same
  IF v_current_status = p_new_status THEN
    RETURN;
  END IF;
  
  -- Append to history
  v_status_history := v_status_history || jsonb_build_object(
    'status', p_new_status,
    'from_status', v_current_status,
    'changed_at', now(),
    'changed_by', p_changed_by,
    'notes', p_notes
  );
  
  -- Update application
  UPDATE public.applications
  SET 
    status = p_new_status,
    status_history = v_status_history,
    updated_at = now(),
    updated_by = p_changed_by
  WHERE id = p_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate offer token
CREATE OR REPLACE FUNCTION generate_offer_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. UPDATED TIMESTAMP TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER offer_letters_updated_at
  BEFORE UPDATE ON public.offer_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.jobs TO authenticated;
GRANT ALL ON public.candidates TO authenticated;
GRANT ALL ON public.applications TO authenticated;
GRANT ALL ON public.offer_letters TO authenticated;

-- Allow anon to view published jobs (for public job board)
GRANT SELECT ON public.jobs TO anon;

-- =====================================================
-- DONE! 🎉
-- =====================================================
-- Next: Build the UI pages for recruitment
