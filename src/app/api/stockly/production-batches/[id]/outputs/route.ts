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
    const { stock_item_id, quantity, unit, use_by_date, best_before_date, batch_code: manualCode, output_type } = body;
    const validOutputTypes = ['finished_product', 'byproduct', 'waste'];
    const outputType = validOutputTypes.includes(output_type) ? output_type : 'finished_product';
    const isWaste = outputType === 'waste';

    if (!stock_item_id || !quantity) {
      return NextResponse.json({ error: 'stock_item_id and quantity are required' }, { status: 400 });
    }

    // Verify production batch exists
    const { data: batch, error: batchError } = await supabase
      .from('production_batches')
      .select('id, company_id, site_id, status, production_date, unit')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 });
    }

    if (batch.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot add outputs to cancelled batch' }, { status: 400 });
    }

    // Enforce unit consistency: output must match batch unit
    if (batch.unit && unit && unit !== batch.unit) {
      return NextResponse.json(
        { error: `Output unit must be "${batch.unit}" to match the production batch unit` },
        { status: 400 }
      );
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

    // Generate output batch code (waste doesn't need one)
    let outputBatchCode: string | null = null;
    if (!isWaste) {
      const codeFormat = outputType === 'byproduct' ? 'BP-{YYYY}-{MMDD}-{SEQ}' : 'FP-{YYYY}-{MMDD}-{SEQ}';
      outputBatchCode = manualCode || await generateBatchCode(supabase, batch.company_id, {
        format: codeFormat,
        table: 'stock_batches',
      });
    }

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
        unit: unit || batch.unit || null,
        use_by_date: isWaste ? null : (use_by_date || null),
        best_before_date: isWaste ? null : (best_before_date || null),
        output_type: outputType,
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
      console.error('production_batch_outputs insert error:', outputError.code, outputError.message, outputError.details);
      return NextResponse.json({ error: outputError.message }, { status: 500 });
    }

    // Waste: no stock batch or movement — just recorded for yield tracking
    let stockBatch = null;
    if (!isWaste) {
      // Create a stock_batch for the finished/byproduct with production_batch_id set
      const { data: sb, error: stockBatchError } = await supabase
        .from('stock_batches')
        .insert({
          company_id: batch.company_id,
          site_id: batch.site_id,
          stock_item_id,
          production_batch_id: id,
          batch_code: outputBatchCode,
          quantity_received: quantity,
          quantity_remaining: quantity,
          unit: unit || batch.unit || 'units',
          use_by_date: use_by_date || null,
          best_before_date: best_before_date || null,
          allergens: inheritedAllergens.size > 0 ? Array.from(inheritedAllergens) : null,
          status: 'active',
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (stockBatchError) {
        console.error('Failed to create stock batch for output:', stockBatchError.message);
      }
      stockBatch = sb;

      // Create a batch movement for the received product
      if (stockBatch) {
        const movementNote = outputType === 'byproduct'
          ? 'Byproduct from production batch'
          : 'Produced from production batch';
        await supabase.from('batch_movements').insert({
          company_id: batch.company_id,
          site_id: batch.site_id,
          batch_id: stockBatch.id,
          movement_type: 'received',
          quantity: quantity,
          reference_type: 'production_batch',
          reference_id: id,
          notes: movementNote,
          created_by: user?.id || null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...output, stock_batch: stockBatch || null },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to record production output' }, { status: 500 });
  }
}
