-- =============================================
-- TEAMLY SETTINGS SYSTEM
-- Database-driven configuration for shift rules and notifications
-- =============================================

-- This migration only runs if required tables exist
DO $$
BEGIN
  -- Check if required tables exist - exit early if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'companies or profiles tables do not exist - skipping teamly_settings migration';
    RETURN;
  END IF;

  -- =============================================
  -- 1. SHIFT RULES TABLE
  -- =============================================
  EXECUTE $sql_table1$
    CREATE TABLE IF NOT EXISTS public.teamly_shift_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Working Time Directive - UK Defaults
  min_rest_between_shifts INTEGER NOT NULL DEFAULT 11, -- hours
  weekly_rest_type TEXT NOT NULL DEFAULT '24_per_week' CHECK (weekly_rest_type IN ('24_per_week', '48_per_fortnight')),
  min_weekly_rest_hours INTEGER NOT NULL DEFAULT 24,
  max_weekly_hours INTEGER NOT NULL DEFAULT 48,
  weekly_hours_reference_weeks INTEGER NOT NULL DEFAULT 17, -- averaging period
  
  -- Break Rules
  break_threshold_minutes INTEGER NOT NULL DEFAULT 360, -- 6 hours
  break_duration_minutes INTEGER NOT NULL DEFAULT 20,
  paid_breaks BOOLEAN NOT NULL DEFAULT false,
  
  -- Night Worker Rules
  night_shift_start TIME NOT NULL DEFAULT '23:00',
  night_shift_end TIME NOT NULL DEFAULT '06:00',
  max_night_shift_hours INTEGER NOT NULL DEFAULT 8,
  
  -- Overtime
  overtime_threshold_daily INTEGER, -- NULL = no daily overtime
  overtime_threshold_weekly INTEGER DEFAULT 40, -- hours before overtime kicks in
  
  -- Opt-outs (must be recorded)
  allow_wtd_opt_out BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  
      UNIQUE(company_id)
    );
  $sql_table1$;

  -- Index for fast lookups
  CREATE INDEX IF NOT EXISTS idx_shift_rules_company ON public.teamly_shift_rules(company_id);

  -- RLS Policy
  ALTER TABLE public.teamly_shift_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company shift rules" ON public.teamly_shift_rules;
CREATE POLICY "Users can view their company shift rules"
  ON public.teamly_shift_rules FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update their company shift rules" ON public.teamly_shift_rules;
CREATE POLICY "Admins can update their company shift rules"
  ON public.teamly_shift_rules FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

  -- =============================================
  -- 2. NOTIFICATION TYPES (Reference/Lookup)
  -- =============================================
  EXECUTE $sql_table2$
    CREATE TABLE IF NOT EXISTS public.teamly_notification_types (
  id TEXT PRIMARY KEY, -- e.g., 'shift_reminder'
  category TEXT NOT NULL, -- 'shifts', 'approvals', 'deadlines', 'compliance'
  name TEXT NOT NULL,
  description TEXT,
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  default_channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "push": false}'::jsonb,
  default_timing JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_recipients JSONB NOT NULL DEFAULT '[]'::jsonb, -- role names
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  $sql_table2$;

  -- Seed data
  INSERT INTO public.teamly_notification_types (id, category, name, description, default_enabled, default_timing, default_recipients, sort_order) VALUES
  -- Shifts
  ('shift_reminder', 'shifts', 'Shift Reminder', 'Remind staff before their shift starts', true, '{"hours_before": 24}'::jsonb, '["staff"]'::jsonb, 1),
  ('shift_change', 'shifts', 'Shift Changed', 'Notify when a shift is modified', true, '{}'::jsonb, '["staff"]'::jsonb, 2),
  ('rota_published', 'shifts', 'Rota Published', 'Notify when new rota is published', true, '{}'::jsonb, '["staff"]'::jsonb, 3),
  ('shift_swap_request', 'shifts', 'Shift Swap Request', 'Notify manager of swap requests', true, '{}'::jsonb, '["manager"]'::jsonb, 4),
  
  -- Approvals
  ('timesheet_pending', 'approvals', 'Timesheet Needs Approval', 'Notify manager of pending timesheets', true, '{}'::jsonb, '["manager"]'::jsonb, 10),
  ('rota_pending', 'approvals', 'Rota Needs Approval', 'Notify area manager of pending rota', true, '{}'::jsonb, '["area_manager", "regional_manager", "owner"]'::jsonb, 11),
  ('leave_request_pending', 'approvals', 'Leave Request Pending', 'Notify manager of leave requests', true, '{}'::jsonb, '["manager"]'::jsonb, 12),
  ('request_approved', 'approvals', 'Request Approved', 'Notify staff when request approved', true, '{}'::jsonb, '["staff"]'::jsonb, 13),
  ('request_declined', 'approvals', 'Request Declined', 'Notify staff when request declined', true, '{}'::jsonb, '["staff"]'::jsonb, 14),
  
  -- Deadlines
  ('rota_prepare_reminder', 'deadlines', 'Prepare Rota Reminder', 'Remind manager to prepare upcoming rota', true, '{"days_before": 7}'::jsonb, '["manager"]'::jsonb, 20),
  ('timesheet_submit_reminder', 'deadlines', 'Submit Timesheet Reminder', 'Remind staff to submit timesheet', true, '{"days_before": 2}'::jsonb, '["staff"]'::jsonb, 21),
  ('timesheet_approve_reminder', 'deadlines', 'Approve Timesheets Reminder', 'Remind manager to approve timesheets', true, '{"days_before": 3}'::jsonb, '["manager"]'::jsonb, 22),
  
  -- Compliance
  ('hours_threshold_warning', 'compliance', 'Hours Threshold Warning', 'Warn when approaching max hours', true, '{"threshold_hours": 44}'::jsonb, '["manager", "staff"]'::jsonb, 30),
  ('rest_violation_warning', 'compliance', 'Rest Period Warning', 'Warn of potential rest period violation', true, '{}'::jsonb, '["manager"]'::jsonb, 31)
