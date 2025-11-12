-- ============================================================================
-- Migration: 20251111133000_alter_temperature_logs.sql
-- Description: Adds missing columns to temperature_logs for breach exports
-- ============================================================================

alter table if exists public.temperature_logs
  add column if not exists meta jsonb,
  add column if not exists unit text default 'celsius',
  add column if not exists status text default 'ok',
  add column if not exists source text,
  add column if not exists recorded_by uuid references public.profiles(id) on delete set null;
