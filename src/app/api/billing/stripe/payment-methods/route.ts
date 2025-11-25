import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY missing");
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-11-20.acacia",
    });
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const company_id = searchParams.get("company_id");

        if (!company_id) {
            return NextResponse.json({ error: "Missing company_id" }, {
                status: 400,
            });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data: company } = await supabase
            .from("companies")
            .select("stripe_customer_id")
            .eq("id", company_id)
            .single();

        if (!company?.stripe_customer_id) {
            return NextResponse.json({ paymentMethods: [] });
        }

        const stripe = getStripe();
        const paymentMethods = await stripe.paymentMethods.list({
            customer: company.stripe_customer_id,
            type: "card",
        });

        return NextResponse.json({
            paymentMethods: paymentMethods.data.map((pm) => ({
                id: pm.id,
                brand: pm.card?.brand,
                last4: pm.card?.last4,
                exp_month: pm.card?.exp_month,
                exp_year: pm.card?.exp_year,
                is_default: false, // We'll improve this later
            })),
        });
    } catch (error: any) {
        console.error("Error fetching payment methods:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 },
        );
    }
}
