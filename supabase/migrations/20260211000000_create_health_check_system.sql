-- ============================================================================
-- HEALTH CHECK SYSTEM
-- Scans modules for incomplete data, generates role-based reports,
-- supports delegation via Msgly, automated reminders and escalation.
-- ============================================================================

-- ============================================================================
-- HEALTH CHECK REPORTS (One per user per reporting cycle)
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_check_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Hierarchy level
  report_level text NOT NULL CHECK (report_level IN ('site', 'area', 'region', 'company')),

  -- Organizational scope (nulls for higher levels)
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  area_id uuid,
  region_id uuid,

  -- Assignment
  assigned_to uuid NOT NULL REFERENCES profiles(id),
  assigned_role text NOT NULL,

  -- Summary statistics
  total_items integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  medium_count integer DEFAULT 0,
  low_count integer DEFAULT 0,
  completed_items integer DEFAULT 0,
  delegated_items integer DEFAULT 0,
  escalated_items integer DEFAULT 0,
  ignored_items integer DEFAULT 0,

  -- Health scoring
  health_score numeric(5,2),
  previous_week_score numeric(5,2),

  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),

  -- Calendar integration (links to checklist_tasks)
  calendar_task_id uuid,

  -- Testing
  is_test_data boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_viewed_at timestamptz
);

CREATE INDEX idx_health_reports_assigned ON health_check_reports(assigned_to, status, created_at DESC);
CREATE INDEX idx_health_reports_company ON health_check_reports(company_id, report_level, created_at DESC);
CREATE INDEX idx_health_reports_site ON health_check_reports(site_id, status) WHERE site_id IS NOT NULL;

-- ============================================================================
-- HEALTH CHECK ITEMS (Individual incomplete data points)
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_check_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES health_check_reports(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,

  -- Classification
  severity text NOT NULL CHECK (severity IN ('critical', 'medium', 'low')),
  module text NOT NULL CHECK (module IN ('checkly', 'stockly', 'teamly', 'planly', 'assetly', 'msgly')),
  category text NOT NULL,

  -- Description
  title text NOT NULL,
  description text NOT NULL,

  -- Fix metadata
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  record_name text,
  field_name text NOT NULL,
  field_label text,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'multiselect', 'date', 'relationship', 'boolean', 'json')),
  current_value jsonb,
  field_options jsonb,
  field_metadata jsonb,

  -- AI assistance
  ai_suggestion jsonb,
  ai_confidence numeric(5,2),
  ai_reasoning text,

  -- Status
  status text DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'delegated', 'resolved', 'ignored', 'escalated', 'ai_fixed'
  )),

  -- Delegation
  delegated_to uuid REFERENCES profiles(id),
  delegated_at timestamptz,
  delegated_by uuid REFERENCES profiles(id),
  delegation_message text,
  due_date timestamptz,

  -- Msgly integration (uses conversations table)
  conversation_id uuid,

  -- Follow-up
  last_reminder_sent timestamptz,
  reminder_count integer DEFAULT 0,
  next_reminder_at timestamptz,

  -- Escalation
  escalated_to uuid REFERENCES profiles(id),
  escalated_at timestamptz,
  escalation_reason text,

  -- Resolution
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolution_method text,
  new_value jsonb,
  edit_url text,

  -- Testing
  is_test_data boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_health_items_report ON health_check_items(report_id, severity, status);
CREATE INDEX idx_health_items_delegated ON health_check_items(delegated_to, status, due_date) WHERE delegated_to IS NOT NULL;
CREATE INDEX idx_health_items_overdue ON health_check_items(due_date, status) WHERE status IN ('pending', 'delegated') AND due_date IS NOT NULL;
CREATE INDEX idx_health_items_reminders ON health_check_items(next_reminder_at) WHERE next_reminder_at IS NOT NULL AND status IN ('pending', 'delegated');
CREATE INDEX idx_health_items_site ON health_check_items(site_id, module, severity);

CREATE OR REPLACE FUNCTION update_health_check_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER health_check_items_updated_at
  BEFORE UPDATE ON health_check_items
  FOR EACH ROW EXECUTE FUNCTION update_health_check_items_updated_at();

-- ============================================================================
-- HEALTH CHECK REMINDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_check_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_check_item_id uuid NOT NULL REFERENCES health_check_items(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('initial', 'follow_up', 'escalation_warning', 'escalated')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  sent_to uuid NOT NULL REFERENCES profiles(id),
  notification_channels text[] DEFAULT ARRAY['msgly'],
  message_content text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_health_reminders_scheduled ON health_check_reminders(scheduled_for, sent_at) WHERE sent_at IS NULL;

-- ============================================================================
-- HEALTH CHECK HISTORY (Trend tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_check_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  total_items integer NOT NULL,
  critical_count integer NOT NULL,
  medium_count integer NOT NULL,
  low_count integer NOT NULL,
  completed_items integer NOT NULL,
  health_score numeric(5,2) NOT NULL,
  module_scores jsonb,
  category_counts jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, site_id, report_date)
);

CREATE INDEX idx_health_history_company ON health_check_history(company_id, report_date DESC);

-- ============================================================================
-- ADD emergency_contact TO profiles
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact jsonb;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE health_check_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_history ENABLE ROW LEVEL SECURITY;

-- Reports: users see reports assigned to them or for their company if admin/owner
CREATE POLICY "Users can view their assigned health check reports"
  ON health_check_reports FOR SELECT
  USING (
    assigned_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM profiles WHERE auth_user_id = auth.uid() AND LOWER(app_role::text) IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update their assigned health check reports"
  ON health_check_reports FOR UPDATE
  USING (
    assigned_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM profiles WHERE auth_user_id = auth.uid() AND LOWER(app_role::text) IN ('owner', 'admin')
    )
  );

-- Items: users see items in their reports or delegated to them
CREATE POLICY "Users can view health check items"
  ON health_check_items FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM health_check_reports WHERE assigned_to = auth.uid()
    )
    OR delegated_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update health check items"
  ON health_check_items FOR UPDATE
  USING (
    report_id IN (
      SELECT id FROM health_check_reports WHERE assigned_to = auth.uid()
    )
    OR delegated_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Reminders: users can view reminders sent to them
CREATE POLICY "Users can view their health check reminders"
  ON health_check_reminders FOR SELECT
  USING (sent_to IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- History: company members can view
CREATE POLICY "Company members can view health check history"
  ON health_check_history FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Service role policies for cron/admin operations (INSERT/DELETE)
CREATE POLICY "Service role insert health check reports"
  ON health_check_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role delete health check reports"
  ON health_check_reports FOR DELETE
  USING (true);

CREATE POLICY "Service role insert health check items"
  ON health_check_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role delete health check items"
  ON health_check_items FOR DELETE
  USING (true);

CREATE POLICY "Service role manage health check reminders"
  ON health_check_reminders FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role insert health check history"
  ON health_check_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role delete health check history"
  ON health_check_history FOR DELETE
  USING (true);
