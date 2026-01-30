-- ============================================================================
-- Migration: 20251111133000_alter_temperature_logs.sql
-- Description: Adds missing columns to temperature_logs for breach exports
-- ============================================================================
-- Note: This migration will be skipped if temperature_logs table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if temperature_logs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'temperature_logs') THEN

    ALTER TABLE public.temperature_logs
      ADD COLUMN IF NOT EXISTS meta jsonb,
      ADD COLUMN IF NOT EXISTS unit text default 'celsius',
      ADD COLUMN IF NOT EXISTS status text default 'ok',
      ADD COLUMN IF NOT EXISTS source text;

    -- Only add recorded_by column if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      ALTER TABLE public.temperature_logs
        ADD COLUMN IF NOT EXISTS recorded_by uuid references public.profiles(id) on delete set null;
    END IF;

    RAISE NOTICE 'Added missing columns to temperature_logs table';

  ELSE
    RAISE NOTICE '⚠️ temperature_logs table does not exist yet - skipping column additions';
  END IF;
END $$;
