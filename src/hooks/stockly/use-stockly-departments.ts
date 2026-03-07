import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useStocklyDepartments(companyId: string | undefined) {
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (!companyId) return;

    supabase
      .from('company_modules')
      .select('settings')
      .eq('company_id', companyId)
      .eq('module', 'stockly')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[useStocklyDepartments] error:', error.message);
          return;
        }
        const deps = data?.settings?.departments || [];
        setDepartments(deps);
      });
  }, [companyId]);

  return departments;
}
