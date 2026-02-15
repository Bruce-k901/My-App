import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: group, error } = await supabase
      .from('planly_processing_groups')
      .select(`
        *,
        process_template:planly_process_templates(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching processing group:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!group) {
      return NextResponse.json({ error: 'Processing group not found' }, { status: 404 });
    }

    // Fetch recipe data
    if (group.base_prep_recipe_id) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id, name, yield_quantity, yield_unit')
        .eq('id', group.base_prep_recipe_id)
        .single();

      (group as any).base_prep_recipe = recipe || null;
    }

    // Fetch SOP data
    if (group.sop_id) {
      const { data: sop } = await supabase
        .from('sop_entries')
        .select('id, title, ref_code')
        .eq('id', group.sop_id)
        .single();

      (group as any).sop = sop || null;
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error in GET /api/planly/processing-groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Validate recipe if being updated
    if (body.base_prep_recipe_id) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id, yield_unit')
        .eq('id', body.base_prep_recipe_id)
        .single();

      if (!recipe) {
        return NextResponse.json({ error: 'Base prep recipe not found' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('planly_processing_groups')
      .update({
        ...body,
        updated_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating processing group:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/planly/processing-groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Check if any products are using this processing group
    const { data: products, error: productsError } = await supabase
      .from('planly_products')
      .select('id')
      .eq('processing_group_id', id)
      .limit(1);

    if (productsError) {
      console.error('Error checking products:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    if (products && products.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete processing group that has products assigned. Remove product assignments first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('planly_processing_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting processing group:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/planly/processing-groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
