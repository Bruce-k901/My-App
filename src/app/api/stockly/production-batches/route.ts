// @salsa - SALSA Compliance: Production batch list + create API
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { generateBatchCode } from '@/lib/stockly/batch-codes';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const siteId = searchParams.get('siteId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const recipeId = searchParams.get('recipeId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    }

    let query = supabase
      .from('production_batches')
      .select(`
        *,
        recipe:recipes(id, name, allergens, may_contain_allergens)
      `)
      .eq('company_id', companyId)
      .order('production_date', { ascending: false });

    if (siteId && siteId !== 'all') {
      query = query.eq('site_id', siteId);
    }
    if (date) {
      query = query.eq('production_date', date);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (recipeId) {
      query = query.eq('recipe_id', recipeId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch production batches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const {
      company_id, site_id, recipe_id, process_template_id,
      production_date, planned_quantity, unit, notes, batch_code: manualCode,
    } = body;

    if (!company_id || !production_date) {
      return NextResponse.json({ error: 'company_id and production_date are required' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Generate batch code if not provided
    const batchCode = manualCode || await generateBatchCode(supabase, company_id, {
      format: 'PB-{YYYY}-{MMDD}-{SEQ}',
      date: new Date(production_date),
      table: 'production_batches',
    });

    // Get allergens from recipe if provided
    let mayContainAllergens: string[] | null = null;
    if (recipe_id) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('may_contain_allergens')
        .eq('id', recipe_id)
        .single();
      if (recipe?.may_contain_allergens) {
        mayContainAllergens = recipe.may_contain_allergens;
      }
    }

    const { data, error } = await supabase
      .from('production_batches')
      .insert({
        company_id,
        site_id: site_id || null,
        batch_code: batchCode,
        recipe_id: recipe_id || null,
        process_template_id: process_template_id || null,
        production_date,
        status: 'planned',
        planned_quantity: planned_quantity || null,
        unit: unit || null,
        notes: notes || null,
        may_contain_allergens: mayContainAllergens,
        created_by: user?.id || null,
      })
      .select(`
        *,
        recipe:recipes(id, name, allergens, may_contain_allergens)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Batch code "${batchCode}" already exists` }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create production batch' }, { status: 500 });
  }
}
