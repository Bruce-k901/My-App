import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/planly/lamination-styles/[id]
 *
 * Fetches a single lamination style with relations.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('planly_lamination_styles')
      .select(`
        *,
        recipe:recipes!planly_lamination_styles_recipe_id_fkey(id, name, yield_quantity, yield_unit),
        base_dough:planly_base_doughs!planly_lamination_styles_base_dough_id_fkey(
          id, name, recipe_id, mix_lead_days,
          recipe:recipes!planly_base_doughs_recipe_id_fkey(id, name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lamination style not found' }, { status: 404 });
      }
      console.error('Error fetching lamination style:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/lamination-styles/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/planly/lamination-styles/[id]
 *
 * Updates a lamination style.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      name,
      recipe_id,
      products_per_sheet,
      laminate_lead_days,
      display_order
    } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const updateData: Record<string, any> = {
      updated_by: user?.id,
    };

    if (name !== undefined) updateData.name = name.trim();
    if (recipe_id !== undefined) updateData.recipe_id = recipe_id || null;
    if (products_per_sheet !== undefined) {
      if (products_per_sheet < 1) {
        return NextResponse.json(
          { error: 'products_per_sheet must be at least 1' },
          { status: 400 }
        );
      }
      updateData.products_per_sheet = products_per_sheet;
    }
    if (laminate_lead_days !== undefined) updateData.laminate_lead_days = laminate_lead_days;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data, error } = await supabase
      .from('planly_lamination_styles')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        recipe:recipes!planly_lamination_styles_recipe_id_fkey(id, name, yield_quantity, yield_unit)
      `)
      .single();

    if (error) {
      console.error('Error updating lamination style:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A lamination style with this name already exists for this base dough' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/planly/lamination-styles/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/planly/lamination-styles/[id]
 *
 * Deletes a lamination style.
 * Products linked to this style will have their lamination_style_id set to null.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Check for linked products
    const { count: productCount } = await supabase
      .from('planly_products')
      .select('id', { count: 'exact', head: true })
      .eq('lamination_style_id', id);

    if (productCount && productCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${productCount} product(s) are linked to this lamination style. Reassign them first.`,
          product_count: productCount
        },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('planly_lamination_styles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lamination style:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/planly/lamination-styles/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
