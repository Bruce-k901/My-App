import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface TrayLayoutItem {
  product: string;
  product_id: string;
  qty: number;
}

interface TrayLayoutEquipment {
  number: number;  // Sequential across ALL destination groups
  local_number: number;  // Number within this destination group
  bake_group: string;
  bake_group_id: string;
  items: TrayLayoutItem[];
  used: number;
  capacity: number;
}

interface TrayLayoutDestinationGroup {
  destination_group_id: string;
  destination_group_name: string;
  bake_deadline: string | null;
  dispatch_time: string | null;
  tray_start: number;  // First tray number for this destination
  tray_end: number;    // Last tray number for this destination
  equipment: TrayLayoutEquipment[];
  summary: {
    total_equipment: number;
    total_items: number;
    utilization_percent: number;
  };
}

// Grid format - products as rows, trays as columns
interface TrayGridProduct {
  product_id: string;
  product_name: string;
  bake_group_id: string;
  bake_group_name: string;
  prep_method: string;
  trays: Record<number, number>;  // tray_number -> quantity
  total: number;
}

interface TrayGridSection {
  prep_method: string;
  products: TrayGridProduct[];
  tray_numbers: number[];  // Which trays are in this section
}

interface CapacityProfile {
  label: string;
  capacity: number;
}

/**
 * Resolves the tray capacity for a product.
 *
 * Resolution order:
 * 1. product.items_per_equipment (explicit override on the product)
 * 2. Capacity profile match (bake group's profile label → equipment type's capacity_profiles)
 * 3. equipment type default_capacity
 * 4. product.items_per_tray (legacy fallback)
 * 5. 18 (hardcoded fallback)
 */
function resolveCapacity(
  product: {
    items_per_equipment: number | null;
    items_per_tray: number | null;
    equipment_type_id: string | null;
  },
  bakeGroup: {
    capacity_profile: string | null;
  } | null,
  equipmentTypeMap: Map<string, {
    default_capacity: number;
    capacity_profiles?: CapacityProfile[];
  }>
): number {
  // 1. Explicit override on product
  if (product.items_per_equipment && product.items_per_equipment > 0) {
    return product.items_per_equipment;
  }

  // 2. Capacity profile match
  if (bakeGroup?.capacity_profile && product.equipment_type_id) {
    const equipType = equipmentTypeMap.get(product.equipment_type_id);
    const profiles = equipType?.capacity_profiles || [];

    const matched = profiles.find(
      (p) => p.label.toLowerCase() === bakeGroup.capacity_profile!.toLowerCase()
    );

    if (matched && matched.capacity > 0) {
      return matched.capacity;
    }
  }

  // 3. Equipment type default capacity
  if (product.equipment_type_id) {
    const equipType = equipmentTypeMap.get(product.equipment_type_id);
    if (equipType?.default_capacity && equipType.default_capacity > 0) {
      return equipType.default_capacity;
    }
  }

  // 4. Legacy items_per_tray
  if (product.items_per_tray && product.items_per_tray > 0) {
    return product.items_per_tray;
  }

  // 5. Hardcoded fallback
  return 18;
}

