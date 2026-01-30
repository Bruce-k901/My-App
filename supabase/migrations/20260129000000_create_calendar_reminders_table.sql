-- Create calendar_reminders table for tracking service bookings and follow-up reminders
CREATE TABLE IF NOT EXISTS public.calendar_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    callout_id UUID REFERENCES public.callouts(id) ON DELETE SET NULL,
    reminder_date DATE NOT NULL,
    reminder_type TEXT NOT NULL DEFAULT 'service_booked',
    title TEXT NOT NULL,
    description TEXT,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_company_id ON public.calendar_reminders(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_site_id ON public.calendar_reminders(site_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_asset_id ON public.calendar_reminders(asset_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_reminder_date ON public.calendar_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_dismissed ON public.calendar_reminders(dismissed);

-- Enable RLS
ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view reminders for their company
CREATE POLICY "Users can view reminders for their company"
    ON public.calendar_reminders
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- RLS Policy: Users can create reminders for their company
CREATE POLICY "Users can create reminders for their company"
    ON public.calendar_reminders
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- RLS Policy: Users can update reminders for their company
CREATE POLICY "Users can update reminders for their company"
    ON public.calendar_reminders
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- RLS Policy: Users can delete reminders for their company
CREATE POLICY "Users can delete reminders for their company"
    ON public.calendar_reminders
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_calendar_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calendar_reminders_updated_at
    BEFORE UPDATE ON public.calendar_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_reminders_updated_at();

-- Add service_booked to ppm_status check constraint (if it doesn't already include it)
-- First check and drop existing constraint if needed, then recreate
DO $$
BEGIN
    -- Try to add service_booked to the constraint
    -- This will fail silently if the constraint doesn't exist or already includes service_booked
    BEGIN
        ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_ppm_status_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;

    -- Recreate with all statuses including service_booked
    BEGIN
        ALTER TABLE public.assets
        ADD CONSTRAINT assets_ppm_status_check
        CHECK (ppm_status IS NULL OR ppm_status IN ('up_to_date', 'due_soon', 'overdue', 'service_booked', 'not_applicable'));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END;
$$;

COMMENT ON TABLE public.calendar_reminders IS 'Stores calendar reminders for service bookings and follow-up tasks';
