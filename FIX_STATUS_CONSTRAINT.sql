-- Fix status constraint to allow ALL status values (old and new)
-- This ensures backward compatibility with existing data

-- Drop both existing constraints
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_status_valid;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add new comprehensive constraint
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN (
    -- Old statuses (existing data)
    'todo', 'in_progress', 'done', 'snoozed', 'na',
    -- New statuses (from messaging tasks)
    'pending', 'completed', 'cancelled', 'overdue', 'not_applicable'
  ));

-- Reload schema
NOTIFY pgrst, 'reload schema';

-- Verify the constraint
SELECT con.conname, pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con 
JOIN pg_class rel ON rel.oid = con.conrelid 
WHERE rel.relname = 'tasks' 
AND con.conname = 'tasks_status_check';
