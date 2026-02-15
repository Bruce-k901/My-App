import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/planly/base-doughs
 *
 * Fetches all base doughs for a site, with optional recipe and lamination style relations.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const includeStyles = searchParams.get('includeStyles') === 'true';
    const includeProducts = searchParams.get('includeProducts') === 'true';

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('planly_base_doughs')
      .select(`
        *,
        recipe:recipes!planly_base_doughs_recipe_id_fkey(id, name, yield_quantity, yield_unit)
        ${includeStyles ? `,lamination_styles:planly_lamination_styles(
          *,
          recipe:recipes!planly_lamination_styles_recipe_id_fkey(id, name, yield_quantity, yield_unit)
        )` : ''}
      `)
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching base doughs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If includeProducts, fetch product counts for each base dough
    if (includeProducts && data) {
      const doughIds = data.map(d => d.id);

      // Get products linked directly to base doughs (non-laminated)
      const { data: directProducts } = await supabase
        .from('planly_products')
        .select('id, base_dough_id')
        .in('base_dough_id', doughIds);

      // Get products linked via lamination styles
      const styleIds = data.flatMap(d =>
        (d.lamination_styles || []).map((s: any) => s.id)
      );

      const { data: styleProducts } = styleIds.length > 0
        ? await supabase
            .from('planly_products')
            .select('id, lamination_style_id')
            .in('lamination_style_id', styleIds)
        : { data: [] };

      // Count products per base dough
      const productCounts = new Map<string, number>();

      for (const p of directProducts || []) {
        if (p.base_dough_id) {
          productCounts.set(p.base_dough_id, (productCounts.get(p.base_dough_id) || 0) + 1);
        }
      }

      // Map style products to their base dough
      const styleToBaseDough = new Map<string, string>();
      for (const dough of data) {
        for (const style of dough.lamination_styles || []) {
          styleToBaseDough.set(style.id, dough.id);
        }
      }

      for (const p of styleProducts || []) {
        if (p.lamination_style_id) {
          const baseDoughId = styleToBaseDough.get(p.lamination_style_id);
          if (baseDoughId) {
            productCounts.set(baseDoughId, (productCounts.get(baseDoughId) || 0) + 1);
          }
        }
      }

      // Add counts to response
      const enrichedData = data.map(d => ({
        ...d,
        product_count: productCounts.get(d.id) || 0
      }));

      return NextResponse.json(enrichedData);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/base-doughs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/planly/base-doughs
 *
 * Creates a new base dough configuration.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { site_id, name, recipe_id, mix_lead_days, batch_size_kg, units_per_batch } = body;

    if (!site_id || !name) {
      return NextResponse.json(
        { error: 'site_id and name are required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get max display_order
    const { data: existing } = await supabase
      .from('planly_base_doughs')
      .select('display_order')
      .eq('site_id', site_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('planly_base_doughs')
      .insert({
        site_id,
        name: name.trim(),
        recipe_id: recipe_id || null,
        mix_lead_days: mix_lead_days ?? 0,
        batch_size_kg: batch_size_kg || null,
        units_per_batch: units_per_batch || null,
        display_order: nextOrder,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select(`
        *,
        recipe:recipes!planly_base_doughs_recipe_id_fkey(id, name, yield_quantity, yield_unit)
      `)
      .single();

    if (error) {
      console.error('Error creating base dough:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A base dough with this name already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/base-doughs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
