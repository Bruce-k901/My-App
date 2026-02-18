// @salsa - SALSA Compliance: Production batch output (finished product) API
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { generateBatchCode } from '@/lib/stockly/batch-codes';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { stock_item_id, quantity, unit, use_by_date, best_before_date, batch_code: manualCode } = body;

    if (!stock_item_id || !quantity) {
      return NextResponse.json({ error: 'stock_item_id and quantity are required' }, { status: 400 });
    }

    // Verify production batch exists
    const { data: batch, error: batchError } = await supabase
      .from('production_batches')
      .select('id, company_id, site_id, status, production_date')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 });
    }

    if (batch.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot add outputs to cancelled batch' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // @salsa — Shelf-life validation: reject use_by_date that exceeds product spec
    if (use_by_date) {
      const { data: specs } = await supabase
        .from('product_specifications')
        .select('shelf_life_days, shelf_life_unit')
        .eq('stock_item_id', stock_item_id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1);

      const activeSpec = specs?.[0];
      if (activeSpec?.shelf_life_days && batch.production_date) {
        const prodDate = new Date(batch.production_date);
        const maxUseBy = new Date(prodDate);
        maxUseBy.setDate(maxUseBy.getDate() + activeSpec.shelf_life_days);

        const providedUseBy = new Date(use_by_date);
        if (providedUseBy > maxUseBy) {
          return NextResponse.json({
            error: `Use-by date exceeds the maximum shelf life of ${activeSpec.shelf_life_days} ${activeSpec.shelf_life_unit || 'days'} from production date`,
            code: 'SHELF_LIFE_EXCEEDED',
            max_use_by_date: maxUseBy.toISOString().split('T')[0],
          }, { status: 400 });
        }
      }
    }

    // Generate output batch code
    const outputBatchCode = manualCode || await generateBatchCode(supabase, batch.company_id, {
      format: 'FP-{YYYY}-{MMDD}-{SEQ}',
    });

    // Collect allergens from all input batches to inherit
    const { data: inputs } = await supabase
      .from('production_batch_inputs')
      .select('stock_batch:stock_batches(allergens)')
      .eq('production_batch_id', id);

    const inheritedAllergens = new Set<string>();
    inputs?.forEach((input: { stock_batch: { allergens: string[] | null } | null }) => {
      if (input.stock_batch?.allergens) {
        input.stock_batch.allergens.forEach((a: string) => inheritedAllergens.add(a));
      }
    });

    // Create the output record
    const { data: output, error: outputError } = await supabase
      .from('production_batch_outputs')
      .insert({
        company_id: batch.company_id,
        production_batch_id: id,
        stock_item_id,
        batch_code: outputBatchCode,
        quantity,
        unit: unit || null,
        use_by_date: use_by_date || null,
        best_before_date: best_before_date || null,
      })
      .select(`
        *,
        stock_item:stock_items(id, name)
      `)
      .single();

    if (outputError) {
      if (outputError.code === '23505') {
        return NextResponse.json({ error: `Batch code "${outputBatchCode}" already exists` }, { status: 409 });
      }
      return NextResponse.json({ error: outputError.message }, { status: 500 });
    }

    // Create a stock_batch for the finished product with production_batch_id set
    const { data: stockBatch, error: stockBatchError } = await supabase
      .from('stock_batches')
      .insert({
        company_id: batch.company_id,
        site_id: batch.site_id,
        stock_item_id,
        production_batch_id: id,
        batch_code: outputBatchCode,
        quantity_received: quantity,
        quantity_remaining: quantity,
        unit: unit || 'units',
        use_by_date: use_by_date || null,
        best_before_date: best_before_date || null,
        allergens: inheritedAllergens.size > 0 ? Array.from(inheritedAllergens) : null,
        status: 'active',
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (stockBatchError) {
      // Log but don't fail — the output record is created
      console.error('Failed to create stock batch for output:', stockBatchError.message);
    }

    // Create a batch movement for the received finished product
    if (stockBatch) {
      await supabase.from('batch_movements').insert({
        company_id: batch.company_id,
        site_id: batch.site_id,
        batch_id: stockBatch.id,
        movement_type: 'received',
        quantity: quantity,
        reference_type: 'production_batch',
        reference_id: id,
        notes: `Produced from production batch`,
        created_by: user?.id || null,
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...output, stock_batch: stockBatch || null },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to record production output' }, { status: 500 });
  }
}
