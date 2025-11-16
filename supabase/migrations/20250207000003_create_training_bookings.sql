-- ============================================================================
-- Migration: 20250207000003_create_training_bookings.sql
-- Description: Table + RLS policies for training session bookings
-- ============================================================================

CREATE TABLE public.training_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  course TEXT NOT NULL,
  level TEXT,
  provider TEXT,
  scheduled_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'booked',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_bookings_company ON public.training_bookings(company_id);
CREATE INDEX idx_training_bookings_user ON public.training_bookings(user_id);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_training_bookings_updated_at ON public.training_bookings;
CREATE TRIGGER trg_training_bookings_updated_at
  BEFORE UPDATE ON public.training_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.training_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_bookings_select ON public.training_bookings;
DROP POLICY IF EXISTS training_bookings_insert ON public.training_bookings;
DROP POLICY IF EXISTS training_bookings_update ON public.training_bookings;
DROP POLICY IF EXISTS training_bookings_delete ON public.training_bookings;

-- Policies: users can access bookings for members of their own company

CREATE POLICY training_bookings_select
  ON public.training_bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles target
      JOIN public.profiles actor ON actor.id = auth.uid()
      WHERE target.id = training_bookings.user_id
        AND actor.company_id IS NOT NULL
        AND actor.company_id = training_bookings.company_id
        AND target.company_id = training_bookings.company_id
    )
  );

CREATE POLICY training_bookings_insert
  ON public.training_bookings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles target
      JOIN public.profiles actor ON actor.id = auth.uid()
      WHERE target.id = training_bookings.user_id
        AND actor.company_id IS NOT NULL
        AND actor.company_id = training_bookings.company_id
        AND target.company_id = training_bookings.company_id
    )
  );

CREATE POLICY training_bookings_update
  ON public.training_bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles target
      JOIN public.profiles actor ON actor.id = auth.uid()
      WHERE target.id = training_bookings.user_id
        AND actor.company_id IS NOT NULL
        AND actor.company_id = training_bookings.company_id
        AND target.company_id = training_bookings.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles target
      JOIN public.profiles actor ON actor.id = auth.uid()
      WHERE target.id = training_bookings.user_id
        AND actor.company_id IS NOT NULL
        AND actor.company_id = training_bookings.company_id
        AND target.company_id = training_bookings.company_id
    )
  );

CREATE POLICY training_bookings_delete
  ON public.training_bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles target
      JOIN public.profiles actor ON actor.id = auth.uid()
      WHERE target.id = training_bookings.user_id
        AND actor.company_id IS NOT NULL
        AND actor.company_id = training_bookings.company_id
        AND target.company_id = training_bookings.company_id
    )
  );









