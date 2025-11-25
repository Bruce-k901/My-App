import useSWR from "swr";
import { supabase } from "@/lib/supabase";

const fetcher = async (key: string) => {
    const [_, companyId] = key.split(":");
    if (!companyId) return null;

    // 1. Fetch Sites Count & Data
    const { data: sitesData, count: sitesCount, error: sitesError } =
        await supabase
            .from("sites")
            .select("id, name", { count: "exact" })
            .eq("company_id", companyId);

    if (sitesError) throw sitesError;

    // 2. Fetch Subscription
    const { data: subData, error: subError } = await supabase
        .from("company_subscriptions")
        .select(`
      *,
      plan:subscription_plans(*)
    `)
        .eq("company_id", companyId)
        .single();

    if (subError && subError.code !== "PGRST116") throw subError;

    // 3. Fetch Plans
    const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_per_site_monthly", { ascending: true });

    if (plansError) throw plansError;

    // 4. Fetch Available Addons
    const { data: addonsData, error: addonsError } = await supabase
        .from("subscription_addons")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });

    if (addonsError) throw addonsError;

    // 5. Fetch Purchased Addons
    const { data: purchasedData, error: purchasedError } = await supabase
        .from("company_addon_purchases")
        .select(`
      *,
      addon:subscription_addons(*)
    `)
        .eq("company_id", companyId)
        .eq("status", "active");

    if (purchasedError) throw purchasedError;

    // 6. Fetch Payment Methods (via API)
    let paymentMethods = [];
    try {
        const pmResponse = await fetch(
            `/api/billing/stripe/payment-methods?company_id=${companyId}`,
        );
        if (pmResponse.ok) {
            const pmData = await pmResponse.json();
            paymentMethods = pmData.paymentMethods || [];
        }
    } catch (e) {
        console.error("Failed to fetch payment methods", e);
    }

    // 7. Fetch Invoices
    const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

    if (invoicesError) throw invoicesError;

    return {
        sites: sitesData || [],
        siteCount: sitesCount || 0,
        subscription: subData,
        plans: plansData || [],
        addons: addonsData || [],
        purchasedAddons: purchasedData || [],
        paymentMethods,
        invoices: invoicesData || [],
    };
};

export function useBillingData(companyId: string | null) {
    const { data, error, isLoading, mutate } = useSWR(
        companyId ? `billing:${companyId}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false,
        },
    );

    return {
        data,
        error,
        isLoading,
        mutate,
    };
}
