-- Index for task visibility queries (enhanced existing site_idx)
-- Note: idx_checklist_tasks_site_idx already exists, this enhances it with status
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_site_status_date
ON checklist_tasks(site_id, status, due_date)
WHERE site_id IS NOT NULL;

-- Enhanced index for employee site assignments queries
-- Note: idx_employee_site_assignments_active already exists but only on is_active
-- This adds profile_id for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_employee_site_assignments_user_active_dates
ON employee_site_assignments(profile_id, is_active, start_date, end_date);

-- Index for regions lookup by manager (already exists, but ensure it's comprehensive)
-- Note: idx_regions_regional_manager_id already exists with WHERE clause
-- This creates a more comprehensive version if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'regions'
        AND indexname = 'idx_regions_regional_manager_id_no_filter'
    ) THEN
        CREATE INDEX idx_regions_regional_manager_id_no_filter
        ON regions(regional_manager_id);
    END IF;
END $$;

-- Index for areas lookup by manager (already exists, but ensure it's comprehensive)
-- Note: idx_areas_area_manager_id already exists with WHERE clause
-- This creates a more comprehensive version if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'areas'
        AND indexname = 'idx_areas_area_manager_id_no_filter'
    ) THEN
        CREATE INDEX idx_areas_area_manager_id_no_filter
        ON areas(area_manager_id);
    END IF;
END $$;