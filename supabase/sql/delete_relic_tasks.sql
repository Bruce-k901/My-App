-- Delete tasks created before November 11, 2025
-- This will remove old test/relic tasks while keeping recent ones

DELETE FROM public.checklist_tasks
WHERE created_at < '2025-11-11'::date;

