'use client';

import { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { RoleSlug } from '@/types/dashboard';

/**
 * Default widget visibility by role
 * Keys are role slugs, values are arrays of widget IDs
 * IDs must match keys in WIDGET_REGISTRY (simple format, no module prefix)
 */
export const ROLE_DEFAULT_WIDGETS: Record<RoleSlug, string[]> = {
  owner: [
    // Checkly
    'compliance_score',
    'overdue_checks',
    'todays_checks',
    // Stockly
    'low_stock_alerts',
    'pending_stock_orders',
    // Teamly
    'whos_on_today',
    'training_expiries',
    // Planly
    'todays_production',
    'pending_customer_orders',
    // Assetly
    'overdue_maintenance',
    'asset_issues',
    // Msgly
    'unread_messages',
  ],
  admin: [
    'compliance_score',
    'overdue_checks',
    'todays_checks',
    'low_stock_alerts',
    'pending_stock_orders',
    'whos_on_today',
    'training_expiries',
    'todays_production',
    'pending_customer_orders',
    'overdue_maintenance',
    'asset_issues',
    'unread_messages',
  ],
  site_manager: [
    'compliance_score',
    'overdue_checks',
    'todays_checks',
    'low_stock_alerts',
    'whos_on_today',
    'training_expiries',
    'asset_issues',
    'unread_messages',
  ],
  kitchen: [
    'todays_checks',
    'overdue_checks',
    'low_stock_alerts',
    'todays_production',
    'pending_customer_orders',
    'whos_on_today',
    'unread_messages',
  ],
  front_of_house: [
    'compliance_score',
    'todays_checks',
    'whos_on_today',
    'unread_messages',
  ],
  warehouse: [
    'low_stock_alerts',
    'pending_stock_orders',
    'whos_on_today',
    'overdue_maintenance',
    'unread_messages',
  ],
  staff: [
    'todays_checks',
    'whos_on_today',
    'unread_messages',
  ],
};

/**
 * Mapping from legacy app_role values to RoleSlug
 */
const LEGACY_ROLE_MAPPING: Record<string, RoleSlug> = {
  owner: 'owner',
  admin: 'admin',
  regional_manager: 'admin',
  area_manager: 'site_manager',
  manager: 'site_manager',
  site_manager: 'site_manager',
  team_leader: 'site_manager',
  kitchen: 'kitchen',
  chef: 'kitchen',
  cook: 'kitchen',
  front_of_house: 'front_of_house',
  foh: 'front_of_house',
  server: 'front_of_house',
  warehouse: 'warehouse',
  stock: 'warehouse',
  staff: 'staff',
  employee: 'staff',
};

/**
 * Detect role slug from profile
 * Priority: new roles system > legacy app_role > default 'staff'
 */
export function getRoleSlug(profile: any): RoleSlug {
  // Try new roles system first (if profile has roles array)
  if (profile?.roles?.[0]?.slug) {
    const slug = profile.roles[0].slug.toLowerCase();
    if (slug in ROLE_DEFAULT_WIDGETS) {
      return slug as RoleSlug;
    }
    // Try mapping the new role slug
    if (slug in LEGACY_ROLE_MAPPING) {
      return LEGACY_ROLE_MAPPING[slug];
    }
  }

  // Try legacy app_role field
  if (profile?.app_role) {
    const legacyRole = profile.app_role.toLowerCase().replace(/\s+/g, '_');
    if (legacyRole in LEGACY_ROLE_MAPPING) {
      return LEGACY_ROLE_MAPPING[legacyRole];
    }
  }

  // Try position_title or boh_foh for additional context
  if (profile?.boh_foh) {
    const bohFoh = profile.boh_foh.toLowerCase();
    if (bohFoh === 'boh' || bohFoh === 'back_of_house') {
      return 'kitchen';
    }
    if (bohFoh === 'foh' || bohFoh === 'front_of_house') {
      return 'front_of_house';
    }
  }

  // Default to staff
  return 'staff';
}

/**
 * Get default widgets for a specific role
 */
export function getDefaultWidgetsForRole(roleSlug: RoleSlug): string[] {
  return ROLE_DEFAULT_WIDGETS[roleSlug] || ROLE_DEFAULT_WIDGETS.staff;
}

/**
 * Hook to get role-based default widgets for current user
 */
export function useRoleDefaults(): {
  roleSlug: RoleSlug;
  defaultWidgets: string[];
} {
  const { profile } = useAppContext();

  return useMemo(() => {
    const roleSlug = getRoleSlug(profile);
    const defaultWidgets = getDefaultWidgetsForRole(roleSlug);

    return {
      roleSlug,
      defaultWidgets,
    };
  }, [profile]);
}
