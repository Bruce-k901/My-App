import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const { data: product, error } = await supabase
      .from('planly_products')
      .select(`
        *,
        category:planly_categories(*),
        process_template:planly_process_templates(*),
        bake_group:planly_bake_groups(*),
        list_prices:planly_product_list_prices(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      console.error('Error fetching product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Manually fetch ingredient name (no foreign key)
    if (product?.stockly_product_id) {
      const { data: ingredient } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name, category, unit')
        .eq('id', product.stockly_product_id)
        .single();

      return NextResponse.json({
        ...product,
        stockly_product: ingredient || null
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in GET /api/planly/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update product fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'category_id',
      'process_template_id',
      'bake_group_id',
      'items_per_tray',
      'tray_type',
      'can_ship_frozen',
      'default_ship_state',
      'is_vatable',
      'vat_rate',
      'is_active',
      'description',
      'is_new',
      'is_paused',
      'archived_at',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: product, error } = await supabase
      .from('planly_products')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        category:planly_categories(*),
        process_template:planly_process_templates(*),
        bake_group:planly_bake_groups(*)
      `)
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Manually fetch ingredient name (no foreign key)
    if (product?.stockly_product_id) {
      const { data: ingredient } = await supabase
        .from('ingredients_library')
        .select('id, ingredient_name, category, unit')
        .eq('id', product.stockly_product_id)
        .single();

      return NextResponse.json({
        ...product,
        stockly_product: ingredient || null
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in PATCH /api/planly/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product (or archive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const archive = searchParams.get('archive') === 'true';

    if (archive) {
      // Archive instead of hard delete
      const { error } = await supabase
        .from('planly_products')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error archiving product:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, archived: true });
    }

    // Hard delete
    const { error } = await supabase
      .from('planly_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/planly/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
