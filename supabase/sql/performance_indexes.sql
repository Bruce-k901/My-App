-- Performance optimization indexes for common query patterns

-- Composite indexes for assets queries
CREATE INDEX IF NOT EXISTS idx_assets_company_status 
ON public.assets (company_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_assets_company_site_status 
ON public.assets (company_id, site_id, status);

CREATE INDEX IF NOT EXISTS idx_assets_category_company 
ON public.assets (category, company_id);

-- Composite indexes for tasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_company_status_due 
ON public.tasks (company_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_site_status_due 
ON public.tasks (site_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status 
ON public.tasks (assigned_to, status) 
WHERE assigned_to IS NOT NULL;

-- Composite indexes for notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_company_unread 
ON public.notifications (company_id, read, created_at DESC) 
WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, read, created_at DESC) 
WHERE user_id IS NOT NULL AND read = false;

-- Composite indexes for temperature logs queries
CREATE INDEX IF NOT EXISTS idx_temperature_logs_asset_date 
ON public.temperature_logs (asset_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_temperature_logs_site_date 
ON public.temperature_logs (site_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_temperature_logs_status_date 
ON public.temperature_logs (status, recorded_at DESC) 
WHERE status != 'ok';

-- Composite indexes for incidents queries
CREATE INDEX IF NOT EXISTS idx_incidents_company_status 
ON public.incidents (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_site_status 
ON public.incidents (site_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_severity_company 
ON public.incidents (severity, company_id, created_at DESC) 
WHERE severity = 'high';

-- Composite indexes for PPM schedule queries
CREATE INDEX IF NOT EXISTS idx_ppm_schedule_company_status_date 
ON public.ppm_schedule (company_id, status, next_service_date);

CREATE INDEX IF NOT EXISTS idx_ppm_schedule_asset_status 
ON public.ppm_schedule (asset_id, status);

CREATE INDEX IF NOT EXISTS idx_ppm_schedule_due_soon 
ON public.ppm_schedule (next_service_date, status) 
WHERE status IN ('due_soon', 'overdue');

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_contractors_active_company 
ON public.contractors (company_id, category, region) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sites_active_company 
ON public.sites (company_id, region) 
WHERE is_active = true;

-- Indexes for full-text search (if using text search)
CREATE INDEX IF NOT EXISTS idx_assets_name_search 
ON public.assets USING gin(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_contractors_name_search 
ON public.contractors USING gin(to_tsvector('english', name));

-- Indexes for JSONB queries (if using JSONB fields)
CREATE INDEX IF NOT EXISTS idx_sites_operating_schedule 
ON public.sites USING gin(operating_schedule);

-- Indexes for date range queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_range 
ON public.tasks (due_date) 
WHERE status IN ('pending', 'in_progress', 'overdue');

CREATE INDEX IF NOT EXISTS idx_ppm_schedule_next_service_range 
ON public.ppm_schedule (next_service_date) 
WHERE status IN ('scheduled', 'due_soon', 'overdue');
