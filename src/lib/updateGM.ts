import { supabase } from "@/lib/supabase";

/**
 * Shared helper function to update GM link for a site
 * This is the single source of truth for all GM updates
 */
export async function updateGM(siteId: string, gmId: string) {
  const { error } = await supabase.rpc("update_gm_link", {
    p_site_id: siteId,
    p_gm_id: gmId,
  });
  
  if (error) {
    throw error;
  }
  
  return true;
}