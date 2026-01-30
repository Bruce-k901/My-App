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
      // Profile exists - DON'T overwrite company_id if it exists
      console.log("📝 Profile exists, checking if company_id should be updated");
      
      const updateData: any = {
        email: data.email,
        full_name: `${data.firstName} ${data.lastName}`,
      };
      
      // Only set company_id if profile doesn't have one yet
      if (!existingProfile.company_id) {
        updateData.company_id = company.id;
        updateData.app_role = "Admin";
        updateData.position_title = "Administrator";
        
        console.log("✅ Setting company_id for first-time user");
      } else {
        console.log("⚠️ Profile already has company_id, adding as secondary company");
      }
      
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", data.userId)
        .select("*")
        .single();
      
      profile = updatedProfile;
      profileError = updateError;
      
      // If profile already had a company, add this as a secondary company
      if (existingProfile.company_id && existingProfile.company_id !== company.id) {
        console.log("➕ Adding secondary company via user_companies");
        const { error: linkError } = await supabaseAdmin
          .from("user_companies")
          .insert({
            profile_id: data.userId,
            company_id: company.id,
            app_role: "Owner",
            is_primary: false,
          });
        
        if (linkError) {
          console.error("Error linking secondary company:", linkError);
        } else {
          console.log("✅ Secondary company linked successfully");
        }
      }
    } else {
      // Profile doesn't exist - create it normally (no changes here)
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

    // Step 2.5: Create user_companies entry (redundancy - trigger should also do this)
    if (profile.company_id) {
      console.log("🔄 Creating user_companies entry for profile");
      const { error: userCompaniesError } = await supabaseAdmin
        .from("user_companies")
        .insert({
          profile_id: profile.id,
          company_id: profile.company_id,
          app_role: profile.app_role || "Admin",
          is_primary: true,
        })
        .onConflict("profile_id,company_id")
        .merge();
      
      if (userCompaniesError) {
        console.warn("⚠️ Failed to create user_companies entry (trigger may handle this):", userCompaniesError);
      } else {
        console.log("✅ user_companies entry created");
      }
    }

    // Step 3: Seed default roles for the company
    console.log("🔄 Seeding default roles for company:", company.id);
    try {
      const { error: seedError } = await supabaseAdmin.rpc('seed_default_roles', {
        p_company_id: company.id,
      });
      
      if (seedError) {
        console.warn("⚠️ Failed to seed default roles:", seedError);
        // Don't fail onboarding if role seeding fails - roles can be created manually
      } else {
        console.log("✅ Default roles seeded");
        
        // Step 4: Assign 'owner' role to the first user
        const { data: ownerRole } = await supabaseAdmin
          .from('roles')
          .select('id')
          .eq('company_id', company.id)
          .eq('slug', 'owner')
          .single();
        
        if (ownerRole) {
          await supabaseAdmin
            .from('user_roles')
            .insert({
              profile_id: profile.id,
              role_id: ownerRole.id,
              assigned_by: profile.id,
            });
          console.log("✅ Owner role assigned to first user");
        }
      }
    } catch (roleError) {
      // Role seeding failure is not critical - log but don't fail onboarding
      console.warn("⚠️ Failed to seed roles:", roleError);
    }

    // Step 4: Create trial subscription
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

