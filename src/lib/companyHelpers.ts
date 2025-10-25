import { supabase } from "@/lib/supabase";

/**
 * Get the current user's company ID from their profile
 * This should be used instead of hardcoded company IDs
 */
export async function getCurrentUserCompanyId(): Promise<string> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      throw new Error("No active session found");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!profile?.company_id) {
      throw new Error("User profile does not have a company_id");
    }

    return profile.company_id;
  } catch (error) {
    console.error("Error getting company ID:", error);
    throw new Error(`Company ID not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the current user's company ID with fallback handling
 * Returns null if no company ID is found (useful for optional operations)
 */
export async function getCurrentUserCompanyIdOptional(): Promise<string | null> {
  try {
    return await getCurrentUserCompanyId();
  } catch (error) {
    console.warn("Company ID not available:", error);
    return null;
  }
}

/**
 * Validate that a company ID is provided and not the hardcoded fallback
 */
export function validateCompanyId(companyId: string | null | undefined, context: string = "operation"): string {
  if (!companyId) {
    throw new Error(`Company ID is required for ${context}`);
  }
  
  // Check for the hardcoded fallback ID
  if (companyId === "f99510bc-b290-47c6-8f12-282bea67bd91") {
    throw new Error(`Hardcoded company ID detected in ${context}. Please use getCurrentUserCompanyId() instead.`);
  }
  
  return companyId;
}

/**
 * Enhanced authHelpers that automatically get the company ID
 */
export async function fetchFromCurrentUser(
  table: string, 
  filters: Record<string, any> = {}
) {
  const companyId = await getCurrentUserCompanyId();
  return supabase.from(table).select("*").eq("company_id", companyId);
}

export async function fetchFromWithSelectCurrentUser(
  table: string,
  select: string,
  filters: Record<string, any> = {}
) {
  const companyId = await getCurrentUserCompanyId();
  let query = supabase.from(table).select(select).eq("company_id", companyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

export async function insertIntoCurrentUser(
  table: string,
  data: Record<string, any>
) {
  const companyId = await getCurrentUserCompanyId();
  const dataWithCompanyId = {
    ...data,
    company_id: companyId
  };
  
  return supabase.from(table).insert(dataWithCompanyId);
}

export async function updateInCurrentUser(
  table: string,
  data: Record<string, any>,
  filters: Record<string, any> = {}
) {
  const companyId = await getCurrentUserCompanyId();
  let query = supabase.from(table).update(data).eq("company_id", companyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}

export async function deleteFromCurrentUser(
  table: string,
  filters: Record<string, any> = {}
) {
  const companyId = await getCurrentUserCompanyId();
  let query = supabase.from(table).delete().eq("company_id", companyId);
  
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  return query;
}
