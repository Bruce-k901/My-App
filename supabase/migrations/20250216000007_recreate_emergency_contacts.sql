-- ============================================================================
-- Migration: Recreate Emergency Contacts Table
-- Description: Drops and recreates emergency_contacts table with correct schema
--              for company-wide emergency contacts (first aiders, 999, managers, utilities)
-- ============================================================================

BEGIN;

-- Drop existing table and policies
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;

-- Create emergency_contacts table with correct schema
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL, -- Optional, for site-specific contacts
  
  -- Contact Information
  contact_type TEXT NOT NULL CHECK (contact_type IN ('first_aider', 'manager', 'emergency_services', 'utility', 'other')),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  role_title TEXT, -- e.g., "First Aider", "Site Manager"
  notes TEXT,
  
  -- Display Settings
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  language TEXT NOT NULL DEFAULT 'en', -- For multi-language support
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_emergency_contacts_company_id ON public.emergency_contacts(company_id);
CREATE INDEX idx_emergency_contacts_site_id ON public.emergency_contacts(site_id);
CREATE INDEX idx_emergency_contacts_active ON public.emergency_contacts(company_id, is_active) WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT: Users can see emergency contacts for their company
CREATE POLICY emergency_contacts_select ON public.emergency_contacts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- INSERT: Only Owners, Admins, and Managers can create contacts
CREATE POLICY emergency_contacts_insert ON public.emergency_contacts
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

-- UPDATE: Only Owners, Admins, and Managers can update contacts
CREATE POLICY emergency_contacts_update ON public.emergency_contacts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

-- DELETE: Only Owners, Admins, and Managers can delete contacts
CREATE POLICY emergency_contacts_delete ON public.emergency_contacts
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
        AND app_role IN ('Owner', 'Admin', 'Manager')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_emergency_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER emergency_contacts_updated_at
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_contacts_updated_at();

COMMIT;

