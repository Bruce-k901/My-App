'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { ModuleId } from '@/types/dashboard';

interface CompanyModule {
  module: string;
  is_enabled: boolean;
}

/**
 * Module mapping from database values to our ModuleId type
 * Some modules may have different names in the database
 */
const MODULE_MAPPING: Record<string, ModuleId> = {
  checkly: 'checkly',
  stockly: 'stockly',
  peoply: 'teamly', // 'peoply' in DB maps to 'teamly' in UI
  teamly: 'teamly',
  planly: 'planly',
  assetly: 'assetly',
  msgly: 'msgly',
};

/**
 * Modules that are always enabled (not managed via company_modules table yet)
 */
const ALWAYS_ENABLED_MODULES: ModuleId[] = ['assetly', 'msgly'];

/**
 * Hook to get enabled modules for the current company
 * Returns array of enabled ModuleId values
 */
export function useEnabledModules(): {
  enabledModules: ModuleId[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { companyId } = useAppContext();
  const [modules, setModules] = useState<CompanyModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModules = async () => {
    if (!companyId) {
      // Don't set loading=false yet — wait for companyId to arrive
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('company_modules')
        .select('module, is_enabled')
        .eq('company_id', companyId);

      if (queryError) {
        // Silently handle if table doesn't exist or any DB error
        console.debug('company_modules query issue:', queryError.code || queryError.message);
        setModules([]);
      } else {
        setModules(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching company modules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [companyId]);

  const enabledModules = useMemo(() => {
    // Start with always-enabled modules
    const enabled = new Set<ModuleId>(ALWAYS_ENABLED_MODULES);

    // All core reportable modules — enabled by default unless explicitly disabled
    const coreModules: ModuleId[] = ['checkly', 'stockly', 'teamly', 'planly'];

    // Build set of explicitly disabled modules from DB
    const explicitlyDisabled = new Set<ModuleId>();
    modules.forEach((m) => {
      const mappedModule = MODULE_MAPPING[m.module];
      if (mappedModule && !m.is_enabled) {
        explicitlyDisabled.add(mappedModule);
      }
    });

    // Enable core modules that aren't explicitly disabled
    coreModules.forEach((m) => {
      if (!explicitlyDisabled.has(m)) {
        enabled.add(m);
      }
    });

    return Array.from(enabled);
  }, [modules, loading]);

  return {
    enabledModules,
    loading,
    error,
    refetch: fetchModules,
  };
}

/**
 * Check if a specific module is enabled
 */
export function useIsModuleEnabled(moduleId: ModuleId): boolean {
  const { enabledModules, loading } = useEnabledModules();

  // While loading, assume module is enabled to prevent flash
  if (loading) return true;

  return enabledModules.includes(moduleId);
}
