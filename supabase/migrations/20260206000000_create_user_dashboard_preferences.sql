-- Migration: Create user_dashboard_preferences table
-- Purpose: Store user-specific dashboard widget visibility and order preferences

CREATE TABLE user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  -- Array of widget IDs that are visible
  visible_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array of widget IDs in display order
  widget_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array of widget IDs that are collapsed (mobile)
  collapsed_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Each user can have one preference per site (null site = global preference)
  UNIQUE(profile_id, site_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_dashboard_preferences_profile_id ON user_dashboard_preferences(profile_id);
CREATE INDEX idx_user_dashboard_preferences_site_id ON user_dashboard_preferences(site_id);

-- Enable Row Level Security
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own preferences
CREATE POLICY "Users can view own dashboard preferences"
  ON user_dashboard_preferences
  FOR SELECT
  USING (profile_id = auth.uid());

-- RLS Policy: Users can insert their own preferences
CREATE POLICY "Users can create own dashboard preferences"
  ON user_dashboard_preferences
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- RLS Policy: Users can update their own preferences
CREATE POLICY "Users can update own dashboard preferences"
  ON user_dashboard_preferences
  FOR UPDATE
  USING (profile_id = auth.uid());

-- RLS Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own dashboard preferences"
  ON user_dashboard_preferences
  FOR DELETE
  USING (profile_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_dashboard_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_dashboard_preferences_updated_at
  BEFORE UPDATE ON user_dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_dashboard_preferences_updated_at();

-- Add comment for documentation
COMMENT ON TABLE user_dashboard_preferences IS 'Stores user-specific dashboard widget visibility and ordering preferences';
COMMENT ON COLUMN user_dashboard_preferences.visible_widgets IS 'JSONB array of widget IDs that are visible on the dashboard';
COMMENT ON COLUMN user_dashboard_preferences.widget_order IS 'JSONB array of widget IDs in the order they should be displayed';
COMMENT ON COLUMN user_dashboard_preferences.collapsed_widgets IS 'JSONB array of widget IDs that are collapsed on mobile view';
