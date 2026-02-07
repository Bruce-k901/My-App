'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { DashboardPreferences, DashboardPreferencesRow } from '@/types/dashboard';
import { useRoleDefaults } from './useRoleDefaults';
import { useEnabledModules } from './useEnabledModules';
import { WIDGET_REGISTRY } from '@/config/widget-registry';

const LOCAL_STORAGE_KEY = 'dashboard_preferences';

/**
 * Default empty preferences
 */
const EMPTY_PREFERENCES: DashboardPreferences = {
  visibleWidgets: [],
  widgetOrder: [],
  collapsedWidgets: [],
};

/**
 * Hook to manage dashboard preferences
 * Loads from Supabase with localStorage cache for instant hydration
 * Falls back to role-based defaults if no preferences exist
 */
export function useDashboardPreferences(): {
  preferences: DashboardPreferences;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<DashboardPreferences>) => Promise<void>;
  toggleWidget: (widgetId: string) => Promise<void>;
  toggleCollapse: (widgetId: string) => Promise<void>;
  reorderWidgets: (widgetIds: string[]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
} {
  const { user, siteId } = useAppContext();
  const { defaultWidgets } = useRoleDefaults();
  const { enabledModules, loading: modulesLoading } = useEnabledModules();

  const [preferences, setPreferences] = useState<DashboardPreferences>(EMPTY_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);

  // Filter default widgets by enabled modules
  const filteredDefaults = useMemo(() => {
    return defaultWidgets.filter((widgetId) => {
      const widget = WIDGET_REGISTRY[widgetId];
      if (!widget) return false;
      return enabledModules.includes(widget.module);
    });
  }, [defaultWidgets, enabledModules]);

  // Load preferences from localStorage for instant hydration
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.visibleWidgets && parsed.visibleWidgets.length > 0) {
          setPreferences(parsed);
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user?.id || modulesLoading) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { data, error: queryError } = await supabase
        .from('user_dashboard_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('site_id', siteId || null)
        .maybeSingle();

      if (queryError) {
        // Handle table not existing yet
        if (queryError.code === '42P01') {
          console.debug('user_dashboard_preferences table does not exist yet');
        } else {
          throw queryError;
        }
      }

      if (data) {
        const row = data as DashboardPreferencesRow;
        const prefs: DashboardPreferences = {
          visibleWidgets: row.visible_widgets || [],
          widgetOrder: row.widget_order || [],
          collapsedWidgets: row.collapsed_widgets || [],
        };
        setPreferences(prefs);
        saveToLocalStorage(prefs);
      } else {
        // No saved preferences - use role-based defaults
        const defaultPrefs: DashboardPreferences = {
          visibleWidgets: filteredDefaults,
          widgetOrder: filteredDefaults,
          collapsedWidgets: [],
        };
        setPreferences(defaultPrefs);
        saveToLocalStorage(defaultPrefs);
      }

      setHasLoadedFromDb(true);
    } catch (err: any) {
      console.error('Error loading dashboard preferences:', err);
      setError(err.message);
      // Fall back to defaults on error
      const defaultPrefs: DashboardPreferences = {
        visibleWidgets: filteredDefaults,
        widgetOrder: filteredDefaults,
        collapsedWidgets: [],
      };
      setPreferences(defaultPrefs);
    } finally {
      setLoading(false);
    }
  }, [user?.id, siteId, filteredDefaults, modulesLoading]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Save to localStorage for instant hydration
  const saveToLocalStorage = (prefs: DashboardPreferences) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  // Save preferences to database
  const savePreferences = async (prefs: DashboardPreferences) => {
    if (!user?.id) return;

    try {
      const { error: upsertError } = await supabase
        .from('user_dashboard_preferences')
        .upsert(
          {
            user_id: user.id,
            site_id: siteId || null,
            visible_widgets: prefs.visibleWidgets,
            widget_order: prefs.widgetOrder,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,site_id',
          }
        );

      if (upsertError) {
        // Silently handle if table doesn't exist
        if (upsertError.code !== '42P01') {
          throw upsertError;
        }
      }
    } catch (err: any) {
      console.error('Error saving dashboard preferences:', err);
      setError(err.message);
    }
  };

  // Update preferences
  const updatePreferences = useCallback(
    async (updates: Partial<DashboardPreferences>) => {
      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs);
      saveToLocalStorage(newPrefs);
      await savePreferences(newPrefs);
    },
    [preferences, user?.id, siteId]
  );

  // Toggle widget visibility
  const toggleWidget = useCallback(
    async (widgetId: string) => {
      const isVisible = preferences.visibleWidgets.includes(widgetId);
      let newVisible: string[];
      let newOrder: string[];

      if (isVisible) {
        // Remove widget
        newVisible = preferences.visibleWidgets.filter((id) => id !== widgetId);
        newOrder = preferences.widgetOrder.filter((id) => id !== widgetId);
      } else {
        // Add widget
        newVisible = [...preferences.visibleWidgets, widgetId];
        newOrder = [...preferences.widgetOrder, widgetId];
      }

      await updatePreferences({
        visibleWidgets: newVisible,
        widgetOrder: newOrder,
      });
    },
    [preferences, updatePreferences]
  );

  // Toggle widget collapse state (mobile)
  const toggleCollapse = useCallback(
    async (widgetId: string) => {
      const isCollapsed = preferences.collapsedWidgets.includes(widgetId);
      const newCollapsed = isCollapsed
        ? preferences.collapsedWidgets.filter((id) => id !== widgetId)
        : [...preferences.collapsedWidgets, widgetId];

      await updatePreferences({ collapsedWidgets: newCollapsed });
    },
    [preferences, updatePreferences]
  );

  // Reorder widgets
  const reorderWidgets = useCallback(
    async (widgetIds: string[]) => {
      await updatePreferences({ widgetOrder: widgetIds });
    },
    [updatePreferences]
  );

  // Reset to role-based defaults
  const resetToDefaults = useCallback(async () => {
    const defaultPrefs: DashboardPreferences = {
      visibleWidgets: filteredDefaults,
      widgetOrder: filteredDefaults,
      collapsedWidgets: [],
    };
    setPreferences(defaultPrefs);
    saveToLocalStorage(defaultPrefs);
    await savePreferences(defaultPrefs);
  }, [filteredDefaults, user?.id, siteId]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    toggleWidget,
    toggleCollapse,
    reorderWidgets,
    resetToDefaults,
  };
}
