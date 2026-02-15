import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { GeneralSettings, DEFAULT_GENERAL_SETTINGS } from '@/types/general-settings';

export function useGeneralSettings() {
  const { companyId } = useAppContext();
  
  return useQuery({
    queryKey: ['general-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('general_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // Return defaults merged with existing data if it exists
      if (data) {
        return data as GeneralSettings;
      }
      
      // Return defaults if no row exists
      return {
        ...DEFAULT_GENERAL_SETTINGS,
        company_id: companyId,
      } as Partial<GeneralSettings>;
    },
    enabled: !!companyId,
  });
}

export function useUpdateGeneralSettings() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<GeneralSettings> & { company_id: string }) => {
      const { data, error } = await supabase
        .from('general_settings')
        .upsert(
          {
            ...settings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'company_id',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data as GeneralSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['general-settings', data.company_id] });
    },
  });
}

