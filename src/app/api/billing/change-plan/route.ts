import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { company_id, plan_id } = body;

    if (!company_id || !plan_id) {
      return NextResponse.json(
        { error: "Missing company_id or plan_id" },
        { status: 400 },
      );
    }

    // 2. Verify user belongs to the company
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (profileError || !profile || profile.company_id !== company_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Get the plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // 4. Get company details (for Stripe Customer ID)
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("name, contact_email, stripe_customer_id")
      .eq("id", company_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // 5. Ensure Stripe Customer Exists
    // Use contact_email or fallback to user email
    const companyEmail = company.contact_email || user.email;
    if (!companyEmail) {
      return NextResponse.json(
        { error: "Company email not found. Please add a contact email to your company profile." },
        { status: 400 },
      );
    }

    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: companyEmail,
        name: company.name,
        metadata: { company_id },
      });
      customerId = customer.id;
      await supabaseAdmin.from("companies").update({
        stripe_customer_id: customerId,
      }).eq("id", company_id);
    }

    // 6. Count active sites
    const { count: siteCount } = await supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company_id);

    const finalSiteCount = siteCount || 1;

    // 7. Get existing subscription
    const { data: existingSubscription } = await supabase
      .from("company_subscriptions")
      .select("*")
      .eq("company_id", company_id)
      .single();

    const unitAmount = Math.round(plan.price_per_site_monthly * 100);

    // Helper to create a price
    const createPrice = async () => {
      return await stripe.prices.create({
        unit_amount: unitAmount,
        currency: "gbp",
        recurring: { interval: "month" },
        product_data: {
          name: `${plan.display_name} Plan`,
        },
      });
    };

    let stripeSubscriptionId = existingSubscription?.stripe_subscription_id;
    let subscriptionStatus = existingSubscription?.status || "trial";

    if (stripeSubscriptionId) {
      // Update existing Stripe Subscription
      try {
        const subscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
        );
        const subscriptionItemId = subscription.items.data[0].id;
        const price = await createPrice();

        await stripe.subscriptions.update(stripeSubscriptionId, {
          items: [{
            id: subscriptionItemId,
            price: price.id,
            quantity: finalSiteCount,
          }],
          metadata: {
            plan_id: plan_id,
            site_count: finalSiteCount.toString(),
          },
          proration_behavior: "always_invoice",
        });

        subscriptionStatus = "active"; // Assume active if updated successfully
      } catch (err: any) {
        console.error("Error updating Stripe subscription:", err);
        return NextResponse.json({
          error: "Failed to update Stripe subscription",
        }, { status: 500 });
      }
    } else {
      // Create NEW Stripe Subscription (if not on trial or user wants to activate)
      // If the user is selecting a paid plan, we assume they want to start paying.
      // We need to check if they have a payment method.

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      if (paymentMethods.data.length === 0) {
        // No payment method, cannot create subscription.
        // But maybe we just update the plan in DB and let them add payment method later?
        // The frontend should probably prompt for payment method first.
        // If we return error here, the frontend can show "Please add payment method".
        return NextResponse.json({
          error: "Please add a payment method before upgrading your plan.",
          requires_payment_method: true,
        }, { status: 400 });
      }

      try {
        const price = await createPrice();
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{
            price: price.id,
            quantity: finalSiteCount,
          }],
          metadata: {
            company_id: company_id,
            plan_id: plan_id,
            site_count: finalSiteCount.toString(),
          },
          payment_behavior: "default_incomplete",
          expand: ["latest_invoice.payment_intent"],
        });

        stripeSubscriptionId = subscription.id;
        subscriptionStatus = subscription.status === "active"
          ? "active"
          : "incomplete";

        if (subscriptionStatus === "incomplete") {
          // This usually happens if 3D secure is needed or payment failed.
          // We can return the client secret for the frontend to handle.
          // But for now, let's just save it.
        }
      } catch (err: any) {
        console.error("Error creating Stripe subscription:", err);
        return NextResponse.json({
          error: "Failed to create Stripe subscription: " + err.message,
        }, { status: 500 });
      }
    }

    // 8. Update local DB
    const updateData: any = {
      plan_id: plan_id,
      site_count: finalSiteCount,
      updated_at: new Date().toISOString(),
      stripe_subscription_id: stripeSubscriptionId,
      status: subscriptionStatus === "active"
        ? "active"
        : existingSubscription?.status, // Keep old status if incomplete? Or update?
    };

    if (subscriptionStatus === "active") {
      updateData.status = "active";
      if (!existingSubscription?.subscription_started_at) {
        updateData.subscription_started_at = new Date().toISOString();
      }
    }

    let result;
    if (existingSubscription) {
      result = await supabase
        .from("company_subscriptions")
        .update(updateData)
        .eq("company_id", company_id)
        .select()
        .single();
    } else {
      // Should not happen if logic is correct (usually a trial subscription exists)
      // But if not, insert.
      result = await supabase
        .from("company_subscriptions")
        .insert({
          company_id,
          ...updateData,
          trial_used: true, // Assuming if they sign up directly it counts as used or we set it.
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error updating DB:", result.error);
      return NextResponse.json({ error: "Failed to update database" }, {
        status: 500,
      });
    }

    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    console.error("Error in change-plan API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
