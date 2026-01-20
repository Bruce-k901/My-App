import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id, company_id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: ratings, error: ratingsError } = await supabase
      .from('order_book_product_ratings')
      .select(`
        *,
        product:order_book_products(id, name, image_url)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      return NextResponse.json(
        { error: ratingsError.message || 'Failed to fetch ratings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ratings || [],
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

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id, company_id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

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
    const { data: existingRating } = await supabase
      .from('order_book_product_ratings')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('product_id', product_id)
      .maybeSingle();

    let ratingData;

    if (existingRating) {
      // Update existing rating
      const { data: updated, error: updateError } = await supabase
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
      const { data: created, error: createError } = await supabase
        .from('order_book_product_ratings')
        .insert({
          company_id: customer.company_id,
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

