import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface PriceUpdate {
  product_id: string;
  unit_price: number | null;
  effective_to: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { customer_id, prices } = body as {
      customer_id: string;
      prices: PriceUpdate[];
    };

    if (!customer_id) {
      return NextResponse.json(
        { error: 'customer_id is required' },
        { status: 400 }
      );
    }

    // Delete all existing prices for this customer
    const { error: deleteError } = await supabase
      .from('planly_customer_product_prices')
      .delete()
      .eq('customer_id', customer_id);

    if (deleteError) {
      console.error('Error deleting existing prices:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Filter to only prices with a value set
    const validPrices = (prices || []).filter(
      (p) => p.unit_price !== null && p.unit_price !== undefined && p.unit_price > 0
    );

    if (validPrices.length > 0) {
      // Insert new prices
      const { error: insertError } = await supabase
        .from('planly_customer_product_prices')
        .insert(
          validPrices.map((p) => ({
            customer_id,
            product_id: p.product_id,
            unit_price: p.unit_price,
            effective_from: new Date().toISOString(),
            effective_to: p.effective_to || null,
          }))
        );

      if (insertError) {
        console.error('Error inserting prices:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      updated: validPrices.length,
    });
  } catch (error) {
    console.error('Error in POST /api/planly/pricing/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
