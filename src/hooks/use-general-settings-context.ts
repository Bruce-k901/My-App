import { useGeneralSettings } from './use-general-settings';
import { useMemo } from 'react';

/**
 * Hook to get general settings with formatted helpers
 * Use this throughout the app to access company settings
 */
export function useGeneralSettingsContext() {
  const { data: settings, isLoading } = useGeneralSettings();

  const formatted = useMemo(() => {
    if (!settings) return null;

    return {
      ...settings,
      // Date formatting helpers
      formatDate: (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const format = settings.date_format || 'DD/MM/YYYY';
        
        if (format === 'DD/MM/YYYY') {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else if (format === 'MM/DD/YYYY') {
          return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        } else {
          return d.toISOString().split('T')[0];
        }
      },
      // Time formatting helpers
      formatTime: (time: string | Date) => {
        const t = typeof time === 'string' ? time : time.toTimeString().slice(0, 5);
        const format = settings.time_format || '24h';
        
        if (format === '12h') {
          const [hours, minutes] = t.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minutes} ${ampm}`;
        }
        return t;
      },
      // Currency formatting helpers
      formatCurrency: (amount: number) => {
        const symbol = settings.currency_symbol || '£';
        const format = settings.currency_format || 'symbol_before';
        
        if (format === 'symbol_before') {
          return `${symbol}${amount.toFixed(2)}`;
        } else {
          return `${amount.toFixed(2)}${symbol}`;
        }
      },
    };
  }, [settings]);

  return {
    settings: formatted,
    isLoading,
  };
}

