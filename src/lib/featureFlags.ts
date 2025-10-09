// Simple feature flags for the app
// Toggle role guard globally via env: NEXT_PUBLIC_ENABLE_ROLE_GUARD

export function isRoleGuardEnabled(): boolean {
  // Default disabled in dev if not set
  const val = process.env.NEXT_PUBLIC_ENABLE_ROLE_GUARD;
  return val === "true";
}

export const FEATURE_FLAGS = {
  roleGuard: () => isRoleGuardEnabled(),
};