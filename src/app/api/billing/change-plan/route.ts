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
    const { company_id, plan_id } = body;

    if (!company_id || !plan_id) {
      return NextResponse.json(
        { error: "Missing company_id or plan_id" },
        { status: 400 }
      );
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

    if (!profile || profile.company_id !== company_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Count active sites
    // Note: archived column may not exist in sites table
    const { count: siteCount } = await supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company_id);
    
    const finalSiteCount = siteCount || 0;

    // Check if plan is available for this site count
    if (plan.name === "starter" && finalSiteCount > 1) {
      return NextResponse.json(
        { error: "Starter plan is only available for single site users" },
        { status: 400 }
      );
    }

    if (plan.name === "pro" && finalSiteCount < 2) {
      return NextResponse.json(
        { error: "Pro plan requires 2 or more sites" },
        { status: 400 }
      );
    }

    // Get or create subscription
    const { data: existingSubscription } = await supabase
      .from("company_subscriptions")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (existingSubscription) {
      // Update existing subscription
      const updateData: any = {
        plan_id: plan_id,
        site_count: finalSiteCount,
        updated_at: new Date().toISOString(),
      };

      // If trial ended and switching to paid plan, update status
      if (existingSubscription.status === "trial" || existingSubscription.status === "expired") {
        updateData.status = "active";
        updateData.subscription_started_at = new Date().toISOString();
        // Set subscription end date to 1 month from now
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        updateData.subscription_ends_at = endDate.toISOString();
      }

      const { data: updated, error: updateError } = await supabase
        .from("company_subscriptions")
        .update(updateData)
        .eq("company_id", company_id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        return NextResponse.json(
          { error: "Failed to update subscription" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: updated });
    } else {
      // Create new subscription
      const trialStartedAt = new Date().toISOString();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 60);

      const { data: newSubscription, error: createError } = await supabase
        .from("company_subscriptions")
        .insert({
          company_id,
          plan_id,
          trial_started_at: trialStartedAt,
          trial_ends_at: trialEndsAt.toISOString(),
          trial_used: true,
          status: "trial",
          site_count: finalSiteCount,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating subscription:", createError);
        return NextResponse.json(
          { error: "Failed to create subscription" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: newSubscription });
    }
  } catch (error: any) {
    console.error("Error in change-plan API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

