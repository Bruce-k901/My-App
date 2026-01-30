import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/order-book/products
 * Get product catalog for a supplier
 * Query params: supplier_id (optional - will use user's supplier if available)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplierId = request.nextUrl.searchParams.get('supplier_id');

    // If supplier_id not provided, try to get from user's company
    let finalSupplierId = supplierId;
    if (!finalSupplierId) {
      // Get user's profile to find their company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.company_id) {
        // Find supplier for this company
        const { data: supplier } = await supabase
          .from('order_book_suppliers')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('is_active', true)
          .maybeSingle();

        if (supplier) {
          finalSupplierId = supplier.id;
        }
      }
    }

    if (!finalSupplierId) {
      return NextResponse.json(
        { error: 'supplier_id is required or user must be associated with a supplier' },
        { status: 400 }
      );
    }

    // Get products (RLS will filter based on user's access)
    const { data: products, error } = await supabase
      .from('order_book_products')
      .select('*')
      .eq('supplier_id', finalSupplierId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: products || [],
      count: products?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in GET /api/order-book/products:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

