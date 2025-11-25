import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

// Service role client for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
    try {
        const supabase = await createServerSupabaseClient();

        // 1. Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const body = await req.json();
        const { company_id } = body;

        console.log('[setup-intent] Received request:', { company_id, user_id: user.id });

        if (!company_id) {
            console.error('[setup-intent] Missing company_id in request body');
            return NextResponse.json({ error: "Missing company_id" }, {
                status: 400,
            });
        }

        // 2. Verify user belongs to the company
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("company_id")
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

        console.log('[setup-intent] Profile lookup:', { profile, profileError });

        if (profileError) {
            console.error('[setup-intent] Profile error:', profileError);
            return NextResponse.json({ 
                error: "Failed to verify user profile",
                details: profileError.message 
            }, { status: 403 });
        }

        if (!profile) {
            console.error('[setup-intent] No profile found for user:', user.id);
            return NextResponse.json({ error: "User profile not found" }, { status: 403 });
        }

        if (profile.company_id !== company_id) {
            console.error('[setup-intent] Company ID mismatch:', { 
                profile_company_id: profile.company_id, 
                requested_company_id: company_id 
            });
            return NextResponse.json({ 
                error: "User does not belong to this company" 
            }, { status: 403 });
        }

        // 3. Get company details
        console.log('[setup-intent] Looking up company:', company_id);
        const { data: company, error: companyError } = await supabaseAdmin
            .from("companies")
            .select("id, name, contact_email, stripe_customer_id")
            .eq("id", company_id)
            .single();

        console.log('[setup-intent] Company lookup result:', { company, companyError });

        if (companyError) {
            console.error('[setup-intent] Company lookup error:', companyError);
            return NextResponse.json({ 
                error: "Company not found",
                details: companyError.message,
                company_id: company_id
            }, {
                status: 404,
            });
        }

        if (!company) {
            console.error('[setup-intent] Company not found in database:', company_id);
            return NextResponse.json({ 
                error: "Company not found",
                company_id: company_id
            }, {
                status: 404,
            });
        }

        // Use contact_email or fallback to user email
        const companyEmail = company.contact_email || user.email;
        if (!companyEmail) {
            console.error('[setup-intent] No email available for company:', company_id);
            return NextResponse.json({ 
                error: "Company email not found. Please add a contact email to your company profile.",
            }, {
                status: 400,
            });
        }

        const stripe = getStripe();
        
        let customerId = company.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: companyEmail,
                name: company.name,
                metadata: { company_id },
            });
            customerId = customer.id;

            // Update company with stripe_customer_id
            await supabaseAdmin.from("companies").update({
                stripe_customer_id: customerId,
            }).eq("id", company_id);
        }

        // 4. Create Setup Intent
        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ["card"],
            metadata: { company_id },
        });

        return NextResponse.json({
            clientSecret: setupIntent.client_secret,
            customerId: customerId,
        });
    } catch (error: any) {
        console.error("Error in setup-intent API:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 },
        );
    }
}
