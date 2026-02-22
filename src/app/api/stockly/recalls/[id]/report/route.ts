// @salsa - SALSA Compliance: Recall report data API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/recalls/[id]/report
 * Generate comprehensive recall report data for PDF/print
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: recallId } = await params;

    // 1. Get recall details
    const { data: recall, error } = await supabase
      .from('recalls')
      .select('*')
      .eq('id', recallId)
      .single();

    if (error || !recall) {
      return NextResponse.json({ success: false, error: 'Recall not found' }, { status: 404 });
    }

    // 2. Get affected batches with stock batch + stock item details
    const { data: affectedBatches } = await supabase
      .from('recall_affected_batches')
      .select('*, stock_batch:stock_batches(id, batch_code, quantity_received, quantity_remaining, unit, status, allergens, stock_item:stock_items(id, name))')
      .eq('recall_id', recallId)
      .order('added_at', { ascending: true });

    // 3. Get notifications
    const { data: notifications } = await supabase
      .from('recall_notifications')
      .select('*')
      .eq('recall_id', recallId)
      .order('created_at', { ascending: true });

    // 4. Compute allergen summary (union of all allergens from affected batches)
    const allergenSet = new Set<string>();
    if (affectedBatches) {
      for (const ab of affectedBatches) {
        const sb = (ab as any).stock_batch;
        if (sb?.allergens) {
          for (const a of sb.allergens) allergenSet.add(a);
        }
      }
    }

    // 5. Compute mass balance
    let totalProduced = 0;
    let totalRecovered = 0;
    if (affectedBatches) {
      for (const ab of affectedBatches) {
        totalProduced += ab.quantity_affected || (ab as any).stock_batch?.quantity_received || 0;
        totalRecovered += ab.quantity_recovered || 0;
      }
    }

    // 6. Get company info
    const { data: companyData } = await supabase
      .from('companies')
      .select('name')
      .eq('id', recall.company_id)
      .single();

    // 7. Build timeline
    const timeline: { label: string; date: string | null }[] = [
      { label: 'Initiated', date: recall.initiated_at },
      { label: 'FSA Notified', date: recall.fsa_notified_at },
      { label: 'SALSA Notified', date: recall.salsa_notified_at },
      { label: 'Resolved', date: recall.resolved_at },
      { label: 'Closed', date: recall.closed_at },
    ].filter(t => t.date);

    return NextResponse.json({
      success: true,
      data: {
        recall,
        company_name: companyData?.name || 'Unknown',
        affected_batches: affectedBatches || [],
        notifications: notifications || [],
        allergen_summary: Array.from(allergenSet),
        mass_balance: {
          total_produced: totalProduced,
          total_recovered: totalRecovered,
          unaccounted: totalProduced - totalRecovered,
        },
        timeline,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
