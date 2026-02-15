/**
 * Site Access Control Service - Client Side
 * 
 * Client-side versions of site access functions that use the browser Supabase client.
 * These functions handle errors gracefully and return fallback values instead of throwing.
 * 
 * Used by client components (React Context, hooks, etc.)
 */

import { supabase } from "@/lib/supabase";
import type { AccessibleSite, UserRole } from "./site-access";

/**
 * Get all sites a user can access (client-side)
 * 
 * Returns empty array on error instead of throwing.
 * 
 * @param userId - The user's profile ID
 * @returns Array of accessible sites, or empty array on error
 */
export async function getUserAccessibleSitesClient(
  userId: string
): Promise<AccessibleSite[]> {
  try {
    // Step 1: Get user's profile with home_site and role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, home_site, app_role, company_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch user profile:", profileError);
      return [];
    }

    if (!profile.home_site) {
      console.warn(`User ${userId} does not have a home site assigned.`);
      return [];
    }

    if (!profile.company_id) {
      console.warn(`User ${userId} does not have a company assigned.`);
      return [];
    }

    const userRole = (profile.app_role || "Staff") as UserRole;
    const accessibleSites: AccessibleSite[] = [];

    // Step 2: Get home site details
    const { data: homeSite, error: homeSiteError } = await supabase
      .from("sites")
      .select("id, name")
      .eq("id", profile.home_site)
      .single();

    if (homeSiteError || !homeSite) {
      console.error("Failed to fetch home site:", homeSiteError);
      return [];
    }

    // Always include home site first
    accessibleSites.push({
      id: homeSite.id,
      name: homeSite.name,
      is_home: true,
    });

    // Step 3: Check if user is admin/owner - return all sites
    const isAdminOrOwner = 
      userRole === "Admin" || 
      userRole === "Owner" || 
      userRole === "Super Admin";

    if (isAdminOrOwner) {
      // Fetch all sites for the company
      const { data: allSites, error: allSitesError } = await supabase
        .from("sites")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .order("name");

      if (allSitesError) {
        console.error("Error fetching all sites:", allSitesError);
        // Continue with just home site if error
        return accessibleSites;
      }

      // Replace accessibleSites with all sites, but mark home site
      const allSitesList: AccessibleSite[] = (allSites || []).map((site) => ({
        id: site.id,
        name: site.name,
        is_home: site.id === profile.home_site,
      }));

      // Sort: home site first, then alphabetically
      return allSitesList.sort((a, b) => {
        if (a.is_home) return -1;
        if (b.is_home) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    // Step 4: Check for regional/area manager (TODO: implement org chart hierarchy)
    // For now, they only see their home site + borrowed sites
    const isRegionalOrAreaManager = 
      userRole === "Regional Manager" || 
      userRole === "Area Manager";

    if (isRegionalOrAreaManager) {
      // TODO: Query org chart hierarchy to get sites in their region/area
      // For now, fall through to borrowed sites logic
    }

    // Step 5: Get active borrowed site assignments
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    const { data: assignments, error: assignmentsError } = await supabase
      .from("employee_site_assignments")
      .select(`
        borrowed_site_id,
        end_date,
        sites:borrowed_site_id (
          id,
          name
        )
      `)
      .eq("profile_id", userId)
      .eq("is_active", true)
      .lte("start_date", today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("start_date", { ascending: false });

    if (assignmentsError) {
      console.error("Error fetching site assignments:", assignmentsError);
      // Continue with just home site if error
      return accessibleSites;
    }

    // Step 6: Add borrowed sites to accessible list
    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        // Skip if this is the home site (already added)
        if (assignment.borrowed_site_id === profile.home_site) {
          continue;
        }

        // Handle nested site data (Supabase returns it as an object for foreign key relations)
        const site = assignment.sites;
        if (site && typeof site === "object" && !Array.isArray(site)) {
          // Type guard: check if it has the expected properties
          if ("id" in site && "name" in site && typeof site.id === "string" && typeof site.name === "string") {
            accessibleSites.push({
              id: site.id,
              name: site.name,
              is_home: false,
              borrowed_until: assignment.end_date || null,
            });
          }
        }
      }
    }

    // Step 7: Sort - home first, then borrowed sites alphabetically
    return accessibleSites.sort((a, b) => {
      if (a.is_home) return -1;
      if (b.is_home) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Unexpected error in getUserAccessibleSitesClient:", error);
    return [];
  }
}

/**
 * Get the default site ID to show on login (client-side)
 * 
 * Returns home_site on error instead of throwing.
 * 
 * @param userId - The user's profile ID
 * @returns Default site ID or 'all' for admins, or home_site on error
 */
export async function getDefaultSiteIdClient(
  userId: string
): Promise<string | "all"> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, home_site, app_role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch user profile:", profileError);
      return "all"; // Fallback to 'all' on error
    }

    if (!profile.home_site) {
      console.warn(`User ${userId} does not have a home site assigned.`);
      return "all"; // Fallback to 'all' on error
    }

    const userRole = (profile.app_role || "Staff") as UserRole;

    // Admin/Owner see "all sites" by default
    if (
      userRole === "Admin" ||
      userRole === "Owner" ||
      userRole === "Super Admin"
    ) {
      return "all";
    }

    // TODO: Regional/Area Manager - return region/area view
    // For now, return home site

    // Everyone else sees their home site
    return profile.home_site;
  } catch (error) {
    console.error("Unexpected error in getDefaultSiteIdClient:", error);
    return "all"; // Fallback to 'all' on error
  }
}

/**
 * Check if a user can access a specific site (client-side)
 * 
 * @param userId - The user's profile ID
 * @param siteId - The site ID to check (or 'all' for admin view)
 * @returns true if user can access the site, false on error
 */
export async function canAccessSiteClient(
  userId: string,
  siteId: string | "all"
): Promise<boolean> {
  try {
    // 'all' is only accessible to admins/owners
    if (siteId === "all") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("app_role")
        .eq("id", userId)
        .single();

      if (!profile) return false;

      const userRole = (profile.app_role || "Staff") as UserRole;
      return (
        userRole === "Admin" ||
        userRole === "Owner" ||
        userRole === "Super Admin"
      );
    }

    // Get accessible sites and check if siteId is in the list
    const accessibleSites = await getUserAccessibleSitesClient(userId);
    return accessibleSites.some((site) => site.id === siteId);
  } catch (error) {
    console.error("Unexpected error in canAccessSiteClient:", error);
    return false;
  }
}
