'use client';

import { useUserPreferences } from '@/context/UserPreferencesContext';

/**
 * Returns the user's effective date/time format, falling back to company
 * defaults if no user override is set.
 *
 * Usage:
 *   const { dateFormat, timeFormat } = useFormattedSettings();
 */
export function useFormattedSettings() {
  const { preferences } = useUserPreferences();

  // Company defaults (from general_settings) are DD/MM/YYYY and 24h
  // TODO: Wire in useGeneralSettingsContext when available
  const companyDateFormat = 'DD/MM/YYYY';
  const companyTimeFormat = '24h';

  return {
    dateFormat: preferences.date_format ?? companyDateFormat,
    timeFormat: preferences.time_format ?? companyTimeFormat,
  };
}
