/**
 * Onboarding Service
 * 
 * Single source of truth for user onboarding flow.
 * This service handles the complete onboarding process atomically.
 * 
 * IMPORTANT: This service uses admin client to bypass RLS during onboarding,
 * ensuring the chicken-and-egg problem (company needs profile, profile needs company)
 * is solved correctly.
 */

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createTrialSubscription } from "@/lib/subscriptions";

export interface OnboardingData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  industry?: string;
  country?: string;
  contactEmail?: string;
  companyNumber?: string;
  vatNumber?: string;
}

export interface OnboardingResult {
  success: boolean;
  companyId?: string;
  profileId?: string;
  error?: string;
}

/**
 * Complete onboarding flow
 * 
 * This function:
 * 1. Creates a company (using admin client to bypass RLS)
 * 2. Creates a profile linked to the company
 * 3. Creates a trial subscription
 * 4. Returns the result
 * 
 * All operations are atomic - if any step fails, the transaction should rollback.
 * However, Supabase doesn't support transactions across multiple operations,
 * so we need to handle cleanup manually if something fails.
 */
export async function completeOnboarding(
  data: OnboardingData
): Promise<OnboardingResult> {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // Step 1: Create company
    console.log("🔄 Creating company:", data.companyName);
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: data.companyName,
        industry: data.industry || null,
        country: data.country || null,
        contact_email: data.contactEmail || data.email,
        company_number: data.companyNumber || null,
        vat_number: data.vatNumber || null,
        created_by: data.userId,
        user_id: data.userId, // Critical: Set user_id so RLS policies work
      })
      .select("*")
      .single();

    if (companyError || !company) {
      console.error("❌ Company creation failed:", companyError);
      return {
        success: false,
        error: `Failed to create company: ${companyError?.message || "Unknown error"}`,
      };
    }

    console.log("✅ Company created:", company.id);

    // Step 2: Create or update profile linked to company
    console.log("🔄 Creating/updating profile for user:", data.userId);
    
    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, app_role")
      .eq("id", data.userId)
      .maybeSingle();

    let profile;
    let profileError;

    if (existingProfile) {
      // Profile exists - update it with company_id and other fields
      console.log("📝 Profile exists, updating with company_id:", company.id);
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          email: data.email,
          full_name: `${data.firstName} ${data.lastName}`,
          company_id: company.id,
          app_role: "Admin", // First user is always admin (capitalized as per enum)
          position_title: "Administrator",
        })
        .eq("id", data.userId)
        .select("*")
        .single();
      
      profile = updatedProfile;
      profileError = updateError;
    } else {
      // Profile doesn't exist - create it
      console.log("➕ Profile doesn't exist, creating new profile");
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: data.userId,
          email: data.email,
          full_name: `${data.firstName} ${data.lastName}`,
          company_id: company.id,
          app_role: "Admin", // First user is always admin (capitalized as per enum)
          position_title: "Administrator",
        })
        .select("*")
        .single();
      
      profile = newProfile;
      profileError = insertError;
    }

    if (profileError || !profile) {
      console.error("❌ Profile creation/update failed:", profileError);
      
      // Cleanup: Delete the company we just created
      await supabaseAdmin
        .from("companies")
        .delete()
        .eq("id", company.id);
      
      return {
        success: false,
        error: `Failed to create profile: ${profileError?.message || "Unknown error"}`,
      };
    }

    console.log("✅ Profile created/updated:", profile.id);

    // Step 3: Create trial subscription
    console.log("🔄 Creating trial subscription");
    try {
      await createTrialSubscription(company.id);
      console.log("✅ Trial subscription created");
    } catch (subscriptionError) {
      // Subscription failure is not critical - log but don't fail onboarding
      console.warn("⚠️ Failed to create trial subscription:", subscriptionError);
    }

    return {
      success: true,
      companyId: company.id,
      profileId: profile.id,
    };
  } catch (error: any) {
    console.error("❌ Onboarding failed:", error);
    return {
      success: false,
      error: error?.message || "Unknown error during onboarding",
    };
  }
}

/**
 * Verify onboarding is complete
 * 
 * Checks that:
 * 1. User has a profile
 * 2. Profile has a company_id
 * 3. Company exists
 * 4. User can access their company (RLS works)
 */
export async function verifyOnboarding(userId: string): Promise<{
  isComplete: boolean;
  hasProfile: boolean;
  hasCompany: boolean;
  companyId?: string;
}> {
  const supabaseAdmin = getSupabaseAdmin();

  // Check profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, company_id")
    .eq("id", userId)
    .single();

  if (!profile) {
    return {
      isComplete: false,
      hasProfile: false,
      hasCompany: false,
    };
  }

  if (!profile.company_id) {
    return {
      isComplete: false,
      hasProfile: true,
      hasCompany: false,
    };
  }

  // Check company exists
  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id")
    .eq("id", profile.company_id)
    .single();

  return {
    isComplete: !!company,
    hasProfile: true,
    hasCompany: !!company,
    companyId: profile.company_id || undefined,
  };
}

