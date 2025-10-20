import { supabase } from "@/lib/supabase";

export interface AssetRecord {
  id: string;
  name: string;
  asset_code: string | null;
  category: string | null;
  site_id: string;
  site_name: string | null;
  company_id: string;
  contractor_id: string | null;
  contractor_name: string | null;
  ppm_id: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  frequency_months: number | null;
  ppm_status: string | null;
  ppm_notes: string | null;
}

export async function fetchAllAssets(companyId: string): Promise<AssetRecord[]> {
  const { data, error } = await supabase
    .from("assets_redundant")
    .select(`
      id,
      label,
      asset_code,
      category_id,
      site_id,
      company_id,
      sites_redundant(
        id,
        name
      ),
      ppm_schedule(
        id,
        contractor_id,
        last_service_date,
        next_service_date,
        frequency_months,
        status,
        notes,
        contractors(
          id,
          name
        )
      )
    `)
    .eq("company_id", companyId)
    .order("label", { ascending: true });

  if (error) {
    console.error("Error fetching assets:", error);
    return [];
  }

  // Transform the data to include joined information
  const formatted = data?.map((item: any) => {
    const ppmSchedule = item.ppm_schedule?.[0]; // Get first PPM schedule if exists
    
    return {
      id: item.id,
      name: item.label,
      asset_code: item.asset_code,
      category: item.category_id, // Map category_id to category for interface compatibility
      site_id: item.site_id,
      site_name: item.sites?.name || null,
      company_id: item.company_id,
      contractor_id: ppmSchedule?.contractor_id || null,
      contractor_name: ppmSchedule?.contractors?.name || null,
      ppm_id: ppmSchedule?.id || null,
      last_service_date: ppmSchedule?.last_service_date || null,
      next_service_date: ppmSchedule?.next_service_date || null,
      frequency_months: ppmSchedule?.frequency_months || null,
      ppm_status: ppmSchedule?.status || null,
      ppm_notes: ppmSchedule?.notes || null,
    };
  }) || [];

  return formatted;
}