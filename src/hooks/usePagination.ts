'use client';

import { useUserPreferences } from '@/context/UserPreferencesContext';

/**
 * Returns the user's preferred items-per-page value for paginated tables.
 */
export function usePagination() {
  const { preferences } = useUserPreferences();
  return {
    pageSize: preferences.items_per_page ?? 25,
  };
}
