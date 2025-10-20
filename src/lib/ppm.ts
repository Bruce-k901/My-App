import { supabase } from "@/lib/supabase"

// Insert a new service record
export async function logServiceEvent({
  ppm_id,
  asset_id,
  contractor_id,
  service_date,
  notes,
  file_url,
  user_id
}: {
  ppm_id: string
  asset_id: string
  contractor_id?: string
  service_date: string
  notes?: string
  file_url?: string
  user_id: string
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
        created_by: user_id
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Update ppm_schedule after a service
export async function updatePPMSchedule(ppm_id: string, service_date: string) {
  const nextService = new Date(service_date)
  nextService.setMonth(nextService.getMonth() + 6)

  const { error } = await supabase
    .from("ppm_schedule")
    .update({
      last_service_date: service_date,
      next_service_date: nextService.toISOString().split("T")[0],
      status: "upcoming"
    })
    .eq("id", ppm_id)

  if (error) throw error
}