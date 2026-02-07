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
      setLoading(false);
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
        // Silently handle if table doesn't exist
        if (queryError.code === '42P01') {
          console.debug('company_modules table does not exist yet');
          setModules([]);
        } else {
          throw queryError;
        }
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

    // Add modules from database
    modules.forEach((m) => {
      if (m.is_enabled) {
        const mappedModule = MODULE_MAPPING[m.module];
        if (mappedModule) {
          enabled.add(mappedModule);
        }
      }
    });

    // If no modules configured yet, enable common defaults
    if (modules.length === 0 && !loading) {
      enabled.add('checkly');
    }

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
