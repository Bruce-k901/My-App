-- Apply trial payment terms and rota integration
-- Run this in Supabase SQL Editor

-- Add payment terms columns
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS trial_payment_terms TEXT 
  CHECK (trial_payment_terms IN ('unpaid', 'paid', 'paid_if_hired')),
ADD COLUMN IF NOT EXISTS trial_payment_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS trial_payment_notes TEXT;

-- Add rota shift reference
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS trial_rota_shift_id UUID REFERENCES public.rota_shifts(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN public.applications.trial_payment_terms IS 
'Payment agreement for trial: unpaid (no payment), paid (paid for trial hours), paid_if_hired (paid only if they are hired)';

COMMENT ON COLUMN public.applications.trial_payment_rate IS 
'Hourly rate for trial shift if paid (in currency of company)';

COMMENT ON COLUMN public.applications.trial_rota_shift_id IS 
'Reference to rota shift created for this trial (helps managers see trial on schedule)';
