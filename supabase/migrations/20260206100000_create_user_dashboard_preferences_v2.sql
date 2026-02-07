-- ============================================================================
-- Migration: User Dashboard Preferences (v2)
-- Description: Stores per-user, per-site widget visibility preferences
-- ============================================================================

-- Drop existing table if it exists from previous implementation
DROP TABLE IF EXISTS user_dashboard_preferences CASCADE;

-- Create the new table
CREATE TABLE user_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  visible_widgets jsonb DEFAULT '[]'::jsonb,
  widget_order jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);

-- Create indexes
CREATE INDEX idx_user_dashboard_prefs_user ON user_dashboard_preferences(user_id);
CREATE INDEX idx_user_dashboard_prefs_site ON user_dashboard_preferences(site_id);

-- Enable RLS
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own preferences"
  ON user_dashboard_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_dashboard_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_dashboard_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_dashboard_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER set_user_dashboard_preferences_updated_at
  BEFORE UPDATE ON user_dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_dashboard_preferences TO authenticated;
