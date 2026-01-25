/**
 * Site Access Control Service
 * 
 * Determines which sites a user can access based on:
 * - Their home site (from profiles.home_site)
 * - Active employee_site_assignments (borrowed sites)
 * - Their role (admin/owner see all sites)
 * 
 * This service is the single source of truth for site access permissions.
 */

import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

/**
 * Represents a site that a user can access
 */
export interface AccessibleSite {
  id: string;
  name: string;
  is_home: boolean;
  borrowed_until?: string | null; // ISO date string or null for permanent
}

/**
 * User roles in the system
 * Note: These match the app_role enum values in the database
 */
export type UserRole = 
  | 'Staff' 
  | 'Manager' 
  | 'General Manager'
  | 'Area Manager'
  | 'Regional Manager'
  | 'Admin' 
  | 'Owner'
  | 'Super Admin';

/**
 * Get all sites a user can access
 * 
 * Logic:
 * 1. Always include home site
 * 2. Add borrowed sites from active employee_site_assignments
 * 3. If admin/owner: return ALL sites in their company
 * 4. If regional/area manager: return sites from org chart (TODO: implement)
 * 
 * @param userId - The user's profile ID
 * @returns Array of accessible sites
 */
export async function getUserAccessibleSites(
  userId: string
): Promise<AccessibleSite[]> {

  // Step 1: Get user's profile with home_site and role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, home_site, app_role, company_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Failed to fetch user profile: ${profileError?.message || "User not found"}`
    );
  }

  if (!profile.home_site) {
    throw new Error(
      `User ${userId} does not have a home site assigned. Please contact an administrator.`
    );
  }

  if (!profile.company_id) {
    throw new Error(
      `User ${userId} does not have a company assigned. Please contact an administrator.`
    );
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
    throw new Error(
      `Failed to fetch home site: ${homeSiteError?.message || "Home site not found"}`
    );
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
}

/**
 * Get user accessible site IDs (string array)
 * Returns just the site IDs based on user role hierarchy
 */
export async function getUserAccessibleSiteIds(userId: string): Promise<string[]> {
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, app_role, home_site, company_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('Error fetching user profile:', profileError)
    return []
  }

  // OWNER/ADMIN: See ALL company sites
  if (profile.app_role === 'Owner' || profile.app_role === 'Admin') {
    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .eq('company_id', profile.company_id)

    return sites?.map(s => s.id) || []
  }

  // REGIONAL MANAGER: Check if user manages any regions
  const { data: managedRegions } = await supabase
    .from('regions')
    .select('id')
    .eq('regional_manager_id', userId)

  if (managedRegions && managedRegions.length > 0) {
    const regionIds = managedRegions.map(r => r.id)

    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .in('region_id', regionIds)

    return sites?.map(s => s.id) || []
  }

  // AREA MANAGER: Check if user manages any areas
  const { data: managedAreas } = await supabase
    .from('areas')
    .select('id')
    .eq('area_manager_id', userId)

  if (managedAreas && managedAreas.length > 0) {
    const areaIds = managedAreas.map(a => a.id)

    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .in('area_id', areaIds)

    return sites?.map(s => s.id) || []
  }

  // MANAGER/STAFF: Get home site + borrowed sites (use existing function)
  const sites = await getUserAccessibleSites(userId)
  return sites.map(site => site.id)
}

/**
 * Get the default site ID to show on login
 * 
 * Logic:
 * - Admin/Owner: return 'all' (to show all sites view)
 * - Regional/Area Manager: return their region/area view (TODO)
 * - Everyone else: return home_site_id
 * 
 * @param userId - The user's profile ID
 * @returns Default site ID or 'all' for admins
 */
export async function getDefaultSiteId(
  userId: string
): Promise<string | "all"> {

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, home_site, app_role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Failed to fetch user profile: ${profileError?.message || "User not found"}`
    );
  }

  if (!profile.home_site) {
    throw new Error(
      `User ${userId} does not have a home site assigned. Please contact an administrator.`
    );
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
}

/**
 * Check if a user can access a specific site
 * 
 * @param userId - The user's profile ID
 * @param siteId - The site ID to check (or 'all' for admin view)
 * @returns true if user can access the site
 */
export async function canAccessSite(
  userId: string,
  siteId: string | "all"
): Promise<boolean> {
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
  const accessibleSites = await getUserAccessibleSites(userId);
  return accessibleSites.some((site) => site.id === siteId);
}
