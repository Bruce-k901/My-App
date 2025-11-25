import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        const stripe = getStripe();
        
        if (!signature) {
            console.error("Missing stripe-signature header");
            return NextResponse.json(
                { error: "Missing stripe-signature header" },
                { status: 400 },
            );
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                webhookSecret,
            );
        } catch (err: any) {
            console.error(
                "Webhook signature verification failed:",
                err.message,
            );
            return NextResponse.json(
                { error: `Webhook Error: ${err.message}` },
                { status: 400 },
            );
        }

        console.log(`Received Stripe event: ${event.type}`);

        // Handle the event
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutSessionCompleted(
                    event.data.object as Stripe.Checkout.Session,
                );
                break;

            case "customer.subscription.created":
                await handleSubscriptionCreated(
                    event.data.object as Stripe.Subscription,
                );
                break;

            case "customer.subscription.updated":
                await handleSubscriptionUpdated(
                    event.data.object as Stripe.Subscription,
                );
                break;

            case "customer.subscription.deleted":
                await handleSubscriptionDeleted(
                    event.data.object as Stripe.Subscription,
                );
                break;

            case "invoice.paid":
                await handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            case "invoice.payment_failed":
                await handleInvoicePaymentFailed(
                    event.data.object as Stripe.Invoice,
                );
                break;

            case "payment_method.attached":
                await handlePaymentMethodAttached(
                    event.data.object as Stripe.PaymentMethod,
                );
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("Webhook handler error:", error);
        return NextResponse.json(
            { error: error.message || "Webhook handler failed" },
            { status: 500 },
        );
    }
}

