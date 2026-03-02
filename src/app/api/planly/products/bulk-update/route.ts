import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/planly/products/bulk-update
 *
 * Updates multiple products with the same field values.
 * Used by the Production Setup Wizard to link products to base doughs or lamination styles.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { product_ids, updates } = body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { error: 'product_ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    // Whitelist allowed update fields for security
    const allowedFields = [
      'category_id',
      'bake_group_id',
      'processing_group_id',
      'base_dough_id',
      'lamination_style_id',
      'equipment_type_id',
      'items_per_equipment',
      'base_prep_grams_per_unit',
    ];

    const sanitizedUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    // Perform the bulk update
    const { data, error } = await supabase
      .from('planly_products')
      .update(sanitizedUpdates)
      .in('id', product_ids)
      .select('id');

    if (error) {
      console.error('Error in bulk update:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      product_ids: data?.map(p => p.id) || [],
    });
  } catch (error) {
    console.error('Error in POST /api/planly/products/bulk-update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
