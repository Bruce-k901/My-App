import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { resolveCustomer, getCustomerAdmin } from '@/lib/customer-auth';

/**
 * GET /api/customer/ratings
 * Get customer's product ratings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await resolveCustomer(request, supabase, user);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const admin = getCustomerAdmin();

    const { data: ratings, error: ratingsError } = await admin
      .from('order_book_product_ratings')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      return NextResponse.json(
        { error: ratingsError.message || 'Failed to fetch ratings' },
        { status: 500 }
      );
    }

    // Resolve product names from planly_products → ingredients_library
    const productIds = [...new Set((ratings || []).map((r: any) => r.product_id))];
    let productNameMap = new Map<string, string>();

    if (productIds.length > 0) {
      const { data: planlyProducts } = await admin
        .from('planly_products')
        .select('id, stockly_product_id')
        .in('id', productIds);

      const stocklyIds = (planlyProducts || []).map(p => p.stockly_product_id).filter(Boolean);
      if (stocklyIds.length > 0) {
        const { data: ingredients } = await admin
          .from('ingredients_library')
          .select('id, ingredient_name')
          .in('id', stocklyIds);

        const ingMap = new Map((ingredients || []).map(i => [i.id, i.ingredient_name]));
        (planlyProducts || []).forEach(p => {
          const name = ingMap.get(p.stockly_product_id);
          if (name) productNameMap.set(p.id, name);
        });
      }
    }

    // Attach product info to ratings
    const ratingsWithProducts = (ratings || []).map((r: any) => ({
      ...r,
      product: {
        id: r.product_id,
        name: productNameMap.get(r.product_id) || 'Unknown Product',
      },
    }));

    return NextResponse.json({
      success: true,
      data: ratingsWithProducts,
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/ratings:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/ratings
 * Create or update product rating
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await resolveCustomer(request, supabase, user);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const admin = getCustomerAdmin();

    // Get company_id from site
    const { data: site } = await admin
      .from('sites')
      .select('company_id')
      .eq('id', customer.site_id)
      .single();

    const body = await request.json();
    const {
      product_id,
      rating,
      comment,
      taste_rating,
      freshness_rating,
      consistency_rating,
      value_rating,
      related_order_id,
    } = body;

    if (!product_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, rating' },
        { status: 400 }
      );
    }

    // Check if rating exists
    const { data: existingRating } = await admin
      .from('order_book_product_ratings')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('product_id', product_id)
      .maybeSingle();

    let ratingData;

    if (existingRating) {
      // Update existing rating
      const { data: updated, error: updateError } = await admin
        .from('order_book_product_ratings')
        .update({
          rating,
          comment,
          taste_rating,
          freshness_rating,
          consistency_rating,
          value_rating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRating.id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      ratingData = updated;
    } else {
      // Create new rating
      const { data: created, error: createError } = await admin
        .from('order_book_product_ratings')
        .insert({
          company_id: site?.company_id,
          customer_id: customer.id,
          product_id,
          rating,
          comment,
          taste_rating,
          freshness_rating,
          consistency_rating,
          value_rating,
          related_order_id,
          created_by: user.id,
        })
        .select('*')
        .single();

      if (createError) {
        throw createError;
      }

      ratingData = created;
    }

    return NextResponse.json({
      success: true,
      data: ratingData,
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/ratings:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