async function handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
) {
    const companyId = session.metadata?.company_id;
    const planId = session.metadata?.plan_id;
    const addonId = session.metadata?.addon_id;
    const quantity = parseInt(session.metadata?.quantity || "1");

    if (!companyId) {
        console.error("Missing company_id in checkout session metadata");
        return;
    }

    console.log(`Processing checkout session for company ${companyId}`);

    if (planId) {
        // Handle Plan Subscription
        const { error } = await supabase
            .from("company_subscriptions")
            .update({
                status: "active",
                subscription_started_at: new Date().toISOString(),
                payment_method: "stripe",
                stripe_subscription_id: session.subscription as string,
            })
            .eq("company_id", companyId);

        if (error) {
            console.error("Error updating subscription status:", error);
        } else {
            console.log(`Subscription activated for company ${companyId}`);
        }
    } else if (addonId) {
        // Handle Add-on Purchase
        console.log(`Processing add-on purchase: ${addonId} x${quantity}`);

        // 1. Fetch Addon Details
        const { data: addon, error: addonError } = await supabase
            .from("subscription_addons")
            .select("*")
            .eq("id", addonId)
            .single();

        if (addonError || !addon) {
            console.error("Error fetching addon details:", addonError);
            return;
        }

        // 2. Calculate Costs
        const hardwareCost = (addon.hardware_cost || 0) * quantity;
        const monthlyCost = (addon.monthly_management_cost || 0) * quantity;
        const totalOneTime = hardwareCost + (addon.price || 0) * quantity; // Assuming price is one-time if not split

        // 3. Insert Purchase Record
        const { error: insertError } = await supabase
            .from("company_addon_purchases")
            .insert({
                company_id: companyId,
                addon_id: addonId,
                quantity: quantity,
                quantity_per_site: quantity, // Assuming quantity is total for now, or per site? The UI implies total.
                total_price: totalOneTime,
                hardware_cost_total: hardwareCost,
                monthly_recurring_cost: monthlyCost,
                status: "active",
                purchased_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_subscription_id: session.subscription as string, // If it created a subscription
            });

        if (insertError) {
            console.error("Error recording addon purchase:", insertError);
        } else {
            console.log(`Add-on purchase recorded for company ${companyId}`);
        }
    }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const companyId = subscription.metadata?.company_id;

    if (!companyId) {
        console.error("Missing company_id in subscription metadata", {
            metadata: subscription.metadata,
        });
        return;
    }

    // Update subscription with Stripe subscription ID
    const { error } = await supabase
        .from("company_subscriptions")
        .update({
            stripe_subscription_id: subscription.id,
            status: "active",
        })
        .eq("company_id", companyId);

    if (error) {
        console.error("Error updating subscription created:", error);
    } else {
        console.log(`Subscription created for company ${companyId}`);
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const companyId = subscription.metadata?.company_id;

    if (!companyId) {
        console.error("Missing company_id in subscription metadata", {
            metadata: subscription.metadata,
        });
        return;
    }

    // Determine status based on Stripe subscription status
    let status = "active";
    if (subscription.status === "past_due") {
        status = "past_due";
    } else if (
        subscription.status === "canceled" || subscription.status === "unpaid"
    ) {
        status = "cancelled";
    }

    const { error } = await supabase
        .from("company_subscriptions")
        .update({
            status,
            subscription_ends_at: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000).toISOString()
                : null,
        })
        .eq("company_id", companyId);

    if (error) {
        console.error("Error updating subscription updated:", error);
    } else {
        console.log(`Subscription updated for company ${companyId}: ${status}`);
    }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const companyId = subscription.metadata?.company_id;

    if (!companyId) {
        console.error("Missing company_id in subscription metadata", {
            metadata: subscription.metadata,
        });
        return;
    }

    const { error } = await supabase
        .from("company_subscriptions")
        .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            subscription_ends_at: new Date().toISOString(),
        })
        .eq("company_id", companyId);

    if (error) {
        console.error("Error updating subscription deleted:", error);
    } else {
        console.log(`Subscription cancelled for company ${companyId}`);
    }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const companyId = invoice.metadata?.company_id;

    if (!companyId) {
        console.error("Missing company_id in invoice metadata", {
            metadata: invoice.metadata,
        });
        return;
    }

    // Create invoice record in database
    const { data: subscription, error: subError } = await supabase
        .from("company_subscriptions")
        .select("id")
        .eq("company_id", companyId)
        .single();

    if (subError || !subscription) {
        console.error("Subscription not found for company", companyId);
        return;
    }

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${invoice.number}`;

    const { error } = await supabase
        .from("invoices")
        .insert({
            company_id: companyId,
            subscription_id: subscription.id,
            invoice_number: invoiceNumber,
            invoice_date:
                new Date(invoice.created * 1000).toISOString().split("T")[0],
            due_date: invoice.due_date
                ? new Date(invoice.due_date * 1000).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0],
            subtotal: (invoice.subtotal || 0) / 100,
            tax_amount: (invoice.tax || 0) / 100,
            total_amount: (invoice.total || 0) / 100,
            currency: invoice.currency ? invoice.currency.toUpperCase() : "GBP",
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_reference: invoice.id,
            payment_method: "stripe",
            billing_period_start: invoice.period_start
                ? new Date(invoice.period_start * 1000).toISOString().split(
                    "T",
                )[0]
                : new Date().toISOString().split("T")[0],
            billing_period_end: invoice.period_end
                ? new Date(invoice.period_end * 1000).toISOString().split(
                    "T",
                )[0]
                : new Date().toISOString().split("T")[0],
        });

    if (error) {
        console.error("Error creating invoice record:", error);
    } else {
        console.log(`Invoice paid for company ${companyId}`);
    }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const companyId = invoice.metadata?.company_id;

    if (!companyId) {
        console.error("Missing company_id in invoice metadata", {
            metadata: invoice.metadata,
        });
        return;
    }

    // Update subscription status to past_due
    const { error } = await supabase
        .from("company_subscriptions")
        .update({
            status: "past_due",
        })
        .eq("company_id", companyId);

    if (error) {
        console.error("Error updating subscription status to past_due:", error);
    } else {
        console.log(`Payment failed for company ${companyId}`);
    }
}

async function handlePaymentMethodAttached(
    paymentMethod: Stripe.PaymentMethod,
) {
    // Payment method attached to customer
    console.log(
        `Payment method ${paymentMethod.id} attached to customer ${paymentMethod.customer}`,
    );
}
