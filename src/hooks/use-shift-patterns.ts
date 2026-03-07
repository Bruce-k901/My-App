import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { ShiftPattern } from '@/types/teamly';

type ShiftPatternInsert = Omit<ShiftPattern, 'id' | 'total_hours' | 'created_at' | 'updated_at'>;
type ShiftPatternUpdate = Partial<Omit<ShiftPattern, 'id' | 'total_hours' | 'created_at' | 'updated_at'>>;

/**
 * Fetch active shift patterns for the current company
 */
export function useShiftPatterns() {
  const { companyId } = useAppContext();

  return useQuery({
    queryKey: ['shift-patterns', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('shift_patterns')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        // Table doesn't exist yet
        if (error.code === '42P01') return [];
        throw error;
      }

      return (data ?? []) as ShiftPattern[];
    },
    enabled: !!companyId,
  });
}

/**
 * Fetch ALL shift patterns (including inactive) for the settings page
 */
export function useAllShiftPatterns() {
  const { companyId } = useAppContext();

  return useQuery({
    queryKey: ['shift-patterns', companyId, 'all'],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('shift_patterns')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }

      return (data ?? []) as ShiftPattern[];
    },
    enabled: !!companyId,
  });
}

/**
 * Create a new shift pattern
 */
export function useCreateShiftPattern() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pattern: Omit<ShiftPatternInsert, 'company_id'>) => {
      if (!companyId) throw new Error('No company ID');

      const { data, error } = await supabase
        .from('shift_patterns')
        .insert({ ...pattern, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data as ShiftPattern;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-patterns', companyId] });
    },
  });
}

/**
 * Update an existing shift pattern
 */
export function useUpdateShiftPattern() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ShiftPatternUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('shift_patterns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ShiftPattern;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-patterns', companyId] });
    },
  });
}

/**
 * Soft-delete a shift pattern (set is_active = false)
 */
export function useDeleteShiftPattern() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_patterns')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-patterns', companyId] });
    },
  });
}

/**
 * Reorder shift patterns by updating sort_order values
 */
export function useReorderShiftPatterns() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      const updates = items.map(({ id, sort_order }) =>
        supabase
          .from('shift_patterns')
          .update({ sort_order, updated_at: new Date().toISOString() })
          .eq('id', id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-patterns', companyId] });
    },
  });
}
