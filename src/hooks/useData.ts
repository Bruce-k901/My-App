import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/AppContext';

// ============================================
// SITES
// ============================================
export function useSites() {
  const { profile } = useUser();

  return useQuery({
    queryKey: ['sites', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('company_id', profile?.company_id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
}

export function useSite(siteId?: string) {
  return useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      if (!siteId) throw new Error('Site ID required');

      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!siteId,
  });
}

// ============================================
// ASSETS
// ============================================
export function useAssets(siteId?: string) {
  const { profile } = useUser();

  return useQuery({
    queryKey: ['assets', siteId || profile?.site_id],
    queryFn: async () => {
      let query = supabase.from('assets').select('*');

      const targetSiteId = siteId || profile?.site_id;
      if (targetSiteId) {
        query = query.eq('site_id', targetSiteId);
      }

      query = query.order('name');

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(siteId || profile?.site_id),
  });
}

export function useAsset(assetId?: string) {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID required');

      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!assetId,
  });
}

// ============================================
// CONTRACTORS
// ============================================
export function useContractors() {
  const { profile } = useUser();

  return useQuery({
    queryKey: ['contractors', profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('company_id', profile?.company_id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
}

// ============================================
// TASKS
// ============================================
export function useTasks(filters?: {
  siteId?: string;
  status?: string;
  date?: string;
}) {
  const { profile } = useUser();

  return useQuery({
    queryKey: ['tasks', profile?.company_id, filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('company_id', profile?.company_id);

      if (filters?.siteId) {
        query = query.eq('site_id', filters.siteId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.date) {
        query = query.gte('due_date', filters.date);
      }

      query = query.order('due_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
}

// ============================================
// CHECKLIST TEMPLATES
// ============================================
export function useChecklistTemplates() {
  const { profile } = useUser();

  return useQuery({
    queryKey: ['checklist_templates', profile?.company_id, profile?.site_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('company_id', profile?.company_id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
}

// ============================================
// MUTATIONS (Create/Update/Delete)
// ============================================

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newAsset: any) => {
      const { data, error } = await supabase
        .from('assets')
        .insert(newAsset)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate assets query to refetch
      queryClient.invalidateQueries({ queryKey: ['assets', data.site_id] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate both the list and the single asset
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', data.id] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assets').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      // Invalidate assets query to refetch
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

// ============================================
// EXAMPLE USAGE IN A COMPONENT
// ============================================
/*
import { useAssets, useCreateAsset } from '@/hooks/useData';

export default function AssetsPage() {
  const { data: assets, isLoading, error } = useAssets();
  const createAsset = useCreateAsset();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  const handleCreate = async (newAsset) => {
    await createAsset.mutateAsync(newAsset);
  };

  return (
    <div>
      {assets?.map(asset => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
*/
