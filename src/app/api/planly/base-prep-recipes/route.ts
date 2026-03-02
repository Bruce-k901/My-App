import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/planly/base-prep-recipes
 *
 * Returns recipes that can be used as base prep in processing groups.
 * These are typically "prep" type recipes (doughs, batters, bases).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    // Build query - get recipes that could be base prep
    // Prioritize 'prep' type recipes but include all active recipes
    let query = supabase
      .from('recipes')
      .select('id, name, recipe_type, yield_quantity, yield_unit, is_active')
      .eq('is_active', true)
      .order('recipe_type', { ascending: true }) // 'prep' comes before other types
      .order('name', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching base prep recipes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add info flag for non-kg yield units (conversion happens automatically)
    const recipesWithWarnings = (data || []).map(recipe => ({
      ...recipe,
      yield_unit_warning: recipe.yield_unit && recipe.yield_unit.toLowerCase() !== 'kg'
        ? `Recipe yields in ${recipe.yield_unit} (auto-converted to kg for calculations)`
        : null,
    }));

    return NextResponse.json(recipesWithWarnings);
  } catch (error) {
    console.error('Error in GET /api/planly/base-prep-recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
