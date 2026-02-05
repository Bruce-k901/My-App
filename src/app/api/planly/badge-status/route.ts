import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import type { PlanlyBadgeData } from '@/types/planly';

/**
 * GET /api/planly/badge-status
 *
 * Returns Planly badge status for one or more ingredients.
 * Used to display Planly integration badges on Stockly pages.
 *
 * Query params:
 * - ingredientId: single ingredient ID
 * - ingredientIds: comma-separated list of ingredient IDs
 * - siteId: optional site filter
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const ingredientId = searchParams.get('ingredientId');
    const ingredientIds = searchParams.get('ingredientIds');
    const siteId = searchParams.get('siteId');

    // Parse ingredient IDs
    let ids: string[] = [];
    if (ingredientId) {
      ids = [ingredientId];
    } else if (ingredientIds) {
      ids = ingredientIds.split(',').map(id => id.trim()).filter(Boolean);
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'ingredientId or ingredientIds required' }, { status: 400 });
    }

    // Query planly_products to find linked products
    let query = supabase
      .from('planly_products')
      .select(`
        id,
        stockly_product_id,
        processing_group_id,
        bake_group_id,
        equipment_type_id,
        base_prep_grams_per_unit,
        items_per_equipment,
        is_active,
        processing_group:planly_processing_groups(name),
        bake_group:planly_bake_groups(name)
      `)
      .in('stockly_product_id', ids);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching Planly status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build status map for each ingredient ID
    const statusMap: Record<string, PlanlyBadgeData> = {};

    for (const id of ids) {
      const linkedProducts = (products || []).filter(p => p.stockly_product_id === id);

      if (linkedProducts.length === 0) {
        statusMap[id] = {
          is_linked: false,
        };
        continue;
      }

      // Aggregate group names
      const groupNames: string[] = [];
      linkedProducts.forEach(p => {
        if (p.processing_group?.name && !groupNames.includes(p.processing_group.name)) {
          groupNames.push(p.processing_group.name);
        }
        if (p.bake_group?.name && !groupNames.includes(p.bake_group.name)) {
          groupNames.push(p.bake_group.name);
        }
      });

      // Check configuration completeness
      const missingFields: string[] = [];
      const firstProduct = linkedProducts[0];

      // For production planning, we need processing_group or bake_group
      const hasProductionConfig = linkedProducts.some(
        p => p.processing_group_id || p.bake_group_id
      );

      if (!hasProductionConfig) {
        missingFields.push('production group');
      }

      // Determine configuration status
      let configStatus: 'ready' | 'incomplete' | 'not_configured';
      if (missingFields.length === 0 && hasProductionConfig) {
        configStatus = 'ready';
      } else if (hasProductionConfig || linkedProducts.some(p => p.is_active)) {
        configStatus = 'incomplete';
      } else {
        configStatus = 'not_configured';
      }

      // Build warning message
      let warningMessage: string | undefined;
      if (missingFields.length > 0) {
        warningMessage = `Missing: ${missingFields.join(', ')}`;
      }

      statusMap[id] = {
        is_linked: true,
        linked_groups: groupNames,
        configuration_status: configStatus,
        missing_fields: missingFields.length > 0 ? missingFields : undefined,
        warning_message: warningMessage,
      };
    }

    // Return single item or map based on input
    if (ingredientId && !ingredientIds) {
      return NextResponse.json(statusMap[ingredientId] || { is_linked: false });
    }

    return NextResponse.json(statusMap);
  } catch (error) {
    console.error('Error in GET /api/planly/badge-status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
