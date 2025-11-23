import { supabase } from "@/lib/supabase";

// Insert a new service record
export async function logServiceEvent({
  ppm_id,
  asset_id,
  contractor_id,
  service_date,
  notes,
  file_url,
  user_id,
}: {
  ppm_id: string;
  asset_id: string;
  contractor_id?: string;
  service_date: string;
  notes?: string;
  file_url?: string;
  user_id: string;
}) {
  const { data, error } = await supabase
    .from("ppm_service_events")
    .insert([
      {
        ppm_id,
        asset_id,
        contractor_id,
        service_date,
        notes,
        file_url,
        created_by: user_id,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update ppm_schedule and assets after a service
export async function updatePPMSchedule(
  ppm_id: string,
  asset_id: string,
  service_date: string,
) {
  const nextService = new Date(service_date);
  nextService.setMonth(nextService.getMonth() + 6);
  const nextServiceString = nextService.toISOString().split("T")[0];

  // Note: ppm_schedule table structure may vary
  // Try to update it if it has the columns, but don't fail if it doesn't
  try {
    await supabase
      .from("ppm_schedule")
      .update({
        last_service_date: service_date,
        next_service_date: nextServiceString,
        status: "upcoming",
      })
      .eq("id", ppm_id);
  } catch (scheduleError) {
    console.warn(
      "Could not update ppm_schedule (table may not have these columns):",
      scheduleError,
    );
    // Don't throw - this is optional
  }

  // CRITICAL: Update the assets table to prevent duplicate task generation
  // The Edge Function checks assets.last_service_date and assets.next_service_date
  const { error: assetError } = await supabase
    .from("assets")
    .update({
      last_service_date: service_date,
      next_service_date: nextServiceString,
    })
    .eq("id", asset_id);

  if (assetError) {
    console.error("Failed to update asset service dates:", assetError);
    throw assetError; // This one is critical, so throw
  }
}
