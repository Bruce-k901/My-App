import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getLablitConfig } from '@/lib/lablit/tokens';
import { LablitClient } from '@/lib/lablit/client';
import { LablitApiError } from '@/lib/lablit/errors';
import {
  mapProductionOutputToLabel,
  mapStockBatchToLabel,
  labelPayloadToLablitProduct,
} from '@/lib/lablit/mapping';
import type { ProductionBatch, ProductionBatchOutput, StockBatch } from '@/lib/types/stockly';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, batchId, outputId, type, copies = 1 } = body as {
      companyId: string;
      batchId: string;
      outputId?: string;
      type: 'production_output' | 'stock_batch';
      copies?: number;
    };
    const labelCopies = Math.max(1, Math.min(copies, 50)); // clamp 1–50

    if (!companyId || !batchId || !type) {
      return NextResponse.json(
        { error: 'companyId, batchId, and type are required' },
        { status: 400 },
      );
    }

    // Get Labl.it config
    const config = await getLablitConfig(companyId);
    if (!config) {
      return NextResponse.json({ error: 'Labl.it not configured' }, { status: 404 });
    }

    // Fetch company/site names for label
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    let labelPayload;

    if (type === 'production_output') {
      // Fetch the production batch with outputs
      const { data: batch, error: batchError } = await supabase
        .from('production_batches')
        .select(`
          *,
          recipe:recipes(id, name, allergens, may_contain_allergens)
        `)
        .eq('id', batchId)
        .single();

      if (batchError || !batch) {
        return NextResponse.json({ error: 'Production batch not found' }, { status: 404 });
      }

      // Fetch the specific output (or all outputs)
      const outputQuery = supabase
        .from('production_batch_outputs')
        .select('*, stock_item:stock_items(id, name)')
        .eq('production_batch_id', batchId);

      if (outputId) {
        outputQuery.eq('id', outputId);
      }

      const { data: outputs, error: outputError } = await outputQuery;
      if (outputError || !outputs?.length) {
        return NextResponse.json({ error: 'No outputs found' }, { status: 404 });
      }

      // Map each output to a label payload
      const payloads = outputs.map((output: ProductionBatchOutput) =>
        mapProductionOutputToLabel(
          output,
          batch as ProductionBatch,
          company?.name,
        ),
      );

      // Convert to Labl.it products, expanding for copies
      const singleProducts = payloads.map(labelPayloadToLablitProduct);
      const products = labelCopies === 1
        ? singleProducts
        : singleProducts.flatMap(p => Array.from({ length: labelCopies }, () => p));

      // Try to push to Labl.it API
      const client = new LablitClient(config.apiKey, config.deviceId, config.baseUrl);
      try {
        const result = await client.pushProducts(products);
        return NextResponse.json({ success: true, copies: labelCopies, result });
      } catch (err) {
        if (err instanceof LablitApiError && err.category === 'NOT_IMPLEMENTED') {
          // Return the mapped data as a dry-run preview
          return NextResponse.json({
            success: true,
            placeholder: true,
            copies: labelCopies,
            message: 'Label data mapped successfully. Labl.it API push will activate once API access is confirmed.',
            labels: payloads,
            products: singleProducts,
          });
        }
        throw err;
      }
    } else {
      // Stock batch label
      const { data: stockBatch, error: sbError } = await supabase
        .from('stock_batches')
        .select('*, stock_item:stock_items(id, name)')
        .eq('id', batchId)
        .single();

      if (sbError || !stockBatch) {
        return NextResponse.json({ error: 'Stock batch not found' }, { status: 404 });
      }

      labelPayload = mapStockBatchToLabel(
        stockBatch as StockBatch,
        company?.name,
      );

      const product = labelPayloadToLablitProduct(labelPayload);
      const products = Array.from({ length: labelCopies }, () => product);

      const client = new LablitClient(config.apiKey, config.deviceId, config.baseUrl);
      try {
        const result = labelCopies === 1
          ? await client.pushProduct(product)
          : await client.pushProducts(products);
        return NextResponse.json({ success: true, copies: labelCopies, result });
      } catch (err) {
        if (err instanceof LablitApiError && err.category === 'NOT_IMPLEMENTED') {
          return NextResponse.json({
            success: true,
            placeholder: true,
            copies: labelCopies,
            message: 'Label data mapped successfully. Labl.it API push will activate once API access is confirmed.',
            label: labelPayload,
            product,
          });
        }
        throw err;
      }
    }
  } catch (err: unknown) {
    console.error('[lablit/push-label] Error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to push label';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
