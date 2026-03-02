// @salsa - SALSA Compliance: Product specification detail API (get, update with versioning, delete)
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/specifications/[id]
 * Get spec with version history.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const { data: spec, error } = await supabase
      .from('product_specifications')
      .select(`
        *,
        stock_item:stock_items(id, name),
        supplier:suppliers(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !spec) {
      return NextResponse.json({ error: 'Specification not found' }, { status: 404 });
    }

    // @salsa — Fetch version history
    const { data: history } = await supabase
      .from('product_specification_history')
      .select('*, archived_by_profile:profiles!archived_by(full_name)')
      .eq('spec_id', id)
      .order('archived_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: { ...spec, history: history || [] },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch specification' }, { status: 500 });
  }
}

/**
 * PATCH /api/stockly/specifications/[id]
 * Update spec — archives old version, increments version_number.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();

    // @salsa — Get current spec for archiving
    const { data: current, error: fetchError } = await supabase
      .from('product_specifications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Specification not found' }, { status: 404 });
    }

    // @salsa — Archive current version to history
    await supabase.from('product_specification_history').insert({
      spec_id: id,
      company_id: current.company_id,
      stock_item_id: current.stock_item_id,
      version_number: current.version_number,
      allergens: current.allergens,
      may_contain_allergens: current.may_contain_allergens,
      storage_temp_min: current.storage_temp_min,
      storage_temp_max: current.storage_temp_max,
      storage_conditions: current.storage_conditions,
      shelf_life_days: current.shelf_life_days,
      shelf_life_unit: current.shelf_life_unit,
      handling_instructions: current.handling_instructions,
      country_of_origin: current.country_of_origin,
      spec_document_id: current.spec_document_id,
      change_notes: body.change_notes || `Updated to version ${current.version_number + 1}`,
      archived_by: user?.id || null,
    });

    // @salsa — Update spec with new data + increment version
    const updateData: Record<string, unknown> = {
      version_number: current.version_number + 1,
      last_reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id || null,
    };

    const updatableFields = [
      'allergens', 'may_contain_allergens', 'storage_temp_min', 'storage_temp_max',
      'storage_conditions', 'shelf_life_days', 'shelf_life_unit', 'handling_instructions',
      'country_of_origin', 'spec_document_id', 'status', 'next_review_date', 'supplier_id',
    ];

    for (const field of updatableFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('product_specifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update specification' }, { status: 500 });
  }
}

/**
 * DELETE /api/stockly/specifications/[id]
 * Delete a product specification.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const { error } = await supabase
      .from('product_specifications')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete specification' }, { status: 500 });
  }
}
