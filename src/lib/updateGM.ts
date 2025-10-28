import { supabase } from "@/lib/supabase";

/**
 * Shared helper function to update GM link for a site
 * This is the single source of truth for all GM updates
 * Updates sites, profiles, and gm_index tables to maintain consistency
 */
export async function updateGM(siteId: string, gmId: string | null) {
  try {
    // Step 1: Update the sites table with the new GM (or null to remove)
    const { error: sitesError } = await supabase
      .from("sites")
      .update({ gm_user_id: gmId })
      .eq("id", siteId);
    
    if (sitesError) {
      throw new Error(`Failed to update site: ${sitesError.message}`);
    }

    // Step 2: If a GM is assigned, update their profile to set their home_site
    if (gmId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ site_id: siteId })
        .eq("id", gmId);
      
      if (profileError) {
        throw new Error(`Failed to update GM profile: ${profileError.message}`);
      }

      // Step 3: Update gm_index table to ensure site cards reflect changes immediately
      const { error: gmIndexError } = await supabase
        .from("gm_index")
        .update({ home_site: siteId })
        .eq("id", gmId);
      
      if (gmIndexError) {
        console.warn(`Failed to update gm_index: ${gmIndexError.message}`);
        // Don't throw error here as gm_index might be a view or auto-updated
      }
      
      console.log(`Successfully updated GM assignment: Site ${siteId} -> GM ${gmId}`);
    } else {
      console.log(`Successfully removed GM assignment from site: ${siteId}`);
    }

    return true;
  } catch (error) {
    console.error("Error updating GM assignment:", error);
    throw error;
  }
}