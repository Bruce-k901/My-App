export interface PPMAsset {
  ppm_id: string | null;
  id: string;
  name: string;
  category_name: string | null;
  site_id: string | null;
  site_name: string | null;
  contractor_id: string | null;
  contractor_name: string | null;
  frequency_months: number | null;
  last_service_date: string | null;
  next_service_date: string | null;
  ppm_status: string | null;
  ppm_notes: string | null;
  ppm_group_id: string | null;
  ppm_group_name: string | null;
}

export interface PPMGroup {
  id: string;
  company_id: string;
  site_id: string;
  site_name: string | null;
  name: string;
  description: string | null;
  ppm_contractor_id: string | null;
  ppm_contractor_name: string | null;
  ppm_frequency_months: number | null;
  last_service_date: string | null;
  next_service_date: string | null;
  ppm_status: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  asset_count: number;
  assets: PPMGroupAsset[];
}

export interface PPMGroupAsset {
  id: string;
  ppm_group_id: string;
  asset_id: string;
  asset_name: string;
  asset_category: string | null;
  added_at: string;
}

export interface PPMGroupFormData {
  name: string;
  description: string;
  site_id: string;
  ppm_contractor_id: string;
  ppm_contractor_name: string;
  ppm_frequency_months: number | null;
  next_service_date: string;
  asset_ids: string[];
}