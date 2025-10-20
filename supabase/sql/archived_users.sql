-- Archived users table for storing archived user profiles
CREATE TABLE IF NOT EXISTS public.archived_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id uuid NOT NULL, -- The original profile ID
  auth_user_id uuid, -- Reference to auth.users if needed
  email text,
  full_name text,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites_redundant(id) ON DELETE SET NULL,
  home_site_id uuid REFERENCES public.sites_redundant(id) ON DELETE SET NULL,
  role text,
  position_title text,
  position text, -- Additional position field
  boh_foh text,
  last_login timestamptz,
  pin_code text,
  phone_number text,
  app_role text, -- Application role field
  answers_count integer, -- Count of answers (nullable for analytics)
  questions_count integer, -- Count of questions (nullable for analytics)
  points integer, -- User points (nullable for analytics)
  updated_at timestamptz, -- Last update timestamp
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid REFERENCES auth.users(id),
  archived_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_archived_users_company_id ON public.archived_users (company_id);
CREATE INDEX IF NOT EXISTS idx_archived_users_original_id ON public.archived_users (original_id);
CREATE INDEX IF NOT EXISTS idx_archived_users_archived_at ON public.archived_users (archived_at DESC);

-- Enable Row Level Security
ALTER TABLE public.archived_users ENABLE ROW LEVEL SECURITY;

-- Policy: Company members can view archived users in their company
CREATE POLICY archived_users_select_company
  ON public.archived_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = archived_users.company_id
    )
  );

-- Policy: Company admins/owners can insert archived users
CREATE POLICY archived_users_insert_company
  ON public.archived_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = archived_users.company_id
        AND p.role IN ('owner', 'admin')
    )
  );

-- Policy: Company admins/owners can delete archived users (for restore)
CREATE POLICY archived_users_delete_company
  ON public.archived_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = archived_users.company_id
        AND p.role IN ('owner', 'admin')
    )
  );