-- ⚠️ RUN THIS FIRST! (Step 1 of 2)
-- Apply Email Confirmation System
-- Run this in Supabase SQL Editor BEFORE running GENERATE_CONFIRMATION_TOKENS.sql

-- Add confirmation token to applications
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS confirmation_token UUID DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_applications_confirmation_token 
ON public.applications(confirmation_token) 
WHERE confirmation_token IS NOT NULL;

-- Create confirmation responses table
CREATE TABLE IF NOT EXISTS public.application_confirmation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  
  -- What they're responding to
  response_type TEXT NOT NULL CHECK (response_type IN ('interview', 'trial', 'offer')),
  
  -- Their response
  action TEXT NOT NULL CHECK (action IN ('confirm', 'decline', 'reschedule')),
  
  -- If rescheduling
  requested_date DATE,
  requested_time TIME,
  reschedule_reason TEXT,
  
  -- If declining
  decline_reason TEXT,
  
  -- If offer response
  requested_start_date DATE,
  
  -- Additional notes from candidate
  candidate_notes TEXT,
  
  -- Metadata
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  
  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.application_confirmation_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "anyone_can_submit_confirmations" ON public.application_confirmation_responses;
DROP POLICY IF EXISTS "company_members_can_view_confirmations" ON public.application_confirmation_responses;
DROP POLICY IF EXISTS "managers_can_update_confirmations" ON public.application_confirmation_responses;

-- Allow anonymous inserts (public confirmation page)
CREATE POLICY "anyone_can_submit_confirmations"
ON public.application_confirmation_responses FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Company members can view their confirmations
CREATE POLICY "company_members_can_view_confirmations"
ON public.application_confirmation_responses FOR SELECT
USING (
  candidate_id IN (
    SELECT c.id FROM public.candidates c
    WHERE c.company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Managers can update (mark as processed)
CREATE POLICY "managers_can_update_confirmations"
ON public.application_confirmation_responses FOR UPDATE
USING (
  candidate_id IN (
    SELECT c.id FROM public.candidates c
    WHERE c.company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND app_role IN ('Admin', 'Owner', 'Manager', 'Area Manager', 'Ops Manager')
    )
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_confirmation_responses_application 
ON public.application_confirmation_responses(application_id);

CREATE INDEX IF NOT EXISTS idx_confirmation_responses_candidate 
ON public.application_confirmation_responses(candidate_id);

CREATE INDEX IF NOT EXISTS idx_confirmation_responses_unprocessed 
ON public.application_confirmation_responses(processed) 
WHERE processed = FALSE;
