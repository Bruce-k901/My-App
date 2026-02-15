'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { DashboardPreferences, DashboardPreferencesRow } from '@/types/dashboard';
import { useRoleDefaults } from '@/hooks/dashboard/useRoleDefaults';
import { useEnabledModules } from '@/hooks/dashboard/useEnabledModules';
import { WIDGET_REGISTRY } from '@/config/widget-registry';

const LOCAL_STORAGE_KEY = 'dashboard_preferences';

const EMPTY_PREFERENCES: DashboardPreferences = {
  visibleWidgets: [],
  widgetOrder: [],
  collapsedWidgets: [],
  widgetSizes: {},
};

interface DashboardPreferencesContextValue {
  preferences: DashboardPreferences;
  loading: boolean;
  error: string | null;
  isEditMode: boolean;
  setEditMode: (editing: boolean) => void;
  updatePreferences: (updates: Partial<DashboardPreferences>) => Promise<void>;
  toggleWidget: (widgetId: string) => Promise<void>;
  toggleCollapse: (widgetId: string) => Promise<void>;
  reorderWidgets: (widgetIds: string[]) => Promise<void>;
  updateWidgetSize: (widgetId: string, size: import('@/types/dashboard').WidgetSize) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const DashboardPreferencesContext = createContext<DashboardPreferencesContextValue | null>(null);

export function DashboardPreferencesProvider({ children }: { children: ReactNode }) {
  const { user, siteId } = useAppContext();
  const { defaultWidgets } = useRoleDefaults();
  const { enabledModules, loading: modulesLoading } = useEnabledModules();

  const [preferences, setPreferences] = useState<DashboardPreferences>(EMPTY_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setEditMode] = useState(false);

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

  // Save to localStorage
  const saveToLocalStorage = useCallback((prefs: DashboardPreferences) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Save preferences to database
  const savePreferences = useCallback(async (prefs: DashboardPreferences) => {
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
          { onConflict: 'user_id,site_id' }
        );

      if (upsertError && upsertError.code !== '42P01') {
        throw upsertError;
      }
    } catch (err: any) {
      console.error('Error saving dashboard preferences:', err);
      setError(err.message);
    }
  }, [user?.id, siteId]);

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user?.id || modulesLoading) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      let query = supabase
        .from('user_dashboard_preferences')
        .select('*')
        .eq('user_id', user.id);

      const effectiveSiteId = siteId && siteId !== 'all' ? siteId : null;
      if (effectiveSiteId) {
        query = query.eq('site_id', effectiveSiteId);
      } else {
        query = query.is('site_id', null);
      }

      const { data, error: queryError } = await query.maybeSingle();

      if (queryError) {
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
          widgetSizes: (row as any).widget_sizes || {},
        };
        setPreferences(prefs);
        saveToLocalStorage(prefs);
      } else {
        // No saved preferences - use role-based defaults
        const defaultPrefs: DashboardPreferences = {
          visibleWidgets: filteredDefaults,
          widgetOrder: filteredDefaults,
          collapsedWidgets: [],
          widgetSizes: {},
        };
        setPreferences(defaultPrefs);
        saveToLocalStorage(defaultPrefs);
      }
    } catch (err: any) {
      console.error('Error loading dashboard preferences:', err);
      setError(err.message);
      const defaultPrefs: DashboardPreferences = {
        visibleWidgets: filteredDefaults,
        widgetOrder: filteredDefaults,
        collapsedWidgets: [],
      };
      setPreferences(defaultPrefs);
    } finally {
      setLoading(false);
    }
  }, [user?.id, siteId, filteredDefaults, modulesLoading, saveToLocalStorage]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Update preferences (shared state + persist)
  const updatePreferences = useCallback(
    async (updates: Partial<DashboardPreferences>) => {
      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs);
      saveToLocalStorage(newPrefs);
      await savePreferences(newPrefs);
    },
    [preferences, saveToLocalStorage, savePreferences]
  );

  // Toggle widget visibility
  const toggleWidget = useCallback(
    async (widgetId: string) => {
      const isVisible = preferences.visibleWidgets.includes(widgetId);
      let newVisible: string[];
      let newOrder: string[];

      if (isVisible) {
        newVisible = preferences.visibleWidgets.filter((id) => id !== widgetId);
        newOrder = preferences.widgetOrder.filter((id) => id !== widgetId);
      } else {
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

  // Update a single widget's size
  const updateWidgetSize = useCallback(
    async (widgetId: string, size: import('@/types/dashboard').WidgetSize) => {
      const newSizes = { ...preferences.widgetSizes, [widgetId]: size };
      await updatePreferences({ widgetSizes: newSizes });
    },
    [preferences.widgetSizes, updatePreferences]
  );

  // Reset to role-based defaults
  const resetToDefaults = useCallback(async () => {
    const defaultPrefs: DashboardPreferences = {
      visibleWidgets: filteredDefaults,
      widgetOrder: filteredDefaults,
      collapsedWidgets: [],
      widgetSizes: {},
    };
    setPreferences(defaultPrefs);
    saveToLocalStorage(defaultPrefs);
    await savePreferences(defaultPrefs);
  }, [filteredDefaults, saveToLocalStorage, savePreferences]);

  const value = useMemo(
    () => ({
      preferences,
      loading,
      error,
      isEditMode,
      setEditMode,
      updatePreferences,
      toggleWidget,
      toggleCollapse,
      reorderWidgets,
      updateWidgetSize,
      resetToDefaults,
    }),
    [preferences, loading, error, isEditMode, updatePreferences, toggleWidget, toggleCollapse, reorderWidgets, updateWidgetSize, resetToDefaults]
  );

  return (
    <DashboardPreferencesContext.Provider value={value}>
      {children}
    </DashboardPreferencesContext.Provider>
  );
}

/**
 * Hook to access shared dashboard preferences from context.
 * Must be used within a DashboardPreferencesProvider.
 */
export function useDashboardPreferencesContext() {
  const ctx = useContext(DashboardPreferencesContext);
  if (!ctx) {
    throw new Error('useDashboardPreferencesContext must be used within DashboardPreferencesProvider');
  }
  return ctx;
}
