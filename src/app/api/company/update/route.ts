import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body || {};

    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = getSupabaseAdmin();

    // Filter out fields that don't belong in the companies table
    // and map email to contact_email if present
    const validCompanyFields = [
      'name',
      'legal_name',
      'industry',
      'vat_number',
      'company_number',
      'phone',
      'website',
      'country',
      'contact_email',
      'address_line1',
      'address_line2',
      'city',
      'postcode',
      'logo_url',
      'status',
      'onboarding_step',
      'created_by',     // Valid column
      'setup_status',   // Valid column
    ];

    const cleanedUpdateData: Record<string, any> = {};
    
    // Only include valid company fields
    for (const key of Object.keys(updateData)) {
      if (validCompanyFields.includes(key)) {
        cleanedUpdateData[key] = updateData[key];
      }
    }
    
    // Map 'email' to 'contact_email' if present (for backward compatibility)
    if (updateData.email && !cleanedUpdateData.contact_email) {
      cleanedUpdateData.contact_email = updateData.email;
    }

    console.log("🔄 Attempting to update company:", { 
      id, 
      userId: user.id,
      fields: Object.keys(cleanedUpdateData)
    });

    const { data: company, error: updateError } = await supabaseAdmin
      .from("companies")
      .update(cleanedUpdateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("❌ Company update error:", updateError);
      return NextResponse.json(
        {
          error: updateError.message || "Failed to update company",
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        },
        { status: 400 }
      );
    }

    console.log("✅ Company updated:", company.id);

    // Return the full company object
    return NextResponse.json(company);
  } catch (e: any) {
    console.error("❌ Server error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

