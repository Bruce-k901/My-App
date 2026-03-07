import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';

/**
 * GET /api/stockly/customers/[id]/pricing
 * Fetch all products with custom prices for this customer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'No supplier found for this user' },
        { status: 404 }
      );
    }

    const { id } = params;

    // Verify customer ownership
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id, supplier_id')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Fetch all products for this supplier
    const { data: products, error: productsError } = await supabase
      .from('order_book_products')
      .select('id, name, category, base_price, unit')
      .eq('supplier_id', supplierId)
      .eq('is_active', true)
      .order('name');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json(
        { error: productsError.message || 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // Fetch custom prices for this customer
    const { data: customPricing, error: pricingError } = await supabase
      .from('order_book_customer_pricing')
      .select('product_id, custom_price, custom_bulk_discounts')
      .eq('customer_id', id);

    if (pricingError) {
      console.error('Error fetching custom pricing:', pricingError);
      return NextResponse.json(
        { error: pricingError.message || 'Failed to fetch custom pricing' },
        { status: 500 }
      );
    }

    // Create map of custom prices
    const pricingMap = new Map(
      (customPricing || []).map((cp: any) => [cp.product_id, cp])
    );

    // Combine products with custom pricing
    const productsWithPricing = (products || []).map((product: any) => {
      const customPrice = pricingMap.get(product.id);
      const basePrice = parseFloat(product.base_price) || 0;
      const customPriceValue = customPrice?.custom_price
        ? parseFloat(customPrice.custom_price)
        : null;

      let discountPercent = null;
      if (customPriceValue !== null && basePrice > 0) {
        discountPercent = ((basePrice - customPriceValue) / basePrice) * 100;
      }

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        base_price: basePrice,
        custom_price: customPriceValue,
        discount_percent: discountPercent ? Math.round(discountPercent * 100) / 100 : null,
        has_custom_pricing: customPriceValue !== null,
        custom_bulk_discounts: customPrice?.custom_bulk_discounts || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: productsWithPricing,
    });
  } catch (error: any) {
    console.error('Error in GET /api/stockly/customers/[id]/pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stockly/customers/[id]/pricing
 * Set custom price for a product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'No supplier found for this user' },
        { status: 404 }
      );
    }

    const { id } = params;
    const body = await request.json();

    if (!body.product_id || body.custom_price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, custom_price' },
        { status: 400 }
      );
    }

    // Verify customer ownership
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id, supplier_id')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify product belongs to supplier
    const { data: product } = await supabase
      .from('order_book_products')
      .select('id, supplier_id')
      .eq('id', body.product_id)
      .eq('supplier_id', supplierId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Upsert custom pricing
    const { data: customPricing, error: upsertError } = await supabase
      .from('order_book_customer_pricing')
      .upsert(
        {
          customer_id: id,
          product_id: body.product_id,
          custom_price: parseFloat(body.custom_price),
          custom_bulk_discounts: body.custom_bulk_discounts || null,
        },
        {
          onConflict: 'customer_id,product_id',
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error setting custom price:', upsertError);
      return NextResponse.json(
        { error: upsertError.message || 'Failed to set custom price' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Custom price set successfully',
      data: customPricing,
    });
  } catch (error: any) {
    console.error('Error in POST /api/stockly/customers/[id]/pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

