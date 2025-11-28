-- Migration: Create view for deduplicated tasks
-- Description: Creates a database view that automatically deduplicates tasks
-- This ensures the frontend always gets clean data without duplicates

-- Create view that returns only the oldest task for each unique combination
CREATE OR REPLACE VIEW deduplicated_checklist_tasks AS
SELECT DISTINCT ON (
  template_id,
  site_id,
  due_date,
  COALESCE(daypart, ''),
  COALESCE(due_time::text, '')
)
  *
FROM checklist_tasks
WHERE template_id IS NOT NULL
ORDER BY 
  template_id,
  site_id,
  due_date,
  COALESCE(daypart, ''),
  COALESCE(due_time::text, ''),
  created_at ASC; -- Keep oldest task

-- Add comment
COMMENT ON VIEW deduplicated_checklist_tasks IS 
'View that returns deduplicated tasks, keeping only the oldest task for each unique combination of template_id, site_id, due_date, daypart, and due_time';

-- Grant access to authenticated users
GRANT SELECT ON deduplicated_checklist_tasks TO authenticated;

