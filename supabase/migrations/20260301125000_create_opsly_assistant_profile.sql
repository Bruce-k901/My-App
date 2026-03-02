-- ============================================================================
-- Migration: Create Opsly Assistant System Profile
-- ============================================================================
-- Creates a dedicated "Opsly Assistant" profile record used as the sender
-- identity for all AI-generated messages, task creation, and notifications.
-- This is separate from "Opsly Admin" (000...001) which handles ticket admin
-- replies. OA is the user-facing personal assistant / copilot.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    INSERT INTO profiles (
      id,
      auth_user_id,
      company_id,
      full_name,
      email,
      app_role,
      is_platform_admin,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000002'::uuid,
      NULL,
      NULL,
      'Opsly Assistant',
      'assistant@opsly.app',
      'Admin',
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Opsly Assistant profile created (or already exists)';
  ELSE
    RAISE NOTICE 'profiles table does not exist yet — skipping';
  END IF;
END $$;
