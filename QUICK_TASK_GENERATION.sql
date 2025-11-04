-- Quick Task Generation - Run this in Supabase SQL Editor
-- This will generate all missing tasks for today, including the ice machine task instances

SELECT * FROM generate_daily_tasks_direct();

