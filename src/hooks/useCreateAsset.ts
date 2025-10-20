'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/ToastProvider';

interface CreateAssetParams {
  company_id: string;
  site_id?: string | null;
  type: string;
  label: string;
  model?: string | null;
  serial_number?: string | null;
  category_id?: string | null;
  date_of_purchase?: string | null;
  warranty_length_years?: number;
  warranty_callout_info?: string | null;
  contractor_id?: string | null;
  add_to_ppm?: boolean;
  ppm_services_per_year?: number;
  document_url?: string | null;
}

export function useCreateAsset() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const createAsset = async (asset: CreateAssetParams) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('create_asset_with_ppm', {
      p_company_id: asset.company_id,
      p_site_id: asset.site_id ?? null,
      p_type: asset.type,
      p_item_name: asset.label,
      p_model: asset.model ?? null,
      p_serial_number: asset.serial_number ?? null,
      p_category_id: asset.category_id ?? null,
      p_date_of_purchase: asset.date_of_purchase || null,
      p_warranty_length_years: Number(asset.warranty_length_years) || 0,
      p_warranty_callout_info: asset.warranty_callout_info ?? null,
      p_contractor_id: asset.contractor_id ?? null,
      p_add_to_ppm: Boolean(asset.add_to_ppm),
      p_ppm_services_per_year: asset.add_to_ppm ? (Number(asset.ppm_services_per_year) || 1) : null,
      p_document_url: asset.document_url ?? null,
    });

    console.group("createAsset RPC response");
    console.log("data:", data);
    console.log("error:", error);
    console.groupEnd();

    if (error) {
      console.error('Error creating asset (raw):', error);
      console.error('Error creating asset (stringified):', JSON.stringify(error, null, 2));
      showToast({ title: 'Save failed', description: error.message || 'Could not save asset', type: 'error' });
    } else {
      console.log("Asset created successfully, ID:", data);
      // Success toast handled by the calling form for consistent UX.
    }
    setLoading(false);
    return { data, error };
  };

  return { createAsset, loading };
}

export default useCreateAsset;
