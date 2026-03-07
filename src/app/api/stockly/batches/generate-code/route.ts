// @salsa - SALSA Compliance: Batch code generation API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateBatchCode, isBatchCodeUnique } from '@/lib/stockly/batch-codes';

/**
 * POST /api/stockly/batches/generate-code
 * Generate the next batch code for a company using configured format.
 * Body: { company_id, format?, site_name? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { company_id, format, site_name } = body;

    if (!company_id) {
      return NextResponse.json(
        { error: 'Missing required field: company_id' },
        { status: 400 }
      );
    }

    // @salsa — Generate code
    const batchCode = await generateBatchCode(supabase, company_id, {
      format,
      siteName: site_name,
    });

    // Verify uniqueness
    const isUnique = await isBatchCodeUnique(supabase, company_id, batchCode);

    return NextResponse.json({
      success: true,
      data: {
        batch_code: batchCode,
        is_unique: isUnique,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to generate batch code' },
      { status: 500 }
    );
  }
}
