'use client';

import { useCallback } from 'react';
import { useUserPreferences } from '@/context/UserPreferencesContext';

/**
 * Returns the preferred view mode (table/card) for a given page section,
 * and a setter that persists the choice to user preferences.
 *
 * @param pageKey - Unique key for the section (e.g. 'stock-items', 'assets')
 * @param fallback - Default if no preference set (defaults to 'table')
 */
export function useViewPreference(
  pageKey: string,
  fallback: 'table' | 'card' = 'table',
): [viewMode: 'table' | 'card', setViewMode: (mode: 'table' | 'card') => void] {
  const { preferences, updatePreference } = useUserPreferences();

  const viewMode = preferences.default_views?.[pageKey] ?? fallback;

  const setViewMode = useCallback(
    (mode: 'table' | 'card') => {
      updatePreference('default_views', {
        ...(preferences.default_views ?? {}),
        [pageKey]: mode,
      });
    },
    [pageKey, preferences.default_views, updatePreference],
  );

  return [viewMode, setViewMode];
}
