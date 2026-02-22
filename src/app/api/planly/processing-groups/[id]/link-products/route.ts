import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface LinkProductsRequest {
  product_ids: string[];
  base_prep_grams_per_unit?: number; // Optional: set the same grams for all linked products
}

/**
 * POST /api/planly/processing-groups/{id}/link-products
 *
 * Bulk link products to a processing group.
 * Updates planly_products.processing_group_id for all specified products.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const supabase = await createServerSupabaseClient();
    const body: LinkProductsRequest = await request.json();

    if (!body.product_ids || !Array.isArray(body.product_ids) || body.product_ids.length === 0) {
      return NextResponse.json(
        { error: 'product_ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Verify the processing group exists
    const { data: group, error: groupError } = await supabase
      .from('planly_processing_groups')
      .select('id, name, site_id, company_id')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Processing group not found' },
        { status: 404 }
      );
    }

    // Build the update payload
    const updatePayload: Record<string, unknown> = {
      processing_group_id: groupId,
      updated_at: new Date().toISOString(),
    };

    // Optionally set base_prep_grams_per_unit if provided
    if (body.base_prep_grams_per_unit !== undefined) {
      updatePayload.base_prep_grams_per_unit = body.base_prep_grams_per_unit;
    }

    // Update all products in a single query
    const { data: updatedProducts, error: updateError } = await supabase
      .from('planly_products')
      .update(updatePayload)
      .in('id', body.product_ids)
      .select('id, stockly_product_id');

    if (updateError) {
      console.error('Error linking products:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      linked: updatedProducts?.length || 0,
      group_id: groupId,
      group_name: group.name,
      product_ids: updatedProducts?.map(p => p.id) || [],
    });
  } catch (error) {
    console.error('Error in POST /api/planly/processing-groups/[id]/link-products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/planly/processing-groups/{id}/link-products
 *
 * Unlink products from a processing group.
 * Sets planly_products.processing_group_id to null for specified products.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const supabase = await createServerSupabaseClient();
    const body: { product_ids: string[] } = await request.json();

    if (!body.product_ids || !Array.isArray(body.product_ids) || body.product_ids.length === 0) {
      return NextResponse.json(
        { error: 'product_ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Unlink products (set processing_group_id to null)
    const { data: updatedProducts, error: updateError } = await supabase
      .from('planly_products')
      .update({
        processing_group_id: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', body.product_ids)
      .eq('processing_group_id', groupId) // Only unlink if currently linked to this group
      .select('id');

    if (updateError) {
      console.error('Error unlinking products:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      unlinked: updatedProducts?.length || 0,
      product_ids: updatedProducts?.map(p => p.id) || [],
    });
  } catch (error) {
    console.error('Error in DELETE /api/planly/processing-groups/[id]/link-products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/planly/processing-groups/{id}/link-products
 *
 * Get all products linked to this processing group.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const supabase = await createServerSupabaseClient();

    // Get products linked to this group
    const { data: products, error } = await supabase
      .from('planly_products')
      .select(`
        id,
        stockly_product_id,
        base_prep_grams_per_unit,
        is_active,
        stockly_product:ingredients_library!inner(name)
      `)
      .eq('processing_group_id', groupId)
      .eq('is_active', true)
      .order('stockly_product(name)', { ascending: true });

    if (error) {
      console.error('Error fetching linked products:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Format response
    const formattedProducts = (products || []).map(p => ({
      id: p.id,
      stockly_product_id: p.stockly_product_id,
      name: (p.stockly_product as any)?.name || 'Unknown Product',
      base_prep_grams_per_unit: p.base_prep_grams_per_unit,
    }));

    return NextResponse.json({
      group_id: groupId,
      products: formattedProducts,
      count: formattedProducts.length,
    });
  } catch (error) {
    console.error('Error in GET /api/planly/processing-groups/[id]/link-products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
