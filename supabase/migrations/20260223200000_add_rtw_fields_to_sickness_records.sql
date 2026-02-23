-- Add Return to Work interview fields to staff_sickness_records
-- Completes the sickness flow: Log Sickness → Active → RTW Interview → Cleared/Closed

ALTER TABLE public.staff_sickness_records
  ADD COLUMN IF NOT EXISTS rtw_conducted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rtw_conducted_date DATE,
  ADD COLUMN IF NOT EXISTS rtw_fit_for_full_duties BOOLEAN,
  ADD COLUMN IF NOT EXISTS rtw_gp_consulted BOOLEAN,
  ADD COLUMN IF NOT EXISTS rtw_fit_note_provided BOOLEAN,
  ADD COLUMN IF NOT EXISTS rtw_adjustments_needed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rtw_adjustments_details TEXT,
  ADD COLUMN IF NOT EXISTS rtw_follow_up_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rtw_follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS rtw_notes TEXT;
