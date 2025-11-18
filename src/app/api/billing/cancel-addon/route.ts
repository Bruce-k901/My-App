import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { purchase_id } = body;

    if (!purchase_id) {
      return NextResponse.json(
        { error: "Missing purchase_id" },
        { status: 400 }
      );
    }

    // Get the purchase record with company_id
    const { data: purchase, error: purchaseError } = await supabase
      .from("company_addon_purchases")
      .select("company_id")
      .eq("id", purchase_id)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Verify user belongs to the company
    // Use .or() to check both id and auth_user_id fields
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to verify user" },
        { status: 500 }
      );
    }

    if (!profile || profile.company_id !== purchase.company_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cancel the purchase
    const { error: updateError } = await supabase
      .from("company_addon_purchases")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase_id);

    if (updateError) {
      console.error("Error cancelling addon:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel addon" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in cancel-addon API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

