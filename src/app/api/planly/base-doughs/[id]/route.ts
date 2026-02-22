import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/planly/base-doughs/[id]
 *
 * Fetches a single base dough with all relations.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('planly_base_doughs')
      .select(`
        *,
        recipe:recipes!planly_base_doughs_recipe_id_fkey(id, name, yield_quantity, yield_unit),
        lamination_styles:planly_lamination_styles(
          *,
          recipe:recipes!planly_lamination_styles_recipe_id_fkey(id, name, yield_quantity, yield_unit)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Base dough not found' }, { status: 404 });
      }
      console.error('Error fetching base dough:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/base-doughs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/planly/base-doughs/[id]
 *
 * Updates a base dough configuration.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { name, recipe_id, mix_lead_days, batch_size_kg, units_per_batch, is_active, display_order } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const updateData: Record<string, any> = {
      updated_by: user?.id,
    };

    if (name !== undefined) updateData.name = name.trim();
    if (recipe_id !== undefined) updateData.recipe_id = recipe_id || null;
    if (mix_lead_days !== undefined) updateData.mix_lead_days = mix_lead_days;
    if (batch_size_kg !== undefined) updateData.batch_size_kg = batch_size_kg || null;
    if (units_per_batch !== undefined) updateData.units_per_batch = units_per_batch || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data, error } = await supabase
      .from('planly_base_doughs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        recipe:recipes!planly_base_doughs_recipe_id_fkey(id, name, yield_quantity, yield_unit),
        lamination_styles:planly_lamination_styles(
          *,
          recipe:recipes!planly_lamination_styles_recipe_id_fkey(id, name, yield_quantity, yield_unit)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating base dough:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A base dough with this name already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/planly/base-doughs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/planly/base-doughs/[id]
 *
 * Deletes a base dough (cascades to lamination styles).
 * Products linked to this dough will have their base_dough_id set to null.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Check for linked products
    const { count: directProductCount } = await supabase
      .from('planly_products')
      .select('id', { count: 'exact', head: true })
      .eq('base_dough_id', id);

    // Check for products linked via lamination styles
    const { data: styles } = await supabase
      .from('planly_lamination_styles')
      .select('id')
      .eq('base_dough_id', id);

    const styleIds = (styles || []).map(s => s.id);
    let styleProductCount = 0;

    if (styleIds.length > 0) {
      const { count } = await supabase
        .from('planly_products')
        .select('id', { count: 'exact', head: true })
        .in('lamination_style_id', styleIds);
      styleProductCount = count || 0;
    }

    const totalProducts = (directProductCount || 0) + styleProductCount;

    if (totalProducts > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${totalProducts} product(s) are linked to this base dough or its lamination styles. Reassign them first.`,
          product_count: totalProducts
        },
        { status: 409 }
      );
    }

    // Delete the base dough (lamination styles cascade)
    const { error } = await supabase
      .from('planly_base_doughs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting base dough:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/planly/base-doughs/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