ON CONFLICT (id) DO NOTHING;

-- RLS for notification types (public read-only reference table)
ALTER TABLE public.teamly_notification_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view notification types" ON public.teamly_notification_types;
CREATE POLICY "Anyone authenticated can view notification types"
  ON public.teamly_notification_types FOR SELECT
  USING (auth.role() = 'authenticated');

  -- =============================================
  -- 3. NOTIFICATION SETTINGS
  -- =============================================
  EXECUTE $sql_table3$
    CREATE TABLE IF NOT EXISTS public.teamly_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- This is a JSONB approach for flexibility
  -- Allows adding new notification types without schema changes
  notification_type TEXT NOT NULL REFERENCES public.teamly_notification_types(id),
  
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Delivery channels (expandable)
  channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "push": false}'::jsonb,
  
  -- Timing configuration
  timing_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Examples:
  -- shift_reminder: {"hours_before": 24}
  -- timesheet_due: {"days_before_deadline": 2}
  -- rota_prepare: {"days_before_period_start": 7}
  
  -- Who receives (role-based)
  recipient_roles JSONB NOT NULL DEFAULT '[]'::jsonb, -- empty = use default for type
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
      UNIQUE(company_id, notification_type)
    );
  $sql_table3$;

  -- Index
  CREATE INDEX IF NOT EXISTS idx_notification_settings_company ON public.teamly_notification_settings(company_id);
  CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON public.teamly_notification_settings(notification_type);

-- RLS
ALTER TABLE public.teamly_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company notification settings" ON public.teamly_notification_settings;
CREATE POLICY "Users can view their company notification settings"
  ON public.teamly_notification_settings FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage their company notification settings" ON public.teamly_notification_settings;
CREATE POLICY "Admins can manage their company notification settings"
  ON public.teamly_notification_settings FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

  -- =============================================
  -- 4. WTD OPT-OUTS (Track opt-outs legally)
  -- =============================================
  EXECUTE $sql_table4$
    CREATE TABLE IF NOT EXISTS public.teamly_wtd_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  opted_out BOOLEAN NOT NULL DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  opt_out_document_url TEXT, -- Store signed document
  
  -- Opt-out can be withdrawn with 7 days notice
  withdrawal_requested_at TIMESTAMPTZ,
  withdrawal_effective_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
      UNIQUE(company_id, profile_id)
    );
  $sql_table4$;

  -- Index
  CREATE INDEX IF NOT EXISTS idx_wtd_opt_outs_company ON public.teamly_wtd_opt_outs(company_id);
  CREATE INDEX IF NOT EXISTS idx_wtd_opt_outs_profile ON public.teamly_wtd_opt_outs(profile_id);

-- RLS
ALTER TABLE public.teamly_wtd_opt_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view opt-outs for their company" ON public.teamly_wtd_opt_outs;
CREATE POLICY "Users can view opt-outs for their company"
  ON public.teamly_wtd_opt_outs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage opt-outs for their company" ON public.teamly_wtd_opt_outs;
CREATE POLICY "Admins can manage opt-outs for their company"
  ON public.teamly_wtd_opt_outs FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

  -- =============================================
  -- 5. UPDATE TRIGGERS
  -- =============================================
  -- Auto-update updated_at timestamp
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- Create triggers only if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teamly_shift_rules') THEN
    DROP TRIGGER IF EXISTS update_teamly_shift_rules_updated_at ON public.teamly_shift_rules;
    CREATE TRIGGER update_teamly_shift_rules_updated_at
      BEFORE UPDATE ON public.teamly_shift_rules
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teamly_notification_settings') THEN
    DROP TRIGGER IF EXISTS update_teamly_notification_settings_updated_at ON public.teamly_notification_settings;
    CREATE TRIGGER update_teamly_notification_settings_updated_at
      BEFORE UPDATE ON public.teamly_notification_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teamly_wtd_opt_outs') THEN
    DROP TRIGGER IF EXISTS update_teamly_wtd_opt_outs_updated_at ON public.teamly_wtd_opt_outs;
    CREATE TRIGGER update_teamly_wtd_opt_outs_updated_at
      BEFORE UPDATE ON public.teamly_wtd_opt_outs
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

END $$;

