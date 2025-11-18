// Feature flags for safe rollouts and A/B testing
// Toggle features via environment variables without code changes

/**
 * Feature Flags System
 * 
 * Usage:
 *   import { FEATURE_FLAGS } from '@/lib/featureFlags';
 *   
 *   if (FEATURE_FLAGS.USE_NEW_SITES_PAGE) {
 *     return <NewSitesPage />;
 *   }
 *   return <OldSitesPage />;
 * 
 * To enable a feature, set the env var in .env.local:
 *   NEXT_PUBLIC_USE_NEW_SITES_PAGE=true
 */

// Role guard feature flag (existing)
export function isRoleGuardEnabled(): boolean {
  const val = process.env.NEXT_PUBLIC_ENABLE_ROLE_GUARD;
  return val === "true";
}

/**
 * Main feature flags object
 * Add new flags here as needed
 */
export const FEATURE_FLAGS = {
  // Role-based access control
  roleGuard: () => isRoleGuardEnabled(),

  // Route structure flags
  USE_NEW_SITES_PAGE: process.env.NEXT_PUBLIC_USE_NEW_SITES_PAGE === 'true',
  USE_UNIFIED_LAYOUT: process.env.NEXT_PUBLIC_UNIFIED_LAYOUT === 'true',
  USE_ORGANIZATION_ROUTES: process.env.NEXT_PUBLIC_USE_ORGANIZATION_ROUTES !== 'false', // Default true

  // Sidebar flags
  USE_NEW_SIDEBAR: process.env.NEXT_PUBLIC_USE_NEW_SIDEBAR === 'true',
  USE_CONTEXTUAL_SIDEBAR: process.env.NEXT_PUBLIC_USE_CONTEXTUAL_SIDEBAR === 'true',

  // Performance flags
  ENABLE_REACT_QUERY_DEVTOOLS: process.env.NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS === 'true',
  ENABLE_ROUTE_LOGGING: process.env.NEXT_PUBLIC_ENABLE_ROUTE_LOGGING === 'true',

  // Feature-specific flags
  ENABLE_ATTENDANCE_LOGS: process.env.NEXT_PUBLIC_ENABLE_ATTENDANCE_LOGS !== 'false', // Default true
  ENABLE_TEMPERATURE_LOGS: process.env.NEXT_PUBLIC_ENABLE_TEMPERATURE_LOGS !== 'false', // Default true
} as const;

/**
 * Type-safe feature flag checker
 * Use this for better TypeScript support
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  const value = FEATURE_FLAGS[flag];
  return typeof value === 'function' ? value() : Boolean(value);
}

/**
 * Get all enabled features (useful for debugging)
 */
export function getEnabledFeatures(): Record<string, boolean> {
  return Object.keys(FEATURE_FLAGS).reduce((acc, key) => {
    acc[key] = isFeatureEnabled(key as keyof typeof FEATURE_FLAGS);
    return acc;
  }, {} as Record<string, boolean>);
}
