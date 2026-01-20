import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/production/ingredients
 * Get ingredient pull list for a delivery date
 * Query params: date (YYYY-MM-DD) - delivery date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to get company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile or company not found' },
        { status: 404 }
      );
    }

    // Get supplier_id for this company
    const { data: supplier, error: supplierError } = await supabase
      .from('order_book_suppliers')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .maybeSingle();

    if (supplierError) {
      console.error('Error fetching supplier:', supplierError);
      return NextResponse.json(
        { error: 'Failed to fetch supplier' },
        { status: 500 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { error: 'No active supplier found for this company' },
        { status: 404 }
      );
    }

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'date query parameter is required' },
        { status: 400 }
      );
    }

    // Calculate prep date (typically day before delivery)
    const deliveryDate = new Date(date);
    const prepDate = new Date(deliveryDate);
    prepDate.setDate(prepDate.getDate() - 1);

    // Try to get existing ingredient pull list
    const { data: pullList, error: pullListError } = await supabase
      .from('order_book_ingredient_pulls')
      .select('*')
      .eq('supplier_id', supplier.id)
      .eq('delivery_date', date)
      .eq('prep_date', prepDate.toISOString().split('T')[0])
      .maybeSingle();

    // If no pull list exists, calculate it
    let ingredients = [];
    if (!pullList && !pullListError) {
      // Call calculate_ingredient_pulls function
      const { data: pullId, error: calcError } = await supabase.rpc(
        'calculate_ingredient_pulls',
        {
          supplier_id_param: supplier.id,
          delivery_date_param: date
        }
      );

      if (!calcError && pullId) {
        // Fetch the newly created pull list
        const { data: newPullList } = await supabase
          .from('order_book_ingredient_pulls')
          .select('*')
          .eq('id', pullId)
          .single();

        if (newPullList && newPullList.ingredients) {
          ingredients = Array.isArray(newPullList.ingredients) 
            ? newPullList.ingredients 
            : [];
        }
      }
    } else if (pullList && pullList.ingredients) {
      ingredients = Array.isArray(pullList.ingredients) 
        ? pullList.ingredients 
        : [];
    }

    // Format ingredients with stock status
    const formattedIngredients = ingredients.map((ing: any, index: number) => {
      const needed = parseFloat(ing.quantity || 0);
      const stock = parseFloat(ing.stock_level || 0);
      const toPull = Math.max(0, needed - stock);
      
      // Determine stock status
      let stockStatus: 'ok' | 'low' | 'insufficient' = 'ok';
      if (stock < needed) {
        stockStatus = 'insufficient';
      } else if (stock < needed * 1.2) { // Less than 20% buffer
        stockStatus = 'low';
      }

      // Determine pull status (default to pending)
      const pullStatus: 'pending' | 'pulled' | 'insufficient' = 
        stockStatus === 'insufficient' ? 'insufficient' : 'pending';

      return {
        id: ing.id || `ing-${index}`,
        name: ing.ingredient_name || ing.name || 'Unknown Ingredient',
        category: ing.category || 'General',
        needed: needed,
        unit: ing.unit || 'kg',
        stock: stock,
        toPull: toPull,
        status: pullStatus,
        stockStatus: stockStatus
      };
    });

    // Calculate summary
    const totalCount = formattedIngredients.length;
    const pulledCount = formattedIngredients.filter(i => i.status === 'pulled').length;
    const insufficientCount = formattedIngredients.filter(i => i.status === 'insufficient').length;
    const readyPercent = totalCount > 0 
      ? Math.round(((totalCount - insufficientCount) / totalCount) * 100)
      : 100;

    return NextResponse.json({
      success: true,
      data: {
        deliveryDate: date,
        prepDate: prepDate.toISOString().split('T')[0],
        ingredients: formattedIngredients,
        summary: {
          totalCount,
          pulledCount,
          insufficientCount,
          readyPercent
        }
      }
    });
  } catch (error) {
    console.error('Error in production ingredients API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

