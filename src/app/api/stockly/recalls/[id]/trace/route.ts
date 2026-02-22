// @salsa - SALSA Compliance: Recall traceability API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/recalls/[id]/trace
 * Run traceability from recall's affected batches to identify all affected customers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: recallId } = await params;

    // 1. Get all affected batches
    const { data: affectedBatches, error } = await supabase
      .from('recall_affected_batches')
      .select('*, stock_batch:stock_batches(id, batch_code, production_batch_id, stock_item:stock_items(id, name))')
      .eq('recall_id', recallId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!affectedBatches || affectedBatches.length === 0) {
      return NextResponse.json({ success: true, data: { customers: [], batches_traced: 0 } });
    }

    // 2. For each affected batch, trace forward to find customers
    const customerMap = new Map<string, {
      customer_id: string | null;
      customer_name: string;
      batches: { batch_code: string; quantity: number; dispatch_date: string; unit: string | null }[];
    }>();

    for (const ab of affectedBatches) {
      const sb = (ab as any).stock_batch;
      if (!sb) continue;

      // Direct dispatches for this batch
      const { data: directDispatches } = await supabase
        .from('batch_dispatch_records')
        .select('*')
        .eq('stock_batch_id', sb.id);

      if (directDispatches) {
        for (const d of directDispatches) {
          const key = d.customer_id || d.customer_name;
          const existing = customerMap.get(key);
          const batchInfo = { batch_code: sb.batch_code, quantity: d.quantity, dispatch_date: d.dispatch_date, unit: d.unit };
          if (existing) {
            existing.batches.push(batchInfo);
          } else {
            customerMap.set(key, { customer_id: d.customer_id, customer_name: d.customer_name, batches: [batchInfo] });
          }
        }
      }

      // If this is a raw material, trace through production to finished goods
      const { data: inputs } = await supabase
        .from('production_batch_inputs')
        .select('production_batch_id')
        .eq('stock_batch_id', sb.id);

      if (inputs) {
        for (const input of inputs) {
          // Find output batches from this production
          const { data: outputBatches } = await supabase
            .from('stock_batches')
            .select('id, batch_code')
            .eq('production_batch_id', input.production_batch_id);

          if (outputBatches) {
            for (const ob of outputBatches) {
              const { data: obDispatches } = await supabase
                .from('batch_dispatch_records')
                .select('*')
                .eq('stock_batch_id', ob.id);

              if (obDispatches) {
                for (const d of obDispatches) {
                  const key = d.customer_id || d.customer_name;
                  const existing = customerMap.get(key);
                  const batchInfo = { batch_code: ob.batch_code, quantity: d.quantity, dispatch_date: d.dispatch_date, unit: d.unit };
                  if (existing) {
                    existing.batches.push(batchInfo);
                  } else {
                    customerMap.set(key, { customer_id: d.customer_id, customer_name: d.customer_name, batches: [batchInfo] });
                  }
                }
              }
            }
          }
        }
      }
    }

    const customers = Array.from(customerMap.values()).map(c => ({
      ...c,
      total_quantity: c.batches.reduce((sum, b) => sum + b.quantity, 0),
    }));

    return NextResponse.json({
      success: true,
      data: {
        customers,
        batches_traced: affectedBatches.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
