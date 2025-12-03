import { NextResponse } from "next/server";
import { completeOnboarding } from "@/lib/services/onboarding";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Company Creation API Route
 * 
 * This route now uses the onboarding service for consistent, atomic company creation.
 * The onboarding service handles:
 * - Company creation
 * - Profile creation/linking
 * - Trial subscription creation
 * 
 * All in a single, tested service.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      industry,
      country,
      contact_email,
      company_number,
      vat_number,
      user_id,
      // Support legacy fields from signup page
      firstName,
      lastName,
      email,
    } = body || {};

    if (!name || !user_id) {
      return NextResponse.json({ error: "Missing required fields: name and user_id are required" }, { status: 400 });
    }

    // Get user email - prefer contact_email, fall back to email, or fetch from auth
    let userEmail = contact_email || email;
    if (!userEmail) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
        userEmail = authUser?.user?.email;
      } catch (e) {
        console.warn("Could not fetch user email from auth:", e);
      }
    }

    if (!userEmail) {
      return NextResponse.json({ error: "Could not determine user email" }, { status: 400 });
    }

    // Get user name - prefer firstName/lastName from body, or fetch from auth metadata
    let firstNameValue = firstName;
    let lastNameValue = lastName;
    
    if (!firstNameValue || !lastNameValue) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
        const metadata = authUser?.user?.user_metadata || {};
        firstNameValue = firstNameValue || metadata.first_name || metadata.full_name?.split(' ')[0] || 'User';
        lastNameValue = lastNameValue || metadata.last_name || metadata.full_name?.split(' ').slice(1).join(' ') || '';
      } catch (e) {
        console.warn("Could not fetch user metadata from auth:", e);
        firstNameValue = firstNameValue || 'User';
        lastNameValue = lastNameValue || '';
      }
    }

    console.log("🔄 Starting onboarding via service:", { 
      name, 
      industry, 
      user_id, 
      email: userEmail 
    });

    // Use the onboarding service - single source of truth
    const result = await completeOnboarding({
      userId: user_id,
      email: userEmail,
      firstName: firstNameValue,
      lastName: lastNameValue,
      companyName: name,
      industry: industry || "Hospitality",
      country: country || null,
      contactEmail: contact_email || userEmail,
      companyNumber: company_number || null,
      vatNumber: vat_number || null,
    });

    if (!result.success) {
      console.error("❌ Onboarding failed:", result.error);
      return NextResponse.json({ 
        error: result.error || "Failed to complete onboarding",
      }, { status: 400 });
    }

    console.log("✅ Onboarding completed successfully:", {
      companyId: result.companyId,
      profileId: result.profileId,
    });

    // Fetch and return the full company object
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: company, error: fetchError } = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", result.companyId)
        .single();

      if (fetchError || !company) {
        console.warn("⚠️ Could not fetch company after creation:", fetchError);
        // Return minimal response if fetch fails
        return NextResponse.json({
          id: result.companyId,
          name,
          message: "Company created successfully",
        });
      }

      return NextResponse.json(company);
    } catch (e: any) {
      console.warn("⚠️ Error fetching company:", e);
      // Return minimal response
      return NextResponse.json({
        id: result.companyId,
        name,
        message: "Company created successfully",
      });
    }
  } catch (e: any) {
    console.error("❌ Unexpected error in company creation:", e);
    return NextResponse.json({ 
      error: e?.message || "Server error" 
    }, { status: 500 });
  }
}