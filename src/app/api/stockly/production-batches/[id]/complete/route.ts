// @salsa - SALSA Compliance: Production batch completion API
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json().catch(() => ({}));
    const { actual_quantity, notes } = body;

    // Fetch the full production batch with inputs
    const { data: batch, error: batchError } = await supabase
      .from('production_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 });
    }

    if (batch.status === 'completed') {
      return NextResponse.json({ error: 'Batch is already completed' }, { status: 400 });
    }

    if (batch.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot complete a cancelled batch' }, { status: 400 });
    }

    // Gather all input batch allergens
    const { data: inputs } = await supabase
      .from('production_batch_inputs')
      .select('stock_batch:stock_batches(allergens)')
      .eq('production_batch_id', id);

    const aggregatedAllergens = new Set<string>();
    inputs?.forEach((input: { stock_batch: { allergens: string[] | null } | null }) => {
      if (input.stock_batch?.allergens) {
        input.stock_batch.allergens.forEach((a: string) => aggregatedAllergens.add(a));
      }
    });

    // Get recipe may_contain_allergens
    let mayContain: string[] | null = batch.may_contain_allergens;
    if (batch.recipe_id && !mayContain) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('may_contain_allergens')
        .eq('id', batch.recipe_id)
        .single();
      mayContain = recipe?.may_contain_allergens || null;
    }

    // Calculate yield if we have outputs
    const { data: outputs } = await supabase
      .from('production_batch_outputs')
      .select('quantity')
      .eq('production_batch_id', id);

    const totalOutput = outputs?.reduce((sum: number, o: { quantity: number | null }) => sum + (o.quantity || 0), 0) || 0;

    // Update the production batch to completed
    const updates: Record<string, unknown> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      allergens: aggregatedAllergens.size > 0 ? Array.from(aggregatedAllergens) : null,
      may_contain_allergens: mayContain,
    };

    if (actual_quantity !== undefined) {
      updates.actual_quantity = actual_quantity;
    } else if (totalOutput > 0) {
      updates.actual_quantity = totalOutput;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    const { data, error } = await supabase
      .from('production_batches')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        recipe:recipes(id, name, allergens, may_contain_allergens)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to complete production batch' }, { status: 500 });
  }
}
