import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

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

    // Check if user is a platform admin for RLS bypass
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_platform_admin, app_role, company_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    const isPlatformAdmin = !!(profileData?.is_platform_admin || profileData?.app_role === 'Owner');
    const client = isPlatformAdmin ? getSupabaseAdmin() : supabase;

    const supplierId = request.nextUrl.searchParams.get('supplier_id');

    // If supplier_id not provided, try to get from user's company
    let finalSupplierId = supplierId;
    if (!finalSupplierId) {
      const companyId = profileData?.company_id;

      if (companyId) {
        // Find supplier for this company
        const { data: supplier } = await client
          .from('order_book_suppliers')
          .select('id')
          .eq('company_id', companyId)
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

    // Get products
    const { data: products, error } = await client
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

