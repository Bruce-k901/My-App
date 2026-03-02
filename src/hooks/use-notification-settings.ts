import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { NotificationType, NotificationSetting } from '@/types/teamly-settings';

/**
 * Hook to fetch all notification types (reference table)
 * These are the available notification types that can be configured
 */
export function useNotificationTypes() {
  return useQuery({
    queryKey: ['notification-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teamly_notification_types')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as NotificationType[];
    },
  });
}

/**
 * Hook to fetch notification settings for the current company
 * Returns array of settings (one per notification type)
 */
export function useNotificationSettings() {
  const { companyId } = useAppContext();
  
  return useQuery({
    queryKey: ['notification-settings', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('teamly_notification_settings')
        .select('*')
        .eq('company_id', companyId);
      
      if (error) throw error;
      return (data || []) as NotificationSetting[];
    },
    enabled: !!companyId,
  });
}

/**
 * Hook to get a specific notification setting by type
 * Returns the setting if it exists, or null if using defaults
 */
export function useNotificationSetting(notificationType: string) {
  const { companyId } = useAppContext();
  const { data: settings } = useNotificationSettings();
  
  return settings?.find(s => s.notification_type === notificationType) || null;
}

/**
 * Hook to update a notification setting
 * Uses upsert to create or update
 */
export function useUpdateNotificationSetting() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (setting: Partial<NotificationSetting> & { 
      company_id: string; 
      notification_type: string;
    }) => {
      const { data, error } = await supabase
        .from('teamly_notification_settings')
        .upsert(
          { 
            ...setting, 
            updated_at: new Date().toISOString() 
          },
          { 
            onConflict: 'company_id,notification_type',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data as NotificationSetting;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['notification-settings', data.company_id] 
      });
    },
  });
}

/**
 * Hook to update multiple notification settings at once
 * Useful for bulk updates
 */
export function useUpdateNotificationSettings() {
  const { companyId } = useAppContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Array<Partial<NotificationSetting> & { 
      company_id: string; 
      notification_type: string;
    }>) => {
      const updates = settings.map(s => ({
        ...s,
        updated_at: new Date().toISOString(),
      }));
      
      const { data, error } = await supabase
        .from('teamly_notification_settings')
        .upsert(updates, { 
          onConflict: 'company_id,notification_type',
          ignoreDuplicates: false,
        })
        .select();
      
      if (error) throw error;
      return data as NotificationSetting[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ 
          queryKey: ['notification-settings', data[0].company_id] 
        });
      }
    },
  });
}

