'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { Database } from '@/lib/database.types';

type AssetInsert = Database['public']['Tables']['assets']['Insert'];

interface CreateAssetParams extends AssetInsert {
  // Keep the interface for backward compatibility
}

export function useCreateAsset() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const createAsset = async (asset: CreateAssetParams) => {
    setLoading(true);
    
    try {
      // Get default contractors if site_id and category are provided
      let defaultContractors = null;
      if (asset.site_id && asset.category) {
        const { data: defaults } = await supabase.rpc('assign_default_contractors', {
          p_site_id: asset.site_id,
          p_category: asset.category
        });
        defaultContractors = defaults?.[0];
      }
      
      // Normalize status to ensure it's lowercase and valid
      const normalizeStatus = (status: string | undefined | null): string => {
        if (!status || typeof status !== 'string') return 'active';
        const normalized = status.toLowerCase().trim();
        const validStatuses = ['active', 'inactive', 'maintenance', 'retired'];
        return validStatuses.includes(normalized) ? normalized : 'active';
      };
      
      // Merge default contractors with asset data
      const assetData = {
        ...asset,
        status: normalizeStatus(asset.status), // Ensure status is always valid and lowercase
        ppm_contractor_id: asset.ppm_contractor_id || defaultContractors?.ppm_contractor_id || null,
        reactive_contractor_id: asset.reactive_contractor_id || defaultContractors?.reactive_contractor_id || null,
        warranty_contractor_id: asset.warranty_contractor_id || defaultContractors?.warranty_contractor_id || null,
      };
      
      // Debug: log the final asset data
      console.log('Final asset data being inserted:', assetData);
      
      const { data, error } = await supabase
        .from('assets')
        .insert(assetData)
        .select()
        .single();

      console.group("createAsset response");
      console.log("data:", data);
      console.log("error:", error);
      console.log("defaultContractors:", defaultContractors);
      console.groupEnd();

      if (error) {
        console.error('Error creating asset:', error);
        showToast({ title: 'Save failed', description: error.message || 'Could not save asset', type: 'error' });
      } else {
        console.log("Asset created successfully, ID:", data?.id);
      }
      
      return { data, error };
    } catch (error) {
      console.error('Error in createAsset:', error);
      showToast({ title: 'Save failed', description: 'Could not save asset', type: 'error' });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  return { createAsset, loading };
}

export default useCreateAsset;
