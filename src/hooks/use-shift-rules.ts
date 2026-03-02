import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { ShiftRules, DEFAULT_SHIFT_RULES } from '@/types/teamly-settings';

/**
 * Hook to fetch shift rules for the current company
 * Returns defaults if no rules exist in database
 */
export function useShiftRules() {
  const { companyId } = useAppContext();
  
  return useQuery({
    queryKey: ['shift-rules', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('teamly_shift_rules')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }
      
      // Return defaults merged with any existing data
      if (data) {
        return data as ShiftRules;
      }
      
      // Return defaults (will be created on first save)
      return {
        ...DEFAULT_SHIFT_RULES,
        company_id: companyId,
      } as Partial<ShiftRules>;
    },
    enabled: !!companyId,
  });
}

/**
 * Hook to update shift rules
 * Uses upsert to create or update
 */
export function useUpdateShiftRules() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rules: Partial<ShiftRules> & { company_id: string }) => {
      const { data, error } = await supabase
        .from('teamly_shift_rules')
        .upsert(
          { 
            ...rules, 
            updated_at: new Date().toISOString() 
          },
          { 
            onConflict: 'company_id',
            // Don't update created_at if it exists
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data as ShiftRules;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-rules', data.company_id] });
    },
  });
}

