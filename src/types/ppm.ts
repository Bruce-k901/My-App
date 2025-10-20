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
}