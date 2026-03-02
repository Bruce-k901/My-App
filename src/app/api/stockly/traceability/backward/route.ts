// @salsa - SALSA Compliance: Backward traceability API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/traceability/backward?batchId=<stock_batch_id>
 * Backward trace: finished product batch → production → raw materials → suppliers
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ success: false, error: 'batchId is required' }, { status: 400 });
    }

    // 1. Get the starting batch (finished product)
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

    // Add starting batch node
    const isFinished = !!batch.production_batch_id;
    nodes.push({
      type: isFinished ? 'finished_product_batch' : 'raw_material_batch',
      id: `batch-${batch.id}`,
      label: batch.batch_code,
      sublabel: batch.stock_item?.name || 'Unknown',
      date: batch.use_by_date || batch.best_before_date,
      quantity: batch.quantity_received,
      unit,
      allergens: batch.allergens || [],
      status: batch.status,
    });
    totalOutput += batch.quantity_received || 0;

    // 5. Find dispatch records for this batch (who received it)
    const { data: dispatches } = await supabase
      .from('batch_dispatch_records')
      .select('*')
      .eq('stock_batch_id', batchId);

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
          from: `batch-${batch.id}`,
          to: custNodeId,
          label: 'Dispatched',
          quantity: d.quantity,
        });
      }
    }

    // 2. Find production batch if this is a finished product
    if (batch.production_batch_id) {
      const { data: pb } = await supabase
        .from('production_batches')
        .select('*, recipe:recipes(id, name)')
        .eq('id', batch.production_batch_id)
        .single();

      if (pb) {
        const pbNodeId = `production-${pb.id}`;
        nodes.push({
          type: 'production_batch',
          id: pbNodeId,
          label: pb.batch_code,
          sublabel: (pb as any).recipe?.name || 'Production',
          date: pb.production_date,
          status: pb.status,
        });

        links.push({
          from: pbNodeId,
          to: `batch-${batch.id}`,
          label: 'Output',
          quantity: batch.quantity_received,
        });

        // 3. Find production inputs → raw material batches (including rework)
        const { data: inputs } = await supabase
          .from('production_batch_inputs')
          .select('*, stock_batch:stock_batches(*, stock_item:stock_items(id, name, stock_unit))')
          .eq('production_batch_id', pb.id);

        if (inputs) {
          for (const input of inputs) {
            const sb = (input as any).stock_batch;
            if (!sb) continue;

            const sbNodeId = `batch-${sb.id}`;
            if (!nodes.find(n => n.id === sbNodeId)) {
              nodes.push({
                type: 'raw_material_batch',
                id: sbNodeId,
                label: sb.batch_code,
                sublabel: sb.stock_item?.name || 'Raw material',
                date: sb.use_by_date || sb.best_before_date,
                quantity: input.actual_quantity || input.planned_quantity || sb.quantity_received,
                unit: sb.unit || unit,
                allergens: sb.allergens || [],
                status: sb.status,
              });
              totalInput += input.actual_quantity || input.planned_quantity || 0;
            }

            links.push({
              from: sbNodeId,
              to: pbNodeId,
              label: (input as any).is_rework ? 'Rework Input' : 'Input',
              quantity: input.actual_quantity || input.planned_quantity,
            });

            // @salsa — Rework chain: if this input was rework, trace back to its source production batch
            if ((input as any).is_rework && sb.production_batch_id) {
              const { data: reworkPb } = await supabase
                .from('production_batches')
                .select('*, recipe:recipes(id, name)')
                .eq('id', sb.production_batch_id)
                .single();

              if (reworkPb) {
                const reworkPbNodeId = `production-${reworkPb.id}`;
                if (!nodes.find(n => n.id === reworkPbNodeId)) {
                  nodes.push({
                    type: 'production_batch',
                    id: reworkPbNodeId,
                    label: reworkPb.batch_code,
                    sublabel: (reworkPb as any).recipe?.name || 'Production (rework source)',
                    date: reworkPb.production_date,
                    status: reworkPb.status,
                  });
                }
                if (!links.find(l => l.from === reworkPbNodeId && l.to === sbNodeId)) {
                  links.push({
                    from: reworkPbNodeId,
                    to: sbNodeId,
                    label: 'Rework Output',
                    quantity: sb.quantity_received,
                  });
                }
              }
            }

            // 4. Find supplier for each raw material batch
            if (sb.delivery_line_id) {
              const { data: deliveryLine } = await supabase
                .from('delivery_lines')
                .select('id, delivery:deliveries(id, supplier_id, delivery_date, suppliers(id, name, approval_status))')
                .eq('id', sb.delivery_line_id)
                .single();

              const delivery = (deliveryLine as any)?.delivery;
              const supplier = delivery?.suppliers;

              if (supplier) {
                const supplierNodeId = `supplier-${supplier.id}`;
                if (!nodes.find(n => n.id === supplierNodeId)) {
                  nodes.push({
                    type: 'supplier',
                    id: supplierNodeId,
                    label: supplier.name,
                    sublabel: supplier.approval_status ? `Status: ${supplier.approval_status}` : undefined,
                    status: supplier.approval_status,
                  });
                }

                if (!links.find(l => l.from === supplierNodeId && l.to === sbNodeId)) {
                  links.push({
                    from: supplierNodeId,
                    to: sbNodeId,
                    label: 'Supplied',
                  });
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
        direction: 'backward',
        mass_balance: totalInput > 0 ? {
          total_input: totalInput,
          total_output: totalOutput,
          variance,
          variance_percent: Math.round(variancePercent * 100) / 100,
          unit,
        } : undefined,
      },
    });
  } catch (error: any) {
    console.error('Backward trace error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
