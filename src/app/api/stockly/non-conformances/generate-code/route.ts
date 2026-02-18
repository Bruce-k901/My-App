// @salsa - SALSA Compliance: Auto-generate next NC code
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/non-conformances/generate-code
 * Generate the next NC code for a company: NC-{YYYY}-{SEQ}
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id is required' },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();

    // @salsa — Find the highest existing NC code for this company/year
    const { data: existingNCs, error } = await supabase
      .from('non_conformances')
      .select('nc_code')
      .eq('company_id', companyId)
      .like('nc_code', `NC-${currentYear}-%`)
      .order('nc_code', { ascending: false })
      .limit(1);

    if (error && error.code !== '42P01') {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let nextSeq = 1;
    if (existingNCs && existingNCs.length > 0) {
      const lastCode = existingNCs[0].nc_code;
      const lastSeq = parseInt(lastCode.split('-')[2], 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    const ncCode = `NC-${currentYear}-${String(nextSeq).padStart(3, '0')}`;

    return NextResponse.json({ success: true, data: { nc_code: ncCode } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