/**
 * GET /api/planly/production-plan/tray-layout
 *
 * Calculates the tray/equipment layout for a given delivery date.
 * Groups products by destination group, then by bake group, and assigns to equipment.
 *
 * Returns both equipment-based view and grid view (products × trays).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const deliveryDate = searchParams.get('date');
    const siteId = searchParams.get('siteId');

    if (!deliveryDate || !siteId) {
      return NextResponse.json(
        { error: 'date and siteId are required' },
        { status: 400 }
      );
    }

    // Get destination groups
    const { data: destinationGroups } = await supabase
      .from('planly_destination_groups')
      .select('id, name, bake_deadline, dispatch_time, priority')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    // Get bake groups (including capacity_profile for capacity resolution)
    const { data: bakeGroups } = await supabase
      .from('planly_bake_groups')
      .select('id, name, priority, target_temp_celsius, target_time_mins, capacity_profile')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    const bakeGroupMap = new Map(
      (bakeGroups || []).map(bg => [bg.id, bg])
    );

    // Get equipment types
    const { data: site } = await supabase
      .from('sites')
      .select('company_id')
      .eq('id', siteId)
      .single();

    const { data: equipmentTypes } = await supabase
      .from('planly_equipment_types')
      .select('id, name, default_capacity, capacity_profiles')
      .eq('is_active', true)
      .or(`site_id.eq.${siteId},and(site_id.is.null,company_id.eq.${site?.company_id})`);

    const equipmentTypeMap = new Map(
      (equipmentTypes || []).map(e => [e.id, e])
    );

    // Get products with their configurations including prep_method
    const { data: products } = await supabase
      .from('planly_products')
      .select(`
        id,
        bake_group_id,
        equipment_type_id,
        items_per_equipment,
        items_per_tray,
        display_order,
        stockly_product_id,
        prep_method
      `)
      .eq('site_id', siteId)
      .eq('is_active', true);

    // Get product names from ingredients library
    const stocklyIds = (products || []).map(p => p.stockly_product_id).filter(Boolean);
    let productNameMap = new Map<string, string>();
    if (stocklyIds.length > 0) {
      const { data: ingredients } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name')
        .in('id', stocklyIds);
      productNameMap = new Map((ingredients || []).map(i => [i.id, i.ingredient_name || 'Unknown']));
    }

    // Build product info map
    const productInfoMap = new Map(
      (products || []).map(p => [p.id, {
        name: productNameMap.get(p.stockly_product_id) || 'Unknown',
        bake_group_id: p.bake_group_id,
        prep_method: p.prep_method || 'fresh',
        equipment_type_id: p.equipment_type_id,
        items_per_equipment: p.items_per_equipment,
        items_per_tray: p.items_per_tray,
        display_order: p.display_order || 0,
        stockly_product_id: p.stockly_product_id,
      }])
    );

    // Get order lines with customer destination groups and ship_state
    const { data: orderLines } = await supabase
      .from('planly_order_lines')
      .select(`
        id,
        product_id,
        quantity,
        ship_state,
        order:planly_orders!inner(
          id,
          delivery_date,
          status,
          customer:planly_customers!inner(
            id,
            destination_group_id
          )
        )
      `)
      .eq('order.delivery_date', deliveryDate)
      .in('order.status', ['confirmed', 'locked']);

    // Group order lines by destination group and product
    // Only include non-frozen orders (ship_state !== 'frozen')
    const ordersByDestination = new Map<string, Map<string, number>>();

    for (const line of orderLines || []) {
      // Skip frozen orders - they don't go on baking trays
      if (line.ship_state === 'frozen') continue;

      const destGroupId = line.order?.customer?.destination_group_id || 'unassigned';

      if (!ordersByDestination.has(destGroupId)) {
        ordersByDestination.set(destGroupId, new Map());
      }

      const productMap = ordersByDestination.get(destGroupId)!;
      const currentQty = productMap.get(line.product_id) || 0;
      productMap.set(line.product_id, currentQty + line.quantity);
    }

    // Build tray layout for each destination group with GLOBAL tray numbering
    const result: TrayLayoutDestinationGroup[] = [];
    let globalTrayNumber = 1;  // Sequential across ALL destination groups

    // Track product assignments to trays for grid view
    const productTrayAssignments = new Map<string, Map<number, number>>();  // product_id -> (tray_number -> qty)

    const allDestGroups = [
      ...(destinationGroups || []),
      ...(ordersByDestination.has('unassigned') ? [{
        id: 'unassigned',
        name: 'Unassigned',
        bake_deadline: null,
        dispatch_time: null,
        priority: 999,
      }] : []),
    ];

    for (const destGroup of allDestGroups) {
      const destOrders = ordersByDestination.get(destGroup.id);
      if (!destOrders || destOrders.size === 0) continue;

      const equipment: TrayLayoutEquipment[] = [];
      let localTrayNumber = 1;
      const trayStart = globalTrayNumber;

      // Sort bake groups by priority
      const sortedBakeGroups = [...(bakeGroups || [])].sort((a, b) => a.priority - b.priority);

      for (const bakeGroup of sortedBakeGroups) {
        // Get products in this bake group, sorted by display_order
        const bakeGroupProducts = (products || [])
          .filter(p => p.bake_group_id === bakeGroup.id)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        let currentUsed = 0;
        let currentItems: TrayLayoutItem[] = [];
        let currentCapacity = 0;

        for (const product of bakeGroupProducts) {
          const orderQty = destOrders.get(product.id) || 0;
          if (orderQty === 0) continue;

          // Get product info for name lookup
          const productInfo = productInfoMap.get(product.id);

          // Determine capacity for this product using profile resolution
          const capacity = resolveCapacity(product, bakeGroup, equipmentTypeMap);

          // If capacity changes and we have items, flush current equipment
          if (currentCapacity > 0 && capacity !== currentCapacity && currentItems.length > 0) {
            equipment.push({
              number: globalTrayNumber,
              local_number: localTrayNumber,
              bake_group: bakeGroup.name,
              bake_group_id: bakeGroup.id,
              items: [...currentItems],
              used: currentUsed,
              capacity: currentCapacity,
            });
            globalTrayNumber++;
            localTrayNumber++;
            currentUsed = 0;
            currentItems = [];
          }
          currentCapacity = capacity;

          const productName = productInfo?.name || 'Unknown Product';
          let remaining = orderQty;

          while (remaining > 0) {
            const space = capacity - currentUsed;
            const place = Math.min(space, remaining);

            currentItems.push({
              product: productName,
              product_id: product.id,
              qty: place
            });

            // Track assignment for grid view
            if (!productTrayAssignments.has(product.id)) {
              productTrayAssignments.set(product.id, new Map());
            }
            const productTrays = productTrayAssignments.get(product.id)!;
            const currentTrayQty = productTrays.get(globalTrayNumber) || 0;
            productTrays.set(globalTrayNumber, currentTrayQty + place);

            currentUsed += place;
            remaining -= place;

            if (currentUsed >= capacity) {
              equipment.push({
                number: globalTrayNumber,
                local_number: localTrayNumber,
                bake_group: bakeGroup.name,
                bake_group_id: bakeGroup.id,
                items: [...currentItems],
                used: currentUsed,
                capacity: capacity,
              });
              globalTrayNumber++;
              localTrayNumber++;
              currentUsed = 0;
              currentItems = [];
            }
          }
        }

        // Flush partial equipment at end of bake group
        if (currentItems.length > 0) {
          equipment.push({
            number: globalTrayNumber,
            local_number: localTrayNumber,
            bake_group: bakeGroup.name,
            bake_group_id: bakeGroup.id,
            items: [...currentItems],
            used: currentUsed,
            capacity: currentCapacity,
          });
          globalTrayNumber++;
          localTrayNumber++;
          currentUsed = 0;
          currentItems = [];
        }
      }

      // Calculate summary
      const totalEquipment = equipment.length;
      const totalItems = equipment.reduce((sum, e) => sum + e.used, 0);
      const totalCapacity = equipment.reduce((sum, e) => sum + e.capacity, 0);
      const utilizationPercent = totalCapacity > 0
        ? Math.round((totalItems / totalCapacity) * 100)
        : 0;

      result.push({
        destination_group_id: destGroup.id,
        destination_group_name: destGroup.name,
        bake_deadline: destGroup.bake_deadline,
        dispatch_time: destGroup.dispatch_time,
        tray_start: trayStart,
        tray_end: globalTrayNumber - 1,
        equipment,
        summary: {
          total_equipment: totalEquipment,
          total_items: totalItems,
          utilization_percent: utilizationPercent,
        },
      });
    }

    // Build grid view - products as rows, trays as columns
    const gridProducts: TrayGridProduct[] = [];
    const allTrayNumbers = new Set<number>();

    for (const [productId, trayMap] of productTrayAssignments) {
      const productInfo = productInfoMap.get(productId);
      if (!productInfo) continue;

      const bakeGroup = bakeGroupMap.get(productInfo.bake_group_id);
      const traysObj: Record<number, number> = {};
      let total = 0;

      for (const [trayNum, qty] of trayMap) {
        traysObj[trayNum] = qty;
        total += qty;
        allTrayNumbers.add(trayNum);
      }

      gridProducts.push({
        product_id: productId,
        product_name: productInfo.name,
        bake_group_id: productInfo.bake_group_id,
        bake_group_name: bakeGroup?.name || 'Unknown',
        prep_method: productInfo.prep_method,
        trays: traysObj,
        total,
      });
    }

    // Sort grid products by bake group priority, then display order
    gridProducts.sort((a, b) => {
      const bgA = bakeGroupMap.get(a.bake_group_id);
      const bgB = bakeGroupMap.get(b.bake_group_id);
      const priorityA = bgA?.priority ?? 999;
      const priorityB = bgB?.priority ?? 999;
      if (priorityA !== priorityB) return priorityA - priorityB;

      const productA = products?.find(p => p.id === a.product_id);
      const productB = products?.find(p => p.id === b.product_id);
      return (productA?.display_order || 0) - (productB?.display_order || 0);
    });

    // Group products by prep_method for grid sections
    const gridByPrepMethod = new Map<string, TrayGridProduct[]>();
    for (const product of gridProducts) {
      const method = product.prep_method || 'fresh';
      if (!gridByPrepMethod.has(method)) {
        gridByPrepMethod.set(method, []);
      }
      gridByPrepMethod.get(method)!.push(product);
    }

    const gridSections: TrayGridSection[] = [];
    const prepMethodOrder = ['laminated', 'fresh', 'frozen', 'par_baked'];

    for (const method of prepMethodOrder) {
      const products = gridByPrepMethod.get(method);
      if (products && products.length > 0) {
        // Get all tray numbers used by products in this section
        const sectionTrayNumbers = new Set<number>();
        for (const p of products) {
          for (const trayNum of Object.keys(p.trays)) {
            sectionTrayNumbers.add(parseInt(trayNum));
          }
        }

        gridSections.push({
          prep_method: method,
          products,
          tray_numbers: Array.from(sectionTrayNumbers).sort((a, b) => a - b),
        });
      }
    }

    return NextResponse.json({
      delivery_date: deliveryDate,
      total_trays: globalTrayNumber - 1,
      destination_groups: result,
      // New grid format
      tray_grid: {
        all_tray_numbers: Array.from(allTrayNumbers).sort((a, b) => a - b),
        sections: gridSections,
        products: gridProducts,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/planly/production-plan/tray-layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
