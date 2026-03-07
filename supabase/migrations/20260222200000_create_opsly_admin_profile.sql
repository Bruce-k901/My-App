-- ============================================================================
-- Migration: Create Opsly Admin System Profile
-- ============================================================================
-- Creates a dedicated "Opsly Admin" profile record used as the sender
-- identity for all system-generated DMs (ticket replies, resolutions, etc).
-- This profile has no corresponding auth.users account and is not tied
-- to any single company — it exists as a cross-company system identity.
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
      '00000000-0000-0000-0000-000000000001'::uuid,
      NULL,
      NULL,
      'Opsly Admin',
      'admin@opsly.app',
      'Admin',
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Opsly Admin profile created (or already exists)';
  ELSE
    RAISE NOTICE 'profiles table does not exist yet — skipping';
  END IF;
END $$;
