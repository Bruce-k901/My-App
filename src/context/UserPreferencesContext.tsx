'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabaseClient';
import type { UserPreferences } from '@/types/user-preferences';
import { DEFAULT_USER_PREFERENCES } from '@/types/user-preferences';

const STORAGE_KEY = 'opsly_user_preferences';
const DEBOUNCE_MS = 400;

// Deep merge helper — merges b into a, preferring b values where present
function deepMerge<T extends Record<string, any>>(a: T, b: Partial<T>): T {
  const result = { ...a } as any;
  for (const key in b) {
    if (
      b[key] !== undefined &&
      b[key] !== null &&
      typeof b[key] === 'object' &&
      !Array.isArray(b[key]) &&
      typeof a[key] === 'object' &&
      !Array.isArray(a[key])
    ) {
      result[key] = deepMerge(a[key], b[key] as any);
    } else if (b[key] !== undefined) {
      result[key] = b[key];
    }
  }
  return result;
}

// Apply CSS classes on <html> — MUST only be called from useEffect, never during render
function applyCSSEffects(prefs: UserPreferences) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  // Density
  root.classList.toggle('compact', prefs.density === 'compact');

  // Font size
  root.classList.remove('font-size-small', 'font-size-large');
  if (prefs.font_size === 'small') root.classList.add('font-size-small');
  else if (prefs.font_size === 'large') root.classList.add('font-size-large');

  // Reduce animations
  if (prefs.reduce_animations) {
    root.classList.add('reduce-motion');
    root.classList.remove('reduce-motion-off');
  } else {
    root.classList.remove('reduce-motion');
    root.classList.add('reduce-motion-off');
  }

  // High contrast
  root.classList.toggle('high-contrast', prefs.high_contrast === 'high');

  // Theme (system/light/dark)
  const theme = prefs.theme ?? 'dark';
  let resolvedTheme: 'light' | 'dark' = 'dark';
  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } else {
    resolvedTheme = theme;
  }
  root.classList.remove('dark', 'light');
  root.classList.add(resolvedTheme);
  try { localStorage.setItem('theme', theme); } catch {}
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetToDefaults: () => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  preferences: DEFAULT_USER_PREFERENCES,
  loading: true,
  updatePreference: () => {},
  updatePreferences: () => {},
  resetToDefaults: () => {},
});

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { userId, companyId } = useAppContext();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  // Mark as mounted — no DOM/localStorage access before this
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    if (!mounted) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserPreferences>;
        const merged = deepMerge(DEFAULT_USER_PREFERENCES as any, parsed) as UserPreferences;
        setPreferences(merged);
      }
    } catch {
      // ignore
    }
  }, [mounted]);

  // Fetch from Supabase once auth is ready
  useEffect(() => {
    if (!mounted || !userId || !companyId) {
      if (mounted) setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', userId)
          .eq('company_id', companyId)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
          console.error('Failed to load user preferences:', error.message);
        }

        if (data?.preferences) {
          const merged = deepMerge(
            DEFAULT_USER_PREFERENCES as any,
            data.preferences as Partial<UserPreferences>,
          ) as UserPreferences;
          setPreferences(merged);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
        } else {
          // No row — seed from defaults + any existing localStorage theme
          let existingTheme: string | null = null;
          try { existingTheme = localStorage.getItem('theme'); } catch {}
          const seed: UserPreferences = {
            ...DEFAULT_USER_PREFERENCES,
            ...(existingTheme === 'light' || existingTheme === 'dark'
              ? { theme: existingTheme }
              : {}),
          };
          setPreferences(seed);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch {}

          // Create row in background (silently)
          supabase
            .from('user_preferences')
            .upsert(
              { user_id: userId, company_id: companyId, preferences: seed },
              { onConflict: 'user_id,company_id' },
            )
            .then(({ error: upsertErr }) => {
              if (upsertErr && upsertErr.code !== '42P01') {
                console.error('Failed to seed user preferences:', upsertErr.message);
              }
            });
        }
      } catch {
        // Silently fail — defaults are fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [mounted, userId, companyId]);

  // === KEY FIX: Apply CSS side-effects in a dedicated effect that watches preferences ===
  // This ensures DOM mutations never happen inside state setters (which causes render loops)
  useEffect(() => {
    if (!mounted) return;
    applyCSSEffects(preferences);
  }, [mounted, preferences]);

  // Listen for system theme changes when theme='system'
  useEffect(() => {
    if (!mounted || preferences.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyCSSEffects(prefsRef.current);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mounted, preferences.theme]);

  const persistToSupabase = useCallback(
    (updated: UserPreferences) => {
      if (!userId || !companyId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        supabase
          .from('user_preferences')
          .upsert(
            { user_id: userId, company_id: companyId, preferences: updated },
            { onConflict: 'user_id,company_id' },
          )
          .then(({ error }) => {
            if (error && error.code !== '42P01') {
              console.error('Failed to save preferences:', error.message);
            }
          });
      }, DEBOUNCE_MS);
    },
    [userId, companyId],
  );

  // Pure state setters — no DOM mutations here, CSS effects handled by the useEffect above
  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => {
        const updated = { ...prev, [key]: value };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
        persistToSupabase(updated);
        return updated;
      });
    },
    [persistToSupabase],
  );

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const updated = deepMerge(prev as any, updates) as UserPreferences;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
        persistToSupabase(updated);
        return updated;
      });
    },
    [persistToSupabase],
  );

  const resetToDefaults = useCallback(() => {
    const defaults = DEFAULT_USER_PREFERENCES as UserPreferences;
    setPreferences(defaults);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); } catch {}
    persistToSupabase(defaults);
  }, [persistToSupabase]);

  return (
    <UserPreferencesContext.Provider
      value={{ preferences, loading, updatePreference, updatePreferences, resetToDefaults }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}
