import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const companyId = searchParams.get('companyId');
    const includeCompanyWide = searchParams.get('includeCompanyWide') === 'true';

    let query = supabase
      .from('planly_processing_groups')
      .select(`
        *,
        process_template:planly_process_templates(id, name)
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (siteId) {
      if (includeCompanyWide) {
        // Get both site-specific and company-wide processing groups
        const { data: site } = await supabase
          .from('sites')
          .select('company_id')
          .eq('id', siteId)
          .single();

        if (site) {
          query = query.or(`site_id.eq.${siteId},and(site_id.is.null,company_id.eq.${site.company_id})`);
        } else {
          query = query.eq('site_id', siteId);
        }
      } else {
        query = query.eq('site_id', siteId);
      }
    } else if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: groups, error } = await query;

    if (error) {
      console.error('Error fetching processing groups:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch recipe names for all groups
    if (groups && groups.length > 0) {
      const recipeIds = [...new Set(groups.map(g => g.base_prep_recipe_id).filter(Boolean))];

      if (recipeIds.length > 0) {
        const { data: recipes } = await supabase
          .from('recipes')
          .select('id, name, yield_quantity, yield_unit')
          .in('id', recipeIds);

        const recipeMap = new Map((recipes || []).map(r => [r.id, r]));

        // Attach recipe data to each group
        const groupsWithRecipes = groups.map(group => ({
          ...group,
          base_prep_recipe: recipeMap.get(group.base_prep_recipe_id) || null,
        }));

        // Fetch SOP names
        const sopIds = [...new Set(groups.map(g => g.sop_id).filter(Boolean))];
        if (sopIds.length > 0) {
          const { data: sops } = await supabase
            .from('sop_entries')
            .select('id, title, ref_code')
            .in('id', sopIds);

          const sopMap = new Map((sops || []).map(s => [s.id, s]));

          return NextResponse.json(groupsWithRecipes.map(group => ({
            ...group,
            sop: sopMap.get(group.sop_id) || null,
          })));
        }

        return NextResponse.json(groupsWithRecipes);
      }
    }

    return NextResponse.json(groups || []);
  } catch (error) {
    console.error('Error in GET /api/planly/processing-groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Validate that recipe exists and check yield_unit
    if (body.base_prep_recipe_id) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id, yield_unit')
        .eq('id', body.base_prep_recipe_id)
        .single();

      if (!recipe) {
        return NextResponse.json({ error: 'Base prep recipe not found' }, { status: 400 });
      }

      // Return warning if yield_unit is not kg (but don't block)
      if (recipe.yield_unit && recipe.yield_unit.toLowerCase() !== 'kg') {
        console.warn(`Processing group created with non-kg recipe: ${body.base_prep_recipe_id}, yield_unit: ${recipe.yield_unit}`);
      }
    }

    const { data, error } = await supabase
      .from('planly_processing_groups')
      .insert({
        ...body,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating processing group:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/processing-groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
