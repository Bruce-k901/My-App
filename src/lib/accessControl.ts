export type AppRole = 'Staff' | 'Manager' | 'Owner' | 'Admin';

// Define which features each role can access
export const ACCESS_RULES = {
  Staff: {
    restricted: [
      'Organization',
      'Business Details',
      'Sites',
      'Users',
      'Documents',
      'Task Templates',
      'Compliance Templates',
      'Drafts',
      'Create Library',
      'Library Templates',
      'Contractors',
      'Reports',
      'Settings',
    ],
    canView: [
      'Dashboard',
      'My Tasks',
      'SOPs',
      'SOP Templates',
      "My RA's",
      'RA Templates',
      'COSHH Data',
      'All Libraries',
      'Assets',
      'PPM Schedule',
      'Callout Logs',
      'EHO Readiness',
      'Support',
    ],
  },
  Manager: {
    restricted: [] as string[],
    canView: 'all' as const,
  },
  Owner: {
    restricted: [] as string[],
    canView: 'all' as const,
  },
  Admin: {
    restricted: [] as string[],
    canView: 'all' as const,
  },
};

// Helper function to check if a feature is restricted for a role
export function isRestricted(
  role: AppRole | null,
  featureName: string
): boolean {
  if (!role) return true;

  if (role === 'Admin' || role === 'Owner' || role === 'Manager') {
    return false;
  }

  if (role === 'Staff') {
    return ACCESS_RULES.Staff.restricted.includes(featureName);
  }

  return false;
}

// Helper to check if role can access a feature
export function canAccess(
  role: AppRole | null,
  featureName: string
): boolean {
  return !isRestricted(role, featureName);
}

// Get dashboard route based on role
export function getDashboardRoute(role: AppRole | null): string {
  return '/dashboard';
}



