import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

// Service role client for admin operations (like creating customers if RLS blocks it)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const {
            company_id,
            plan_id,
            addon_id,
            quantity = 1,
            success_url,
            cancel_url,
        } = await request.json();

        if (!company_id || (!plan_id && !addon_id)) {
            return NextResponse.json(
                {
                    error:
                        "Missing required fields (company_id and either plan_id or addon_id)",
                },
                { status: 400 },
            );
        }

        // ... (User verification logic remains the same) ...
        // 2. Verify User belongs to Company
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("company_id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        if (profileError || !profile || profile.company_id !== company_id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3. Get company details
        const { data: company, error: companyError } = await supabaseAdmin
            .from("companies")
            .select("name, contact_email, stripe_customer_id")
            .eq("id", company_id)
            .single();

        if (companyError || !company) {
            return NextResponse.json(
                { error: "Company not found" },
                { status: 404 },
            );
        }

        let lineItems = [];
        let mode: "payment" | "subscription" = "payment";

        if (plan_id) {
            // 4. Get plan details
            const { data: plan, error: planError } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("id", plan_id)
                .single();

            if (planError || !plan) {
                return NextResponse.json({ error: "Plan not found" }, {
                    status: 404,
                });
            }

            // 5. Get site count
            const { count: siteCount } = await supabase
                .from("sites")
                .select("id", { count: "exact", head: true })
                .eq("company_id", company_id);

            const finalSiteCount = siteCount || 1;
            const unitAmount = Math.round(plan.price_per_site_monthly * 100);

            lineItems.push({
                price_data: {
                    currency: "gbp",
                    product_data: {
                        name: `${plan.display_name} Plan`,
                        description:
                            `${plan.display_name} subscription for ${finalSiteCount} site${
                                finalSiteCount > 1 ? "s" : ""
                            }`,
                    },
                    unit_amount: unitAmount,
                    recurring: { interval: "month" },
                },
                quantity: finalSiteCount,
            });
            mode = "subscription";
            metadata = {
                ...metadata,
                plan_id,
                site_count: finalSiteCount.toString(),
            };
        } else if (addon_id) {
            // Handle Add-on
            const { data: addon, error: addonError } = await supabase
                .from("subscription_addons")
                .select("*")
                .eq("id", addon_id)
                .single();

            if (addonError || !addon) {
                return NextResponse.json({ error: "Addon not found" }, {
                    status: 404,
                });
            }

            // Check for hardware/monthly split
            const hasHardware = addon.hardware_cost && addon.hardware_cost > 0;
            const hasMonthly = addon.monthly_management_cost &&
                addon.monthly_management_cost > 0;

            if (hasHardware) {
                lineItems.push({
                    price_data: {
                        currency: "gbp",
                        product_data: {
                            name: `${addon.display_name} (Hardware)`,
                            description:
                                `One-time hardware cost for ${addon.display_name}`,
                        },
                        unit_amount: Math.round(addon.hardware_cost * 100),
                    },
                    quantity: quantity,
                });
            }

            if (hasMonthly) {
                lineItems.push({
                    price_data: {
                        currency: "gbp",
                        product_data: {
                            name: `${addon.display_name} (Monthly)`,
                            description:
                                `Monthly subscription for ${addon.display_name}`,
                        },
                        unit_amount: Math.round(
                            addon.monthly_management_cost * 100,
                        ),
                        recurring: { interval: "month" },
                    },
                    quantity: quantity,
                });
                mode = "subscription";
            }

            // Fallback to standard price if no split costs defined
            if (!hasHardware && !hasMonthly) {
                const unitAmount = Math.round(addon.price * 100);
                lineItems.push({
                    price_data: {
                        currency: "gbp",
                        product_data: {
                            name: addon.display_name,
                            description: addon.description,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: quantity,
                });
            }

            metadata = { ...metadata, addon_id, quantity: quantity.toString() };
        }

        // ... (Customer creation logic remains the same) ...
        // 6. Create or get Stripe customer
        const companyEmail = company.contact_email || user.email;
        // ... (rest of customer logic) ...
        let customerId = company.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: companyEmail,
                name: company.name,
                metadata: { company_id },
            });
            customerId = customer.id;
            await supabaseAdmin
                .from("companies")
                .update({ stripe_customer_id: customerId })
                .eq("id", company_id);
        }

        // 8. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: mode,
            payment_method_types: ["card"],
            line_items: lineItems,
            success_url: success_url ||
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
            cancel_url: cancel_url ||
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?cancelled=true`,
            metadata: metadata,
            // Only add subscription_data if it's a subscription mode
            ...(mode === "subscription"
                ? {
                    subscription_data: {
                        metadata: { company_id, plan_id },
                    },
                }
                : {}),
        });

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
        });
    } catch (error: any) {
        console.error("Error creating checkout session:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create checkout session" },
            { status: 500 },
        );
    }
}
