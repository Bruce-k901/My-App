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
    const { company_id, addon_id, quantity = 1, per_site_quantities = null } = body;

    if (!company_id || !addon_id) {
      return NextResponse.json(
        { error: "Missing company_id or addon_id" },
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

    // Get the addon details
    const { data: addon, error: addonError } = await supabase
      .from("subscription_addons")
      .select("*")
      .eq("id", addon_id)
      .single();

    if (addonError || !addon) {
      return NextResponse.json({ error: "Addon not found" }, { status: 404 });
    }

    if (!addon.is_active) {
      return NextResponse.json({ error: "Addon is not available" }, { status: 400 });
    }

    // Check if this is a tiered addon (smart sensor or maintenance kit)
    // If so, cancel any existing purchases in the same tier group
    const isSmartSensor = addon.name.startsWith('smart_sensor_');
    const isMaintenanceKit = addon.name.startsWith('maintenance_kit_');

    if (isSmartSensor || isMaintenanceKit) {
      // Cancel any existing tiered addons in the same category
      let tierPrefix = '';
      if (isSmartSensor) {
        tierPrefix = 'smart_sensor_';
      } else if (isMaintenanceKit) {
        tierPrefix = 'maintenance_kit_';
      }

      // Find all addons in the same tier group
      const { data: tierAddons } = await supabase
        .from("subscription_addons")
        .select("id")
        .like("name", `${tierPrefix}%`);

      if (tierAddons && tierAddons.length > 0) {
        const tierAddonIds = tierAddons.map(a => a.id);

        // Cancel any active purchases in this tier group
        const { error: cancelError } = await supabase
          .from("company_addon_purchases")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", company_id)
          .eq("status", "active")
          .in("addon_id", tierAddonIds);

        if (cancelError) {
          console.error("Error cancelling existing tier addons:", cancelError);
          // Don't fail the purchase, just log the error
        }
      }
    }

    // Check if already purchased (for non-tiered one-time purchases, prevent duplicates)
    if ((addon.price_type === 'one_time' || addon.price_type === 'per_site_one_time') && !isSmartSensor && !isMaintenanceKit) {
      const { data: existing } = await supabase
        .from("company_addon_purchases")
        .select("id")
        .eq("company_id", company_id)
        .eq("addon_id", addon_id)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "This addon has already been purchased" },
          { status: 400 }
        );
      }
    }

    // Calculate price
    // Special handling for onboarding - it's a fixed total price
    if (addon.name === 'personalized_onboarding') {
      const unitPrice = 1200.00; // Fixed total price, not per site
      const totalPrice = unitPrice;
      
      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from("company_addon_purchases")
        .insert({
          company_id,
          addon_id,
          quantity: 1,
          unit_price: unitPrice,
          total_price: totalPrice,
          status: "active",
        })
        .select()
        .single();

      if (purchaseError) {
        console.error("Error purchasing addon:", purchaseError);
        return NextResponse.json(
          { error: "Failed to purchase addon" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: purchase });
    }

    // Get active site count
    // Note: archived column may not exist in sites table
    const { count: siteCount } = await supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company_id);
    
    const finalSiteCount = siteCount || 0;

    let unitPrice = addon.price;
    let totalPrice: number;

    // For Smart Sensors: hardware cost (one-time) + monthly management (recurring)
    if (addon.name.startsWith('smart_sensor_')) {
      // Calculate hardware cost from per-site quantities if provided, otherwise use average quantity
      let totalSensorQuantity = quantity * finalSiteCount;
      if (per_site_quantities && typeof per_site_quantities === 'object') {
        totalSensorQuantity = Object.values(per_site_quantities as Record<string, number>)
          .reduce((sum, qty) => sum + (qty || 0), 0);
      }
      
      const hardwareCost = (addon.hardware_cost || 0) * totalSensorQuantity;
      const monthlyManagementCost = (addon.monthly_management_cost || 0) * finalSiteCount;
      
      // Store hardware cost as one-time payment
      unitPrice = addon.hardware_cost || 0; // Price per sensor
      totalPrice = hardwareCost; // Total hardware cost
      
      // Create purchase record with both costs
      // Note: columns may not exist if migration hasn't run - use conditional insert
      const insertData: any = {
        company_id,
        addon_id,
        quantity: quantity, // Average quantity per site (for backwards compatibility)
        unit_price: unitPrice,
        total_price: totalPrice,
        status: "active",
      };
      
      // Only include these columns if they exist (migration may not have run)
      if (addon.hardware_cost) {
        insertData.hardware_cost_total = hardwareCost;
        // Calculate average quantity per site for backwards compatibility
        const avgQtyPerSite = finalSiteCount > 0 ? Math.round(totalSensorQuantity / finalSiteCount) : quantity;
        insertData.quantity_per_site = avgQtyPerSite;
      }
      
      if (addon.monthly_management_cost) {
        insertData.monthly_recurring_cost = monthlyManagementCost;
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from("company_addon_purchases")
        .insert(insertData)
        .select()
        .single();

      if (purchaseError) {
        console.error("Error purchasing addon:", purchaseError);
        console.error("Insert data was:", insertData);
        return NextResponse.json(
          { error: `Failed to purchase addon: ${purchaseError.message}` },
          { status: 500 }
        );
      }

      // Store per-site quantities if provided
      if (per_site_quantities && typeof per_site_quantities === 'object' && Object.keys(per_site_quantities).length > 0) {
        const siteQuantityEntries = Object.entries(per_site_quantities as Record<string, number>)
          .filter(([siteId, qty]) => qty > 0)
          .map(([siteId, qty]) => ({
            company_addon_purchase_id: purchase.id,
            site_id: siteId,
            quantity: qty as number,
          }));

        if (siteQuantityEntries.length > 0) {
          const { error: siteQtyError } = await supabase
            .from("company_addon_site_quantities")
            .insert(siteQuantityEntries);

          if (siteQtyError) {
            console.error("Error storing per-site quantities:", siteQtyError);
            // Don't fail the purchase, just log the error (table may not exist yet)
          }
        }
      }

      return NextResponse.json({ data: purchase });
    }
    // For Maintenance Kits: hardware cost only (one-time)
    else if (addon.name.startsWith('maintenance_kit_')) {
      // Calculate hardware cost from per-site quantities if provided, otherwise use average quantity
      let totalTagQuantity = quantity * finalSiteCount;
      if (per_site_quantities && typeof per_site_quantities === 'object') {
        totalTagQuantity = Object.values(per_site_quantities as Record<string, number>)
          .reduce((sum, qty) => sum + (qty || 0), 0);
      }
      
      const hardwareCost = (addon.hardware_cost || 0) * totalTagQuantity;
      unitPrice = addon.hardware_cost || 0; // Price per tag
      totalPrice = hardwareCost;
      
      // Create purchase record
      // Note: columns may not exist if migration hasn't run - use conditional insert
      const insertData: any = {
        company_id,
        addon_id,
        quantity: quantity, // Average quantity per site (for backwards compatibility)
        unit_price: unitPrice,
        total_price: totalPrice,
        status: "active",
      };
      
      // Only include these columns if they exist (migration may not have run)
      if (addon.hardware_cost) {
        insertData.hardware_cost_total = hardwareCost;
        // Calculate average quantity per site for backwards compatibility
        const avgQtyPerSite = finalSiteCount > 0 ? Math.round(totalTagQuantity / finalSiteCount) : quantity;
        insertData.quantity_per_site = avgQtyPerSite;
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from("company_addon_purchases")
        .insert(insertData)
        .select()
        .single();

      if (purchaseError) {
        console.error("Error purchasing addon:", purchaseError);
        console.error("Insert data was:", insertData);
        return NextResponse.json(
          { error: `Failed to purchase addon: ${purchaseError.message}` },
          { status: 500 }
        );
      }

      // Store per-site quantities if provided
      if (per_site_quantities && typeof per_site_quantities === 'object' && Object.keys(per_site_quantities).length > 0) {
        const siteQuantityEntries = Object.entries(per_site_quantities as Record<string, number>)
          .filter(([siteId, qty]) => qty > 0)
          .map(([siteId, qty]) => ({
            company_addon_purchase_id: purchase.id,
            site_id: siteId,
            quantity: qty as number,
          }));

        if (siteQuantityEntries.length > 0) {
          const { error: siteQtyError } = await supabase
            .from("company_addon_site_quantities")
            .insert(siteQuantityEntries);

          if (siteQtyError) {
            console.error("Error storing per-site quantities:", siteQtyError);
            // Don't fail the purchase, just log the error (table may not exist yet)
          }
        }
      }

      return NextResponse.json({ data: purchase });
    }
    // For other addons
    else if (addon.price_type === 'per_site_one_time' || addon.price_type === 'per_site_monthly') {
      unitPrice = addon.price * finalSiteCount;
      totalPrice = unitPrice * quantity;
    } else {
      // For non-per-site pricing (like white-label reports)
      totalPrice = unitPrice * quantity;
    }

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from("company_addon_purchases")
      .insert({
        company_id,
        addon_id,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        status: "active",
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Error purchasing addon:", purchaseError);
      return NextResponse.json(
        { error: "Failed to purchase addon" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: purchase });
  } catch (error: any) {
    console.error("Error in purchase-addon API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

