import { supabase } from "@/lib/supabase";

export interface AssetRecord {
  id: string;
  name: string;
  model: string | null;
  serial_number: string | null;
  brand: string | null;
  category: string | null;
  site_id: string;
  site_name: string | null;
  company_id: string;
  contractor_id: string | null;
  contractor_name: string | null;
  install_date: string | null;
  next_service_date: string | null;
  warranty_end: string | null;
  status: string | null;
  notes: string | null;
  // PPM-related properties
  ppm_id: string | null;
  frequency_months: number | null;
  last_service_date: string | null;
  ppm_status: string | null;
  ppm_notes: string | null;
}

export async function fetchAllAssets(companyId: string): Promise<AssetRecord[]> {
  const { data, error } = await supabase
    .from("assets")
    .select(`
      id,
      name,
      model,
      serial_number,
      brand,
      category,
      contractor:contractors(id, name, phone, email),
      site:sites(id, name),
      install_date,
      next_service_date,
      warranty_end,
      status,
      notes,
      ppm_frequency_months,
      last_service_date,
      ppm_status,
      ppm_contractor_id,
      ppm_contractor:ppm_contractor_id(id, name)
    `)
    .eq("company_id", companyId)
    .eq("archived", false) // Exclude archived assets
    .order("name");

  if (error) {
    console.error("Error fetching assets:", error);
    return [];
  }

  // Transform the data to include joined information
  const formatted = data?.map((item: any) => {
    return {
      id: item.id,
      name: item.name,
      model: item.model || null,
      serial_number: item.serial_number || null,
      brand: item.brand || null,
      category: item.category,
      site_id: item.site?.id || null,
      site_name: item.site?.name || null,
      company_id: companyId,
      contractor_id: item.contractor?.id || null,
      contractor_name: item.contractor?.name || null,
      install_date: item.install_date || null,
      next_service_date: item.next_service_date || null,
      warranty_end: item.warranty_end || null,
      status: item.status || null,
      notes: item.notes || null,
      // PPM-related properties
      ppm_id: item.ppm_contractor_id || null,
      frequency_months: item.ppm_frequency_months || null,
      last_service_date: item.last_service_date || null,
      ppm_status: item.ppm_status || null,
      ppm_notes: null, // This field doesn't exist in assets table yet
    };
  }) || [];

  return formatted;
}