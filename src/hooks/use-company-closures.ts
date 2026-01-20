import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { CompanyClosure } from '@/types/company-closures';

export function useCompanyClosures() {
  const { companyId } = useAppContext();
  
  return useQuery({
    queryKey: ['company-closures', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('company_closures')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('closure_start', { ascending: true });
      
      if (error) throw error;
      return (data || []) as CompanyClosure[];
    },
    enabled: !!companyId,
  });
}

export function useCreateCompanyClosure() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (closure: Omit<CompanyClosure, 'id' | 'created_at' | 'updated_at'>) => {
      if (!companyId) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('company_closures')
        .insert({
          ...closure,
          company_id: companyId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as CompanyClosure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-closures', companyId] });
    },
  });
}

export function useUpdateCompanyClosure() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompanyClosure> & { id: string }) => {
      const { data, error } = await supabase
        .from('company_closures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as CompanyClosure;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-closures', companyId] });
    },
  });
}

export function useDeleteCompanyClosure() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('company_closures')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-closures', companyId] });
    },
  });
}

