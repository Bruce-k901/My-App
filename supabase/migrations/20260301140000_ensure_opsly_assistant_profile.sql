-- ============================================================================
-- Migration: Ensure Opsly Assistant Profile Exists
-- ============================================================================
-- The previous migration (20260301125000) was repair-marked as applied but
-- never actually executed against the database. This migration ensures the
-- OA profile record exists so messaging FK constraints are satisfied.
-- ============================================================================

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
