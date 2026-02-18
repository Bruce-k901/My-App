// @salsa - SALSA Compliance: Forward traceability API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/traceability/forward?batchId=<stock_batch_id>
 * Forward trace: raw material batch → production → finished goods → customers
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ success: false, error: 'batchId is required' }, { status: 400 });
    }

    // 1. Get the starting batch
    const { data: batch, error: batchErr } = await supabase
      .from('stock_batches')
      .select('*, stock_item:stock_items(id, name, stock_unit)')
      .eq('id', batchId)
      .single();

    if (batchErr || !batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    const nodes: any[] = [];
    const links: any[] = [];
    let totalInput = 0;
    let totalOutput = 0;
    const unit = batch.unit || batch.stock_item?.stock_unit || 'units';

    // 2. Find supplier via delivery_line → delivery → supplier
    if (batch.delivery_line_id) {
      const { data: deliveryLine } = await supabase
        .from('delivery_lines')
        .select('id, delivery:deliveries(id, supplier_id, delivery_date, suppliers(id, name, approval_status))')
        .eq('id', batch.delivery_line_id)
        .single();

      const delivery = (deliveryLine as any)?.delivery;
      const supplier = delivery?.suppliers;

      if (supplier) {
        nodes.push({
          type: 'supplier',
          id: `supplier-${supplier.id}`,
          label: supplier.name,
          sublabel: supplier.approval_status ? `Status: ${supplier.approval_status}` : undefined,
          status: supplier.approval_status,
        });
        links.push({
          from: `supplier-${supplier.id}`,
          to: `batch-${batch.id}`,
          label: 'Supplied',
        });
      }
    }

    // Add the starting batch node
    nodes.push({
      type: 'raw_material_batch',
      id: `batch-${batch.id}`,
      label: batch.batch_code,
      sublabel: batch.stock_item?.name || 'Unknown',
      date: batch.use_by_date || batch.best_before_date,
      quantity: batch.quantity_received,
      unit,
      allergens: batch.allergens || [],
      status: batch.status,
    });
    totalInput += batch.quantity_received || 0;

    // 3. Find production_batch_inputs where this batch was consumed
    const { data: inputs } = await supabase
      .from('production_batch_inputs')
      .select('*, production_batch:production_batches(id, batch_code, production_date, status, recipe:recipes(id, name))')
      .eq('stock_batch_id', batchId);

    if (inputs && inputs.length > 0) {
      for (const input of inputs) {
        const pb = (input as any).production_batch;
        if (!pb) continue;

        const pbNodeId = `production-${pb.id}`;

        // Add production batch node (avoid duplicates)
        if (!nodes.find(n => n.id === pbNodeId)) {
          nodes.push({
            type: 'production_batch',
            id: pbNodeId,
            label: pb.batch_code,
            sublabel: pb.recipe?.name || 'Production',
            date: pb.production_date,
            status: pb.status,
          });
        }

        links.push({
          from: `batch-${batch.id}`,
          to: pbNodeId,
          label: 'Input',
          quantity: input.actual_quantity || input.planned_quantity,
        });

        // 4. Find production_batch_outputs → finished product stock_batches
        const { data: outputs } = await supabase
          .from('production_batch_outputs')
          .select('*, stock_item:stock_items(id, name)')
          .eq('production_batch_id', pb.id);

        if (outputs) {
          for (const output of outputs) {
            // Find the created stock_batch via production_batch_id
            const { data: outputBatches } = await supabase
              .from('stock_batches')
              .select('id, batch_code, quantity_received, unit, use_by_date, status, allergens, stock_item:stock_items(id, name)')
              .eq('production_batch_id', pb.id);

            if (outputBatches) {
              for (const ob of outputBatches) {
                const obNodeId = `batch-${ob.id}`;
                if (!nodes.find(n => n.id === obNodeId)) {
                  nodes.push({
                    type: 'finished_product_batch',
                    id: obNodeId,
                    label: ob.batch_code,
                    sublabel: (ob as any).stock_item?.name || 'Finished product',
                    date: ob.use_by_date,
                    quantity: ob.quantity_received,
                    unit: ob.unit || unit,
                    allergens: ob.allergens || [],
                    status: ob.status,
                  });
                  totalOutput += ob.quantity_received || 0;
                }

                if (!links.find(l => l.from === pbNodeId && l.to === obNodeId)) {
                  links.push({
                    from: pbNodeId,
                    to: obNodeId,
                    label: 'Output',
                    quantity: ob.quantity_received,
                  });
                }

                // 5. Find dispatch records → customers
                const { data: dispatches } = await supabase
                  .from('batch_dispatch_records')
                  .select('*')
                  .eq('stock_batch_id', ob.id);

                if (dispatches) {
                  for (const d of dispatches) {
                    const custNodeId = `customer-${d.customer_id || d.id}`;
                    if (!nodes.find(n => n.id === custNodeId)) {
                      nodes.push({
                        type: 'customer',
                        id: custNodeId,
                        label: d.customer_name,
                        date: d.dispatch_date,
                        quantity: d.quantity,
                        unit: d.unit || unit,
                      });
                    }
                    links.push({
                      from: obNodeId,
                      to: custNodeId,
                      label: 'Dispatched',
                      quantity: d.quantity,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Mass balance
    const variance = totalInput - totalOutput;
    const variancePercent = totalInput > 0 ? (variance / totalInput) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        nodes,
        links,
        batch,
        direction: 'forward',
        mass_balance: {
          total_input: totalInput,
          total_output: totalOutput,
          variance,
          variance_percent: Math.round(variancePercent * 100) / 100,
          unit,
        },
      },
    });
  } catch (error: any) {
    console.error('Forward trace error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
