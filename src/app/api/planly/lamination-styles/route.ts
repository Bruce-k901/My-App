import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/planly/lamination-styles
 *
 * Fetches lamination styles, optionally filtered by base_dough_id.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const baseDoughId = searchParams.get('baseDoughId');
    const includeProducts = searchParams.get('includeProducts') === 'true';

    let query = supabase
      .from('planly_lamination_styles')
      .select(`
        *,
        recipe:recipes!planly_lamination_styles_recipe_id_fkey(id, name, yield_quantity, yield_unit),
        base_dough:planly_base_doughs!planly_lamination_styles_base_dough_id_fkey(id, name, recipe_id, mix_lead_days)
      `)
      .order('display_order', { ascending: true });

    if (baseDoughId) {
      query = query.eq('base_dough_id', baseDoughId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching lamination styles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If includeProducts, fetch product counts
    if (includeProducts && data) {
      const styleIds = data.map(s => s.id);

      const { data: products } = await supabase
        .from('planly_products')
        .select('id, lamination_style_id')
        .in('lamination_style_id', styleIds);

      const productCounts = new Map<string, number>();
      for (const p of products || []) {
        if (p.lamination_style_id) {
          productCounts.set(p.lamination_style_id, (productCounts.get(p.lamination_style_id) || 0) + 1);
        }
      }

      const enrichedData = data.map(s => ({
        ...s,
        product_count: productCounts.get(s.id) || 0
      }));

      return NextResponse.json(enrichedData);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/lamination-styles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/planly/lamination-styles
 *
 * Creates a new lamination style under a base dough.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      base_dough_id,
      name,
      recipe_id,
      products_per_sheet,
      dough_per_sheet_g,
      laminate_lead_days
    } = body;

    if (!base_dough_id || !name) {
      return NextResponse.json(
        { error: 'base_dough_id and name are required' },
        { status: 400 }
      );
    }

    if (!products_per_sheet || products_per_sheet < 1) {
      return NextResponse.json(
        { error: 'products_per_sheet must be at least 1' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get max display_order for this base dough
    const { data: existing } = await supabase
      .from('planly_lamination_styles')
      .select('display_order')
      .eq('base_dough_id', base_dough_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('planly_lamination_styles')
      .insert({
        base_dough_id,
        name: name.trim(),
        recipe_id: recipe_id || null,
        products_per_sheet: products_per_sheet,
        dough_per_sheet_g: dough_per_sheet_g ?? null,
        laminate_lead_days: laminate_lead_days ?? 1,
        display_order: nextOrder,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select(`
        *,
        recipe:recipes!planly_lamination_styles_recipe_id_fkey(id, name, yield_quantity, yield_unit)
      `)
      .single();

    if (error) {
      console.error('Error creating lamination style:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A lamination style with this name already exists for this base dough' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/lamination-styles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
