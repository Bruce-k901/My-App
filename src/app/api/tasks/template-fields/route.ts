import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/tasks/template-fields?templateId=xxx
 * Returns template_fields for a given template using the service role key.
 * This bypasses RLS to ensure custom fields are always accessible.
 */
export async function GET(request: NextRequest) {
  const templateId = request.nextUrl.searchParams.get('templateId');

  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: fields, error } = await supabase
      .from('template_fields')
      .select('*')
      .eq('template_id', templateId)
      .order('field_order');

    if (error) {
      console.error('[template-fields API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ fields: fields || [] });
  } catch (err: any) {
    console.error('[template-fields API] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
