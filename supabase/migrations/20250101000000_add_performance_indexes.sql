-- Add performance indexes for dashboard optimization
-- These indexes improve query performance for company-scoped data

-- Index for sites table on company_id
CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(company_id);

-- Index for assets table on site_id
CREATE INDEX IF NOT EXISTS idx_assets_site ON assets(site_id);

-- Index for contractors table on company_id
CREATE INDEX IF NOT EXISTS idx_contractors_company ON contractors(company_id);

-- Additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_profiles_company_site ON profiles(company_id, site_id);
CREATE INDEX IF NOT EXISTS idx_assets_company_site ON assets(company_id, site_id) WHERE company_id IS NOT NULL;

-- Index for task-related queries
CREATE INDEX IF NOT EXISTS idx_tasks_site ON tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id) WHERE company_id IS NOT NULL;

-- Index for temperature logs (commonly queried for dashboard metrics)
CREATE INDEX IF NOT EXISTS idx_temperature_logs_site_date ON temperature_logs(site_id, created_at DESC);

-- Index for incidents (for dashboard alerts and recent activity)
CREATE INDEX IF NOT EXISTS idx_incidents_site_date ON incidents(site_id, created_at DESC);