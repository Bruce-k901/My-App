-- Add a JSONB details column to tasks to store dynamic form responses
alter table if exists public.tasks
  add column if not exists details jsonb;